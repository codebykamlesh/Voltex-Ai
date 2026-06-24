"""Groq AI service — handles streaming chat completions via the Groq API.

The API key is NEVER exposed to the frontend. All Groq communication
happens exclusively through this server-side service.
"""

import asyncio
import logging
from typing import AsyncGenerator, Optional

from groq import AsyncGroq

from app.config import settings

logger = logging.getLogger(__name__)

AVAILABLE_MODELS = [
    {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B", "context_window": 128000},
    {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B", "context_window": 128000},
    {"id": "llama-3.2-90b-vision-preview", "name": "Llama 3.2 90B Vision", "context_window": 128000},
    {"id": "gemma2-9b-it", "name": "Gemma 2 9B", "context_window": 8192},
    {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B", "context_window": 32768},
]


def _get_client() -> AsyncGroq:
    """Create a fresh Groq client — the key stays server-side."""
    if not settings.groq_api_key:
        raise ValueError("GROQ_API_KEY is not configured. Set it in your .env file.")
    return AsyncGroq(api_key=settings.groq_api_key)


def build_messages(
    conversation_messages: list[dict],
    system_prompt: str | None = None,
    file_context: str | None = None,
) -> list[dict]:
    """Construct the message array sent to Groq.

    Includes optional system prompt and file context prepended to the latest user message.
    """
    messages: list[dict] = []

    base_system = (
        "You are Voltex AI, a high-performance AI assistant built for developers and power users. "
        "You provide precise, detailed, and technically accurate responses. "
        "When sharing code, use proper markdown code blocks with language specifiers. "
        "Be direct and efficient in your responses."
    )
    if system_prompt:
        base_system = f"{base_system}\n\n{system_prompt}"

    messages.append({"role": "system", "content": base_system})

    for msg in conversation_messages:
        content = msg["content"]
        # Prepend file context to the latest user message if provided
        if file_context and msg == conversation_messages[-1] and msg["role"] == "user":
            content = f"[Uploaded Document Context]\n{file_context}\n\n[User Question]\n{content}"
        messages.append({"role": msg["role"], "content": content})

    return messages


async def chat_completion_stream(
    messages: list[dict],
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.7,
    max_tokens: int = 4096,
    stop_event: Optional[asyncio.Event] = None,
) -> AsyncGenerator[dict, None]:
    """Stream a chat completion from Groq, yielding chunks.

    Each yielded dict has:
      - "type": "content" | "done" | "error"
      - "content": the text chunk (for "content" type)
      - "usage": token usage dict (for "done" type)
    """
    client = _get_client()
    total_content = ""

    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async for chunk in stream:
            # Check if generation was stopped by user
            if stop_event and stop_event.is_set():
                yield {"type": "done", "content": total_content, "usage": {"stopped": True}}
                return

            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                total_content += delta.content
                yield {"type": "content", "content": delta.content}

            # Check for finish reason
            if chunk.choices and chunk.choices[0].finish_reason:
                usage_data = {}
                if hasattr(chunk, "x_groq") and chunk.x_groq and hasattr(chunk.x_groq, "usage"):
                    u = chunk.x_groq.usage
                    if u:
                        usage_data = {
                            "prompt_tokens": getattr(u, "prompt_tokens", 0),
                            "completion_tokens": getattr(u, "completion_tokens", 0),
                            "total_tokens": getattr(u, "total_tokens", 0),
                        }
                yield {
                    "type": "done",
                    "content": total_content,
                    "usage": usage_data,
                    "finish_reason": chunk.choices[0].finish_reason,
                }
                return

        # If stream ends without explicit finish
        yield {"type": "done", "content": total_content, "usage": {}}

    except Exception as e:
        logger.error(f"Groq streaming error: {e}")
        yield {"type": "error", "content": str(e)}


async def chat_completion(
    messages: list[dict],
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> dict:
    """Non-streaming chat completion. Returns full response."""
    client = _get_client()

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )

        choice = response.choices[0]
        usage = response.usage

        return {
            "content": choice.message.content,
            "usage": {
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
            },
            "model": response.model,
            "finish_reason": choice.finish_reason,
        }

    except Exception as e:
        logger.error(f"Groq completion error: {e}")
        raise


def get_available_models() -> list[dict]:
    """Return list of models available through Groq."""
    return AVAILABLE_MODELS
