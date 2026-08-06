"""Router de GlyphAI: chat con streaming SSE.

Endpoints:
- POST /api/v1/ai/chat — chat con streaming (eventos `data: {"delta": ...}`
  hasta `data: [DONE]`).

Errores:
- 422: mensaje vacío o historial inválido (validación Pydantic).
- 503: proveedor de IA no configurado (falta API key).
- 502: fallo al conectar con la API externa del proveedor.
- Fallos a mitad del stream: evento SSE `data: {"error": "..."}` (el status
  HTTP ya se envió con 200 al empezar el streaming).
"""

import json
import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.ai_prompts import build_system_prompt
from app.core.dependencies import get_ai_repository
from app.core.security import get_current_user
from app.models.user import User
from app.repositories.ai_repository import AIRepository
from app.schemas.ai import ChatRequest
from app.services.ai_service import (
    AIService,
    AIServiceNotConfiguredError,
    AIProviderError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


def get_ai_service(
    ai_repository: AIRepository = Depends(get_ai_repository),
) -> AIService:
    """Dependency para obtener el servicio de IA de GlyphAI."""
    return AIService(ai_repository=ai_repository)


@router.post("/chat")
async def chat(
    request: ChatRequest,
    auth: User = Depends(get_current_user),
    service: AIService = Depends(get_ai_service),
) -> StreamingResponse:
    """
    Envía un mensaje a GlyphAI y recibe la respuesta en streaming (SSE).

    Formato de eventos:
    ```
    data: {"delta": "texto"}\n\n
    ...
    data: [DONE]\n\n
    ```
    """
    if not service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not configured",
        )

    # Contexto RAG: la colección del usuario se inyecta en el system prompt
    # para que GlyphAI responda con conocimiento personalizado (issue #44).
    collection_context = await service.build_collection_context(auth.id)
    system_prompt = build_system_prompt(collection_context)

    # Establecer la conexión con el proveedor ANTES de empezar el stream SSE:
    # así los fallos de conexión (auth, timeout, rate limit) se devuelven como
    # 502 real y no como un evento de error a mitad del stream.
    try:
        stream = await service.create_stream(request.messages, system=system_prompt)
    except AIServiceNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e
    except AIProviderError as e:
        logger.error(f"Error del proveedor de IA: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error del proveedor de IA: {e}",
        ) from e

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for delta in stream:
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except AIProviderError as e:
            # Error externo a mitad del stream: el status 200 ya se envió,
            # así que el error viaja como evento SSE.
            logger.error(f"Error del proveedor de IA durante el stream: {e}")
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Error inesperado durante el streaming de GlyphAI: {e}")
            yield (
                "data: "
                + json.dumps(
                    {"error": "Error interno durante el streaming"}, ensure_ascii=False
                )
                + "\n\n"
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Desactiva buffering de nginx en producción
        },
    )
