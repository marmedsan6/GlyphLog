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
)
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.ai import (
    ChatRequest,
    ConversationListItem,
    ConversationResponse,
    PaginatedConversationsResponse,
)
from app.services.agent_service import AgentService
from app.services.conversation_service import ConversationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

# Paginación por defecto del listado de conversaciones (mismo límite que entries).
DEFAULT_PAGE_SIZE = 15


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
