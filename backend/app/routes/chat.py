"""Chat route — streaming AI responses via Server-Sent Events."""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, get_db
from app.dependencies.auth import get_current_user
from app.models.api_usage import ApiUsage
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.uploaded_file import UploadedFile
from app.models.user import User
from app.models.user_settings import UserSettings
from app.services.groq_service import (
    build_messages,
    chat_completion_stream,
    get_available_models,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])

# Track active generation events by conversation_id for stop functionality
_active_generations: dict[str, asyncio.Event] = {}


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    file_ids: list[str] | None = None


class StopRequest(BaseModel):
    conversation_id: str


@router.post("")
async def send_message(
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and stream the AI response as Server-Sent Events.

    If no conversation_id is provided, creates a new conversation.
    The response is streamed so the frontend can render tokens as they arrive.
    """
    # Get user settings for defaults
    settings_result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    user_settings = settings_result.scalar_one_or_none()

    model = body.model or (user_settings.ai_model if user_settings else "llama-3.3-70b-versatile")
    temperature = body.temperature or (user_settings.temperature if user_settings else 0.7)
    max_tokens = body.max_tokens or (user_settings.max_tokens if user_settings else 4096)

    # Get or create conversation
    if body.conversation_id:
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.id == uuid.UUID(body.conversation_id),
                Conversation.user_id == user.id,
                Conversation.is_deleted == False,
            )
        )
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found.")
    else:
        # Auto-generate title from first message
        title = body.message[:80].strip()
        if len(body.message) > 80:
            title += "..."
        conversation = Conversation(
            user_id=user.id,
            title=title,
            model_used=model,
        )
        db.add(conversation)
        await db.flush()

    # Save user message
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=body.message,
    )
    db.add(user_message)
    await db.flush()

    # Get file context if files were referenced
    file_context = None
    if body.file_ids:
        file_texts = []
        for fid in body.file_ids:
            try:
                file_result = await db.execute(
                    select(UploadedFile).where(
                        UploadedFile.id == uuid.UUID(fid),
                        UploadedFile.user_id == user.id,
                    )
                )
                uploaded = file_result.scalar_one_or_none()
                if uploaded and uploaded.extracted_text:
                    file_texts.append(f"[File: {uploaded.filename}]\n{uploaded.extracted_text}")
            except Exception:
                continue
        if file_texts:
            file_context = "\n\n".join(file_texts)

    # Build conversation history for context
    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    history = messages_result.scalars().all()

    # Limit context window — last 50 messages
    recent = history[-50:]
    conv_messages = [{"role": m.role, "content": m.content} for m in recent]

    groq_messages = build_messages(conv_messages, file_context=file_context)

    # Commit user message before streaming
    await db.commit()

    conv_id_uuid = conversation.id
    user_id_uuid = user.id
    conv_id_str = str(conversation.id)
    stop_event = asyncio.Event()
    _active_generations[conv_id_str] = stop_event

    async def event_stream():
        full_content = ""
        usage_data = {}

        try:
            # Send conversation metadata first
            yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conv_id_str, 'message_id': str(user_message.id)})}\n\n"

            async for chunk in chat_completion_stream(
                messages=groq_messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                stop_event=stop_event,
            ):
                if chunk["type"] == "content":
                    full_content += chunk["content"]
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk['content']})}\n\n"

                elif chunk["type"] == "done":
                    full_content = chunk.get("content", full_content)
                    usage_data = chunk.get("usage", {})
                    yield f"data: {json.dumps({'type': 'done', 'usage': usage_data})}\n\n"

                elif chunk["type"] == "error":
                    yield f"data: {json.dumps({'type': 'error', 'content': 'An error occurred while generating the response. Please try again.'})}\n\n"
                    return

            # Save assistant message in a fresh session (the route's session is already committed/closed)
            async with async_session() as save_db:
                tokens = usage_data.get("total_tokens") or 0
                assistant_msg = Message(
                    conversation_id=conv_id_uuid,
                    role="assistant",
                    content=full_content or "I apologize, but I was unable to generate a response.",
                    model_used=model,
                    tokens_used=tokens,
                )
                save_db.add(assistant_msg)

                # Track API usage
                if usage_data and not usage_data.get("stopped"):
                    api_usage = ApiUsage(
                        user_id=user_id_uuid,
                        model=model,
                        tokens_input=usage_data.get("prompt_tokens") or 0,
                        tokens_output=usage_data.get("completion_tokens") or 0,
                    )
                    save_db.add(api_usage)

                # Update conversation timestamp
                conv_update = await save_db.execute(
                    select(Conversation).where(Conversation.id == conv_id_uuid)
                )
                conv_obj = conv_update.scalar_one_or_none()
                if conv_obj:
                    conv_obj.updated_at = datetime.now(timezone.utc)

                await save_db.commit()

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': 'An unexpected error occurred.'})}\n\n"
        finally:
            _active_generations.pop(conv_id_str, None)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/stop")
async def stop_generation(
    body: StopRequest,
    user: User = Depends(get_current_user),
):
    """Stop an active AI generation for a conversation."""
    stop_event = _active_generations.get(body.conversation_id)
    if stop_event:
        stop_event.set()
        return {"status": "stopped"}
    return {"status": "no_active_generation"}


@router.get("/models")
async def list_models(user: User = Depends(get_current_user)):
    """Return available AI models."""
    return {"models": get_available_models()}
