"""Conversation CRUD routes — list, create, update, delete conversations."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chats", tags=["Conversations"])


class ConversationCreate(BaseModel):
    title: str = "New Chat"


class ConversationUpdate(BaseModel):
    title: str | None = None
    is_pinned: bool | None = None


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    model_used: str | None = None
    tokens_used: int | None = None
    is_edited: bool = False
    created_at: str

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: str
    title: str
    is_pinned: bool
    model_used: str | None = None
    message_count: int = 0
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ConversationDetailOut(ConversationOut):
    messages: list[MessageOut] = []


@router.get("", response_model=list[ConversationOut])
async def list_conversations(
    search: str | None = Query(None, description="Search conversations by title"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's conversations, ordered by pinned first then most recent."""
    query = (
        select(Conversation)
        .where(Conversation.user_id == user.id, Conversation.is_deleted == False)
    )

    if search:
        query = query.where(Conversation.title.ilike(f"%{search}%"))

    query = query.order_by(
        Conversation.is_pinned.desc(),
        Conversation.updated_at.desc(),
    ).limit(limit).offset(offset)

    result = await db.execute(query)
    conversations = result.scalars().all()

    if not conversations:
        return []

    # Fetch all message counts in one query to avoid N+1
    conv_ids = [c.id for c in conversations]
    count_result = await db.execute(
        select(Message.conversation_id, func.count(Message.id).label("cnt"))
        .where(Message.conversation_id.in_(conv_ids))
        .group_by(Message.conversation_id)
    )
    count_map: dict = {row.conversation_id: row.cnt for row in count_result}

    output = []
    for conv in conversations:
        msg_count = count_map.get(conv.id, 0)
        output.append(ConversationOut(
            id=str(conv.id),
            title=conv.title,
            is_pinned=conv.is_pinned,
            model_used=conv.model_used,
            message_count=msg_count,
            created_at=conv.created_at.isoformat(),
            updated_at=conv.updated_at.isoformat(),
        ))

    return output


@router.post("", response_model=ConversationOut)
async def create_conversation(
    body: ConversationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new empty conversation."""
    conversation = Conversation(user_id=user.id, title=body.title)
    db.add(conversation)
    await db.flush()

    return ConversationOut(
        id=str(conversation.id),
        title=conversation.title,
        is_pinned=conversation.is_pinned,
        model_used=conversation.model_used,
        message_count=0,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
    )


@router.get("/{conversation_id}", response_model=ConversationDetailOut)
async def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with all its messages."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == user.id,
            Conversation.is_deleted == False,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    messages = [
        MessageOut(
            id=str(m.id),
            role=m.role,
            content=m.content,
            model_used=m.model_used,
            tokens_used=m.tokens_used,
            is_edited=m.is_edited,
            created_at=m.created_at.isoformat(),
        )
        for m in sorted(conversation.messages, key=lambda m: m.created_at)
    ]

    return ConversationDetailOut(
        id=str(conversation.id),
        title=conversation.title,
        is_pinned=conversation.is_pinned,
        model_used=conversation.model_used,
        message_count=len(messages),
        messages=messages,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
    )


@router.put("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename or pin/unpin a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == user.id,
            Conversation.is_deleted == False,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if body.title is not None:
        conversation.title = body.title
    if body.is_pinned is not None:
        conversation.is_pinned = body.is_pinned

    conversation.updated_at = datetime.now(timezone.utc)
    await db.flush()

    count_result = await db.execute(
        select(func.count(Message.id)).where(Message.conversation_id == conversation.id)
    )
    msg_count = count_result.scalar() or 0

    return ConversationOut(
        id=str(conversation.id),
        title=conversation.title,
        is_pinned=conversation.is_pinned,
        model_used=conversation.model_used,
        message_count=msg_count,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
    )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == user.id,
            Conversation.is_deleted == False,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conversation.is_deleted = True
    conversation.updated_at = datetime.now(timezone.utc)
    await db.flush()

    return {"status": "deleted"}


@router.get("/{conversation_id}/export")
async def export_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export a conversation as a JSON document."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == user.id,
            Conversation.is_deleted == False,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    return {
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "timestamp": m.created_at.isoformat(),
            }
            for m in sorted(conversation.messages, key=lambda m: m.created_at)
        ],
    }
