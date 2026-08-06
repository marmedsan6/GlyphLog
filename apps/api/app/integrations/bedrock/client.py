"""
Cliente centralizado para AWS Bedrock (Claude).

Wrapper para llamadas a Bedrock con retry, logging y validación de output.
Configurado para usar Sonnet 4.5 en us-east-1.
"""

import json
import logging
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class BedrockClient:
    """Cliente para interactuar con AWS Bedrock (Claude Sonnet 4.5)."""

    def __init__(
        self,
        model_id: str = "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        region: str = "us-east-1",
        max_tokens: int = 4096,
    ):
        """
        Inicializa el cliente de Bedrock.

        Args:
            model_id: ID del modelo de Claude en Bedrock
            region: Región de AWS
            max_tokens: Máximo de tokens en la respuesta
        """
        self.model_id = model_id
        self.region = region
        self.max_tokens = max_tokens

        try:
            self.client = boto3.client(
                service_name="bedrock-runtime",
                region_name=region,
            )
            logger.info(f"BedrockClient inicializado: {model_id} en {region}")
        except Exception as e:
            logger.error(f"Error al inicializar Bedrock client: {e}")
            raise

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

        request_body: dict[str, Any] = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": self.max_tokens,
            "temperature": temperature,
            "messages": messages,
        }

        if system:
            request_body["system"] = system

        try:
            logger.debug(f"Invocando Bedrock: {len(prompt)} chars, temp={temperature}")

            response = self.client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body),
            )

            response_body = json.loads(response["body"].read())

            # Extraer texto de la respuesta
            if "content" in response_body and response_body["content"]:
                text = response_body["content"][0]["text"]
                logger.debug(f"Respuesta recibida: {len(text)} chars")
                return text

            raise ValueError("Respuesta de Bedrock sin contenido")

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            error_message = e.response["Error"]["Message"]
            logger.error(f"Error de Bedrock ({error_code}): {error_message}")
            raise
        except Exception as e:
            logger.error(f"Error inesperado al invocar Bedrock: {e}")
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
            return json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Error al parsear JSON: {e}\nRespuesta: {response_text[:500]}")
            raise ValueError(f"La respuesta no es JSON válido: {e}")
