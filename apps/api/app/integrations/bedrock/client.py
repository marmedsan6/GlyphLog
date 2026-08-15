"""
Cliente centralizado para AWS Bedrock (Claude).

Wrapper para llamadas a Bedrock con retry, logging y validación de output.
Configurado para usar Claude Haiku 4.5 en us-east-1.
"""

import json
import logging
from collections.abc import Iterator
from typing import Any, cast

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class BedrockClient:
    """Cliente para interactuar con AWS Bedrock (Claude Haiku 4.5)."""

    def __init__(
        self,
        model_id: str = "us.anthropic.claude-haiku-4-5-20251001-v1:0",
        region: str = "us-east-1",
        max_tokens: int = 4096,
        aws_access_key_id: str | None = None,
        aws_secret_access_key: str | None = None,
    ):
        """
        Inicializa el cliente de Bedrock.

        Args:
            model_id: ID del modelo de Claude en Bedrock (inference profile)
            region: Región de AWS
            max_tokens: Máximo de tokens en la respuesta
            aws_access_key_id: Access key de AWS (opcional; si se omite, boto3
                resuelve las credenciales del entorno/perfil por defecto).
            aws_secret_access_key: Secret access key de AWS (opcional).
        """
        self.model_id = model_id
        self.region = region
        self.max_tokens = max_tokens

        try:
            # Timeouts explícitos: Bedrock puede colgarse sin credenciales o en
            # regiones sin acceso al modelo. Sin esto, el endpoint tarda hasta
            # 60s+ y el frontend parece "muerto". Retries estándar de AWS.
            client_kwargs: dict[str, Any] = {
                "service_name": "bedrock-runtime",
                "region_name": region,
                "config": BotoConfig(
                    connect_timeout=10,
                    read_timeout=120,
                    retries={"max_attempts": 2, "mode": "standard"},
                ),
            }
            # Credenciales explícitas (p. ej. desde settings). Si no se pasan,
            # boto3 cae en la cadena por defecto (env vars, ~/.aws/credentials).
            if aws_access_key_id and aws_secret_access_key:
                client_kwargs["aws_access_key_id"] = aws_access_key_id
                client_kwargs["aws_secret_access_key"] = aws_secret_access_key
            self.client = boto3.client(**client_kwargs)
            logger.info(f"BedrockClient inicializado: {model_id} en {region}")
        except Exception as e:
            logger.error(f"Error al inicializar Bedrock client: {e}")
            raise

    def _build_request_body(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        system: str | None = None,
    ) -> dict[str, Any]:
        """Construye el body de la petición Anthropic Messages API."""
        request_body: dict[str, Any] = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": self.max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system:
            request_body["system"] = system
        return request_body

    @staticmethod
    def _extract_text(response_body: dict[str, Any]) -> str:
        """Extrae el texto de una respuesta Anthropic Messages API (no streaming)."""
        if "content" in response_body and response_body["content"]:
            text: Any = response_body["content"][0]["text"]
            return str(text)
        raise ValueError("Respuesta de Bedrock sin contenido")

    def invoke(
        self,
        prompt: str,
        temperature: float = 0.7,
        system: str | None = None,
    ) -> str:
        """
        Invoca el modelo de Claude con un prompt y devuelve la respuesta.

        Args:
            prompt: Prompt del usuario
            temperature: Temperatura de generación (0.0-1.0)
            system: Prompt de sistema opcional

        Returns:
            Respuesta de Claude como texto

        Raises:
            ClientError: Si falla la llamada a Bedrock
            ValueError: Si la respuesta no es válida
        """
        messages = [{"role": "user", "content": prompt}]
        request_body = self._build_request_body(messages, temperature, system)

        try:
            logger.debug(f"Invocando Bedrock: {len(prompt)} chars, temp={temperature}")

            response = self.client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body),
            )

            response_body = json.loads(response["body"].read())
            text = self._extract_text(response_body)
            logger.debug(f"Respuesta recibida: {len(text)} chars")
            return text

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            error_message = e.response["Error"]["Message"]
            logger.error(f"Error de Bedrock ({error_code}): {error_message}")
            raise
        except Exception as e:
            logger.error(f"Error inesperado al invocar Bedrock: {e}")
            raise

    def open_chat_stream(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        system: str | None = None,
    ) -> Iterator[str]:
        """Abre un stream de chat con Claude y devuelve un iterador de texto.

        Usa `invoke_model_with_response_stream` (síncrono). El iterador devuelto
        emite fragmentos de texto a medida que llegan. Es responsabilidad del
        consumidor envolverlo en un AsyncIterator (el chat de GlyphAI lo hace
        para poder emitir eventos SSE sin bloquear el event loop).

        Raises:
            ClientError: Si falla la llamada a Bedrock.
        """
        request_body = self._build_request_body(messages, temperature, system)

        try:
            response = self.client.invoke_model_with_response_stream(
                modelId=self.model_id,
                body=json.dumps(request_body),
            )

            def _iter() -> Iterator[str]:
                event_stream = response["body"]
                for event in event_stream:
                    chunk = json.loads(event["chunk"]["bytes"])
                    if chunk.get("type") != "content_block_delta":
                        continue
                    delta = chunk.get("delta", {})
                    text = delta.get("text")
                    if text:
                        yield text

            return _iter()

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            error_message = e.response["Error"]["Message"]
            logger.error(f"Error de Bedrock streaming ({error_code}): {error_message}")
            raise
        except Exception as e:
            logger.error(f"Error inesperado al abrir stream de Bedrock: {e}")
            raise

    def invoke_json(
        self,
        prompt: str,
        temperature: float = 0.7,
        system: str | None = None,
    ) -> dict[str, Any] | list[Any]:
        """
        Invoca el modelo y parsea la respuesta como JSON.

        Args:
            prompt: Prompt del usuario
            temperature: Temperatura de generación
            system: Prompt de sistema opcional

        Returns:
            Respuesta parseada como dict o list

        Raises:
            ValueError: Si la respuesta no es JSON válido
        """
        response_text = self.invoke(prompt, temperature, system)

        # Intentar extraer JSON si viene envuelto en markdown
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()

        try:
            parsed: Any = json.loads(response_text)
            return cast(dict[str, Any] | list[Any], parsed)
        except json.JSONDecodeError as e:
            logger.error(f"Error al parsear JSON: {e}\nRespuesta: {response_text[:500]}")
            raise ValueError(f"La respuesta no es JSON válido: {e}")
