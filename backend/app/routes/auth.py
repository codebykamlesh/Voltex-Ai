"""Authentication routes — verify Firebase tokens and manage sessions."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_or_create_user, verify_firebase_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class AuthRequest(BaseModel):
    id_token: str


class AuthResponse(BaseModel):
    id: str
    email: str | None
    display_name: str | None
    avatar_url: str | None
    provider: str

    model_config = {"from_attributes": True}


@router.post("/verify", response_model=AuthResponse)
async def verify_token(body: AuthRequest, db: AsyncSession = Depends(get_db)):
    """Verify a Firebase ID token and return/create the user.

    The frontend calls this after Firebase client-side authentication
    (Google sign-in or email/password) to establish a server-side session.
    """
    try:
        claims = verify_firebase_token(body.id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = await get_or_create_user(db, claims)

    return AuthResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        provider=user.provider,
    )
