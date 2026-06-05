import json
from collections.abc import AsyncIterator, Sequence
from typing import Any

import httpx

from app.core.config import settings


class AIModelError(RuntimeError):
    """Raised when the configured AI model provider returns an invalid response."""


class AIModelClient:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise AIModelError("OPENAI_API_KEY is not configured.")

        self.base_url = settings.openai_base_url.rstrip("/")
        self.model = settings.openai_model
        self.reasoning_effort = settings.openai_reasoning_effort
        self.embedding_model = settings.openai_embedding_model
        self.embedding_dimensions = settings.openai_embedding_dimensions
        self.timeout = httpx.Timeout(60.0, connect=10.0, read=120.0)

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }

    async def chat_completion(
        self,
        *,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
        response_format: dict[str, Any] | None = None,
        max_tokens: int | None = None,
    ) -> str:
        body = self._responses_body(
            messages=messages,
            temperature=temperature,
            response_format=response_format,
            max_tokens=max_tokens,
            stream=False,
        )

        response = await self._post_json("/v1/responses", body)
        text = self._extract_response_text(response)
        if not text:
            raise AIModelError("AI model provider returned no response text.")
        return text

    async def stream_chat_completion(
        self,
        *,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        body = self._responses_body(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST",
                self._url("/v1/responses"),
                headers=self.headers,
                json=body,
            ) as response:
                if response.status_code >= 400:
                    await self._raise_stream_error(response)

                async for line in response.aiter_lines():
                    chunk = self._parse_stream_line(line)
                    if chunk:
                        yield chunk

    async def embed(self, inputs: str | Sequence[str]) -> list[list[float]]:
        if not settings.openai_embeddings_enabled:
            raise AIModelError(
                "Embeddings are disabled. Set OPENAI_EMBEDDINGS_ENABLED=true "
                "when the configured provider supports /v1/embeddings."
            )

        body: dict[str, Any] = {
            "model": self.embedding_model,
            "input": inputs,
            "dimensions": self.embedding_dimensions,
            "encoding_format": "float",
        }
        response = await self._post_json("/v1/embeddings", body)
        data = response.get("data") or []
        if not data:
            raise AIModelError("AI model provider returned no embeddings.")

        embeddings = [
            item.get("embedding")
            for item in sorted(data, key=lambda item: item.get("index", 0))
        ]
        if not all(isinstance(embedding, list) for embedding in embeddings):
            raise AIModelError("AI model provider returned an invalid embedding response.")

        return embeddings

    def _responses_body(
        self,
        *,
        messages: list[dict[str, str]],
        temperature: float,
        stream: bool,
        response_format: dict[str, Any] | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        instructions, input_text = self._split_messages(messages)
        body: dict[str, Any] = {
            "model": self.model,
            "input": input_text,
            "stream": stream,
        }
        if instructions:
            body["instructions"] = instructions
        if max_tokens:
            body["max_output_tokens"] = max_tokens
        if self.reasoning_effort:
            body["reasoning"] = {"effort": self.reasoning_effort}
        if response_format:
            body["text"] = {"format": response_format}
        return body

    @staticmethod
    def _split_messages(messages: list[dict[str, str]]) -> tuple[str, str]:
        instructions: list[str] = []
        inputs: list[str] = []

        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")
            if role == "system":
                instructions.append(content)
            else:
                inputs.append(f"{role.upper()}:\n{content}")

        return "\n\n".join(instructions), "\n\n".join(inputs)

    async def _post_json(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self._url(path), headers=self.headers, json=body)

        if response.status_code >= 400:
            raise AIModelError(self._format_error(response.status_code, response.text))

        try:
            data = response.json()
        except ValueError as exc:
            raise AIModelError("AI model provider returned non-JSON data.") from exc

        if not isinstance(data, dict):
            raise AIModelError("AI model provider returned an invalid JSON payload.")
        return data

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    async def _raise_stream_error(self, response: httpx.Response) -> None:
        raw = await response.aread()
        text = raw.decode("utf-8", errors="replace")
        raise AIModelError(self._format_error(response.status_code, text))

    @staticmethod
    def _extract_response_text(response: dict[str, Any]) -> str:
        output_text = response.get("output_text")
        if isinstance(output_text, str):
            return output_text

        chunks: list[str] = []
        for item in response.get("output", []):
            if not isinstance(item, dict):
                continue
            for content in item.get("content", []):
                if not isinstance(content, dict):
                    continue
                text = content.get("text")
                if isinstance(text, str):
                    chunks.append(text)
        return "".join(chunks)

    @staticmethod
    def _format_error(status_code: int, text: str) -> str:
        try:
            payload = json.loads(text)
            error = payload.get("error") or payload.get("message") or payload
        except ValueError:
            error = text
        return f"AI model provider request failed ({status_code}): {error}"

    @staticmethod
    def _parse_stream_line(line: str) -> str:
        line = line.strip()
        if not line or not line.startswith("data:"):
            return ""

        data = line.removeprefix("data:").strip()
        if data == "[DONE]":
            return ""

        try:
            payload = json.loads(data)
        except ValueError:
            return ""

        event_type = payload.get("type")
        if event_type == "response.output_text.delta":
            delta = payload.get("delta")
            return delta if isinstance(delta, str) else ""

        if event_type in {"response.failed", "error"}:
            raise AIModelError(AIModelClient._format_error(500, json.dumps(payload)))

        chunks: list[str] = []
        for choice in payload.get("choices", []):
            delta = choice.get("delta") or {}
            content = delta.get("content")
            if content is None:
                message = choice.get("message") or {}
                content = message.get("content")
            if isinstance(content, str):
                chunks.append(content)
        return "".join(chunks)
