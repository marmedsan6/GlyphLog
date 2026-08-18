"""Router de GlyphAI: chat con streaming SSE y conversaciones persistentes.

Endpoints:
- POST /api/v1/ai/chat — chat con streaming (eventos `data: {"delta": ...}`
  hasta `data: [DONE]`). Si `conversation_id` se omite, crea una conversación
  nueva; los mensajes se persisten siempre.
- GET /api/v1/ai/conversations — lista paginada (updated_at DESC).
- GET /api/v1/ai/conversations/{id} — detalle con todos sus mensajes.
- DELETE /api/v1/ai/conversations/{id} — elimina la conversación propia.

Errores:
- 422: mensaje vacío o historial inválido (validación Pydantic).
- 404: conversación inexistente o de otro usuario.
- 503: proveedor de IA no configurado (falta API key o credenciales).
- 502: fallo al conectar con la API externa del proveedor.
- Fallos a mitad del stream: evento SSE `data: {"error": "..."}` (el status
  HTTP ya se envió con 200 al empezar el streaming).
"""

import json
import logging
from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.core.dependencies import (
    get_agent_service,
    get_conversation_service,
    get_entry_repository,
    get_external_search_service,
    get_llm_client,
)
from app.core.llm_errors import map_llm_error
from app.core.security import get_current_user
from app.integrations.llm import JsonLlm
from app.models.user import User
from app.repositories.entry_repository import EntryRepository
from app.routers.youtube_discovery import get_youtube_discovery_service
from app.schemas.ai import (
    ChatMessage,
    ChatRequest,
    ConversationListItem,
    ConversationResponse,
    PaginatedConversationsResponse,
)
from app.schemas.recommendation import (
    GenerateChatRecommendationsRequest,
    GenerateChatRecommendationsResponse,
)
from app.schemas.youtube_discovery import (
    GenerateChatYoutubeRequest,
    GenerateChatYoutubeResponse,
)
from app.services.agent_service import AgentService
from app.services.conversation_service import ConversationService
from app.services.external_search_service import ExternalSearchService
from app.services.recommendation_service import (
    InsufficientCollectionError,
    RecommendationService,
)
from app.services.youtube_discovery_service import YoutubeDiscoveryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

# Paginación por defecto del listado de conversaciones (mismo límite que entries).
DEFAULT_PAGE_SIZE = 15

# Número fijo de recomendaciones en el chat (RF-3).
CHAT_RECOMMENDATIONS_LIMIT = 5


def get_chat_recommendation_service(
    llm_client: JsonLlm = Depends(get_llm_client),
    entry_repo: EntryRepository = Depends(get_entry_repository),
    external_search: ExternalSearchService = Depends(get_external_search_service),
) -> RecommendationService:
    """Dependency para el servicio de recomendaciones (reutiliza el wiring)."""
    return RecommendationService(llm_client, entry_repo, external_search)


@router.post("/chat")
async def chat(
    request: ChatRequest,
    auth: User = Depends(get_current_user),
    agent: AgentService = Depends(get_agent_service),
    conversation_service: ConversationService = Depends(get_conversation_service),
) -> StreamingResponse:
    """
    Envía un mensaje a GlyphAI y recibe la respuesta en streaming (SSE).

    Formato de eventos:
    ```
    data: {"conversation_id": "..."}\n\n
    data: {"delta": "texto"}\n\n
    ...
    data: [DONE]\n\n
    ```

    El mensaje del usuario y la respuesta (completa o parcial si hay error)
    se persisten en la conversación indicada, o en una nueva si no se indica.
    """
    # 1. Resolver la conversación: la indicada (404 si no es del usuario) o
    #    una nueva con título generado del primer mensaje.
    if request.conversation_id is not None:
        conversation = await conversation_service.get_for_user(
            request.conversation_id, auth.id
        )
        if conversation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversación no encontrada",
            )
    else:
        conversation = await conversation_service.create_for_chat(auth.id, request.messages)
    # Solo se persiste el mensaje nuevo (el historial previo ya está en BD).
    await conversation_service.add_message(
        conversation.id, "user", request.messages[-1].content
    )

    # 2. Contexto RAG: la colección del usuario se inyecta en el system prompt
    #    para que GlyphAI responda con conocimiento personalizado (issue #44).
    system_prompt = await agent.build_system_prompt(auth.id)

    async def event_generator() -> AsyncGenerator[str, None]:
        # La respuesta se acumula para persistirla; si el stream falla a
        # mitad, se guarda igualmente el contenido parcial recibido.
        collected: list[str] = []
        try:
            # Evento inicial: el id de la conversación (nueva o reanudada)
            # permite al frontend actualizar su estado sin una llamada extra.
            yield (
                "data: "
                + json.dumps({"conversation_id": str(conversation.id)}, ensure_ascii=False)
                + "\n\n"
            )
            messages = [m.model_dump() for m in request.messages]
            async for event in agent.astream(
                messages=messages,
                user_id=auth.id,
                system_prompt=system_prompt,
            ):
                if event.type == "delta":
                    collected.append(event.content)
                    yield f"data: {json.dumps({'delta': event.content}, ensure_ascii=False)}\n\n"
                elif event.type == "tool":
                    yield f"data: {json.dumps({'tool': event.content}, ensure_ascii=False)}\n\n"
                elif event.type == "done":
                    yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Error inesperado durante el streaming de GlyphAI: {e}")
            yield (
                "data: "
                + json.dumps(
                    {"error": "Error interno durante el streaming"}, ensure_ascii=False
                )
                + "\n\n"
            )
        finally:
            if collected:
                await conversation_service.add_message(
                    conversation.id, "assistant", "".join(collected)
                )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Desactiva buffering de nginx en producción
        },
    )


@router.get("/conversations", response_model=PaginatedConversationsResponse)
async def list_conversations(
    auth: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=50),
) -> PaginatedConversationsResponse:
    """Lista las conversaciones del usuario, ordenadas por `updated_at DESC`.

    Excluye conversaciones huérfanas (sin mensajes).
    """
    conversations, total = await conversation_service.list_by_user(auth.id, page, limit)
    total_pages = (total + limit - 1) // limit if total else 0
    return PaginatedConversationsResponse(
        conversations=[ConversationListItem.model_validate(c) for c in conversations],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    auth: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
) -> ConversationResponse:
    """Detalle de una conversación propia con todos sus mensajes."""
    conversation = await conversation_service.get_for_user(conversation_id, auth.id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada",
        )
    return ConversationResponse.model_validate(conversation)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    auth: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
) -> None:
    """Elimina una conversación propia (cascada a sus mensajes)."""
    deleted = await conversation_service.delete(conversation_id, auth.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada",
        )


@router.post(
    "/recommendations",
    response_model=GenerateChatRecommendationsResponse,
)
async def generate_chat_recommendations(
    request: GenerateChatRecommendationsRequest,
    auth: User = Depends(get_current_user),
    recommendation_service: RecommendationService = Depends(
        get_chat_recommendation_service
    ),
    conversation_service: ConversationService = Depends(get_conversation_service),
) -> GenerateChatRecommendationsResponse:
    """Genera recomendaciones y las persiste en la conversación del chat.

    Delega en el servicio de recomendaciones (misma lógica que
    `/recommendations/generate`) y persiste un único mensaje `assistant` con:
    - `content`: resumen textual legible (para que el agente pueda refinar).
    - `metadata`: `{ "recommendations": [...] }` (para render de tarjetas).

    `conversation_id` se omite → se crea una conversación nueva.
    """
    # 1. Resolver/crear la conversación (misma semántica que POST /chat).
    if request.conversation_id is not None:
        conversation = await conversation_service.get_for_user(
            request.conversation_id, auth.id
        )
        if conversation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversación no encontrada",
            )
    else:
        trigger_message = f"Recomiéndame {request.type.value}"
        conversation = await conversation_service.create_for_chat(
            auth.id,
            [ChatMessage(role="user", content=trigger_message)],
        )
        # Persiste el turno del usuario que dispara la generación.
        await conversation_service.add_message(
            conversation.id, "user", trigger_message
        )

    # 2. Genera la lista (modo strict: 422 si no hay suficientes entradas).
    try:
        result = await recommendation_service.generate_recommendations(
            user_id=auth.id,
            entry_type=request.type,
            limit=CHAT_RECOMMENDATIONS_LIMIT,
            strict=True,
        )
    except InsufficientCollectionError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        raise _map_recommendation_error(e)

    # 3. Persiste el mensaje del asistente con texto + payload estructurado.
    content = RecommendationService.format_recommendations_as_text(
        result.recommendations, request.type
    )
    metadata = {
        "recommendations": [rec.model_dump(mode="json") for rec in result.recommendations]
    }
    await conversation_service.add_message(
        conversation.id, "assistant", content, metadata
    )

    return GenerateChatRecommendationsResponse(
        conversation_id=conversation.id,
        recommendations=result.recommendations,
        metadata=result.metadata,
    )


def _map_recommendation_error(error: Exception) -> HTTPException:
    """Traduce errores del proveedor LLM a HTTPException accionable."""
    mapped = map_llm_error(error)
    if mapped is not None:
        return mapped
    if isinstance(error, ValueError):
        logger.error(f"El proveedor LLM devolvió formato inesperado: {error}")
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "El proveedor de IA devolvió una respuesta inesperada. "
                "Inténtalo de nuevo."
            ),
        )
    logger.error(f"Error interno al generar recomendaciones en el chat: {error}")
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Error interno al generar recomendaciones",
    )


@router.post(
    "/youtube",
    response_model=GenerateChatYoutubeResponse,
)
async def generate_chat_youtube(
    request: GenerateChatYoutubeRequest,
    auth: User = Depends(get_current_user),
    youtube_service: YoutubeDiscoveryService = Depends(get_youtube_discovery_service),
    conversation_service: ConversationService = Depends(get_conversation_service),
) -> GenerateChatYoutubeResponse:
    """Analiza canales de YouTube y persiste las sugerencias en el chat.

    Delega en el servicio de descubrimiento de YouTube (misma lógica que
    `/discover/youtube/analyze`) y persiste un único mensaje `assistant` con:
    - `content`: resumen textual legible (para que el agente pueda refinar).
    - `metadata`: `{ "suggestions": [...] }` (para render de tarjetas).

    `conversation_id` se omite → se crea una conversación nueva.
    """
    # 1. Resolver/crear la conversación (misma semántica que POST /chat).
    trigger_message = "Descubre contenido de estos canales:\n" + "\n".join(
        request.channel_urls
    )
    if request.conversation_id is not None:
        conversation = await conversation_service.get_for_user(
            request.conversation_id, auth.id
        )
        if conversation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversación no encontrada",
            )
    else:
        conversation = await conversation_service.create_for_chat(
            auth.id,
            [ChatMessage(role="user", content=trigger_message)],
        )

    # Persiste el turno del usuario que dispara el análisis.
    await conversation_service.add_message(
        conversation.id, "user", trigger_message
    )

    # 2. Analiza los canales (puede tardar 60–90s).
    try:
        suggestions, metadata = await youtube_service.analyze_channels(
            user_id=auth.id,
            channel_urls=request.channel_urls,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error al analizar canales de YouTube en el chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al analizar canales de YouTube. Verifica que las URLs sean válidas.",
        )

    # 3. Persiste el mensaje del asistente con texto + payload estructurado.
    content = YoutubeDiscoveryService.format_suggestions_as_text(suggestions)
    message_metadata = {
        "suggestions": [suggestion.model_dump(mode="json") for suggestion in suggestions]
    }
    await conversation_service.add_message(
        conversation.id, "assistant", content, message_metadata
    )

    return GenerateChatYoutubeResponse(
        conversation_id=conversation.id,
        suggestions=suggestions,
        metadata=metadata,
    )
