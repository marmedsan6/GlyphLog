"""Abstraccion de clientes LLM para generacion estructurada (JSON).

Recomendaciones e importacion comparten una necesidad unica: mandar un prompt
y recibir JSON. Aqui definimos un Protocol con esa interfaz y dos
implementaciones:

- BedrockClient (app/integrations/bedrock/client.py) — Claude via AWS.
- OpenAIJsonlClient (este modulo) — reutiliza la API key del chat.

Los servicios dependen solo del Protocol (JsonLlm), no de Bedrock ni de
OpenAI directamente, por lo que el proveedor se elige por entorno en
core/dependencies.py (get_llm_client).
"""

import json
import logging
from typing import Any, Protocol

from openai import OpenAI

logger = logging.getLogger(__name__)


class JsonLlm(Protocol):
    """Interfaz minima que usan recomendaciones e importacion."""

    def invoke_json(
        self,
        prompt: str,
        temperature: float = 0.7,
        system: str | None = None,
    ) -> dict[str, Any] | list[Any]:
        """Devuelve el JSON (dict o list) devuelto por el modelo."""
        ...


def _extract_json(response_text: str) -> dict[str, Any] | list[Any]:
    """Extrae y parsea el JSON de la respuesta, aceptando fences markdown."""
    if "```json" in response_text:
        start = response_text.find("```json") + 7
        end = response_text.find("```", start)
        response_text = response_text[start:end].strip()
    elif "```" in response_text:
        start = response_text.find("```") + 3
        end = response_text.find("```", start)
        response_text = response_text[start:end].strip()

    try:
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.error(f"Error al parsear JSON de OpenAI: {e}\nRespuesta: {response_text[:500]}")
        raise ValueError(f"La respuesta del modelo no es JSON valido: {e}")


class OpenAIJsonlClient:
    """Client no-streaming de OpenAI que responde JSON estructurado."""

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str | None = None,
        max_tokens: int = 4096,
    ) -> None:
        self.model = model
        self.max_tokens = max_tokens
        client_kwargs: dict[str, str] = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
        self._client = OpenAI(**client_kwargs)

    def invoke_json(
        self,
        prompt: str,
        temperature: float = 0.7,
        system: str | None = None,
    ) -> dict[str, Any] | list[Any]:
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        response = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=self.max_tokens,
        )
        text = response.choices[0].message.content or ""
        return _extract_json(text)