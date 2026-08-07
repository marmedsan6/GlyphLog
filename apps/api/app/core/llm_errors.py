"""Mapper de errores de LLM (Bedrock y OpenAI) a HTTPExceptions accionables.

Compartido por los routers que invocan un LLM para generar JSON estructurado
(recomendaciones, importacion). Sin este mapeo, el usuario solo ve un 500
generico y no puede distinguir "proveedor saturado" (retry) de "credenciales
mal configuradas".
"""

import logging

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Errores de AWS que significan "saturado / no disponible temporalmente" -> 503 retryable
_BEDROCK_TRANSIENT_CODES = {
    "ThrottlingException",
    "ProvisionedThroughputExceededException",
    "ServiceUnavailable",
    "TooManyRequestsException",
    "SlowDown",
}

# Errores de AWS que significan "configuracion/credenciales" -> 503 con diagnostico
_BEDROCK_CONFIG_CODES = {
    "AccessDeniedException",
    "UnrecognizedClientException",
    "ExpiredTokenException",
    "ValidationException",
    "ResourceNotFoundException",
    "InsufficientPermissions",
    "NoCredential",
}


def _map_bedrock_error(error: ClientError | BotoCoreError) -> HTTPException | None:
    """Traduce errores de Bedrock/AWS a HTTPException, o None si no aplica."""
    if isinstance(error, ClientError):
        code = error.response.get("Error", {}).get("Code", "Unknown")
        message = error.response.get("Error", {}).get("Message", "")
        logger.error(f"Bedrock ClientError ({code}): {message}")
        if code in _BEDROCK_TRANSIENT_CODES:
            return HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "El proveedor de IA (AWS Bedrock) esta saturado o no disponible. "
                    "Intentalo de nuevo en unos segundos."
                ),
            )
        if code in _BEDROCK_CONFIG_CODES:
            return HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    f"El proveedor de IA (AWS Bedrock) no esta bien configurado ({code}). "
                    "Revisa las credenciales AWS y que el modelo tenga acceso habilitado."
                ),
            )
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"El proveedor de IA (AWS Bedrock) fallo con el error {code}.",
        )

    if isinstance(error, BotoCoreError):
        logger.error(f"Bedrock BotoCoreError: {error}")
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "No se pudo contactar con el proveedor de IA (AWS Bedrock). "
                "Revisa las credenciales AWS en el servidor."
            ),
        )

    return None


def _map_openai_error(error: Exception) -> HTTPException | None:
    """Traduce errores del SDK de OpenAI a HTTPException, o None si no aplica."""
    try:
        from openai import (
            APIConnectionError,
            APIStatusError,
            AuthenticationError,
            OpenAIError,
            RateLimitError,
        )
    except ImportError:
        return None

    if isinstance(error, RateLimitError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "El proveedor de IA (OpenAI) esta saturado. Intentalo de nuevo en unos segundos."
            ),
        )
    if isinstance(error, AuthenticationError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "El proveedor de IA (OpenAI) rechaza la API key. "
                "Revisa OPENAI_API_KEY en el .env."
            ),
        )
    if isinstance(error, APIConnectionError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "No se pudo contactar con el proveedor de IA (OpenAI). "
                "Revisa OPENAI_BASE_URL y la conexion."
            ),
        )
    if isinstance(error, APIStatusError):
        logger.error(f"OpenAI APIStatusError {error.status_code}: {error.message}")
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"El proveedor de IA (OpenAI) respondio con error {error.status_code}.",
        )
    if isinstance(error, OpenAIError):
        logger.error(f"OpenAI error: {error}")
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error del proveedor de IA (OpenAI): {error}",
        )

    return None


def map_llm_error(error: Exception) -> HTTPException | None:
    """Traduce un error de proveedor LLM a HTTPException, o None si no es de LLM."""
    mapped = _map_bedrock_error(error) or _map_openai_error(error)
    if mapped is not None:
        return mapped
    return None