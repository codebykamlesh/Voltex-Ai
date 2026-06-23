"""User profile and settings routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.user_settings import UserSettings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["User"])


class UserOut(BaseModel):
    id: str
    email: str | None
    display_name: str | None
    avatar_url: str | None
    provider: str
    created_at: str

    model_config = {"from_attributes": True}


class SettingsOut(BaseModel):
    theme: str
    ai_model: str
    temperature: float
    max_tokens: int
    sidebar_collapsed: bool

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    theme: str | None = None
    ai_model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    sidebar_collapsed: bool | None = None


@router.get("", response_model=UserOut)
async def get_user_profile(user: User = Depends(get_current_user)):
    """Get the authenticated user's profile."""
    return UserOut(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        provider=user.provider,
        created_at=user.created_at.isoformat(),
    )


@router.get("/settings", response_model=SettingsOut)
async def get_user_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's settings."""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        await db.flush()

    return SettingsOut(
        theme=settings.theme,
        ai_model=settings.ai_model,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        sidebar_collapsed=settings.sidebar_collapsed,
    )


@router.put("/settings", response_model=SettingsOut)
async def update_user_settings(
    body: SettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's settings."""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        await db.flush()

    if body.theme is not None:
        if body.theme not in ("dark", "light", "system"):
            raise HTTPException(status_code=400, detail="Theme must be 'dark', 'light', or 'system'.")
        settings.theme = body.theme

    if body.ai_model is not None:
        settings.ai_model = body.ai_model

    if body.temperature is not None:
        if not (0.0 <= body.temperature <= 2.0):
            raise HTTPException(status_code=400, detail="Temperature must be between 0.0 and 2.0.")
        settings.temperature = body.temperature

    if body.max_tokens is not None:
        if not (256 <= body.max_tokens <= 32768):
            raise HTTPException(status_code=400, detail="Max tokens must be between 256 and 32768.")
        settings.max_tokens = body.max_tokens

    if body.sidebar_collapsed is not None:
        settings.sidebar_collapsed = body.sidebar_collapsed

    await db.flush()

    return SettingsOut(
        theme=settings.theme,
        ai_model=settings.ai_model,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        sidebar_collapsed=settings.sidebar_collapsed,
    )
