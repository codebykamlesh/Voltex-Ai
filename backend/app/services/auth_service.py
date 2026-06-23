"""Firebase Authentication service — verifies tokens and manages user creation."""

import json
import logging
from typing import Optional

import firebase_admin
from firebase_admin import auth, credentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.models.user_settings import UserSettings

logger = logging.getLogger(__name__)

_firebase_initialized = False


def initialize_firebase() -> None:
    """Initialize Firebase Admin SDK. Safe to call multiple times."""
    global _firebase_initialized
    if _firebase_initialized:
        return
    try:
        if settings.firebase_service_account_json:
            cred_dict = json.loads(settings.firebase_service_account_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT_JSON")
            return

        # No credentials available — mock mode for local dev
        logger.warning(
            "FIREBASE_SERVICE_ACCOUNT_JSON is empty. "
            "Token verification will be simulated for local development!"
        )
        _firebase_initialized = True
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        raise


def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token and return the decoded claims.

    Raises ValueError if the token is invalid or expired.
    """
    if not settings.firebase_service_account_json:
        # Simulated mode — decode JWT payload without signature verification.
        # Used for local development when Firebase credentials are not available.
        import base64

        try:
            parts = id_token.split(".")
            if len(parts) != 3:
                raise ValueError("Invalid JWT format")

            payload = parts[1]
            payload += "=" * ((4 - len(payload) % 4) % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))

            if "uid" not in claims:
                claims["uid"] = claims.get("sub") or claims.get("user_id") or "unknown-uid"

            return claims
        except (KeyError, ValueError) as exc:
            raise ValueError(f"Simulated token verification failed: {exc}") from exc

    try:
        decoded = auth.verify_id_token(id_token)
        return decoded
    except auth.ExpiredIdTokenError:
        raise ValueError("Firebase token has expired. Please sign in again.")
    except auth.RevokedIdTokenError:
        raise ValueError("Firebase token has been revoked.")
    except auth.InvalidIdTokenError:
        raise ValueError("Invalid Firebase token.")
    except Exception as e:
        logger.error(f"Firebase token verification error: {e}")
        raise ValueError("Authentication failed. Please try again.")


async def get_or_create_user(db: AsyncSession, firebase_claims: dict) -> User:
    """Find existing user by Firebase UID or create a new one with default settings."""
    firebase_uid = firebase_claims["uid"]

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if user:
        # Update profile info from Firebase if changed
        updated = False
        new_name = firebase_claims.get("name")
        new_picture = firebase_claims.get("picture")
        new_email = firebase_claims.get("email")

        if new_name and user.display_name != new_name:
            user.display_name = new_name
            updated = True
        if new_picture and user.avatar_url != new_picture:
            user.avatar_url = new_picture
            updated = True
        if new_email and user.email != new_email:
            user.email = new_email
            updated = True

        if updated:
            await db.flush()

        return user

    # Determine auth provider
    provider = "google"
    sign_in_provider = firebase_claims.get("firebase", {}).get("sign_in_provider", "")
    if sign_in_provider == "password":
        provider = "email"
    elif sign_in_provider == "phone":
        provider = "phone"

    user = User(
        firebase_uid=firebase_uid,
        email=firebase_claims.get("email"),
        display_name=firebase_claims.get("name", firebase_claims.get("email", "User")),
        avatar_url=firebase_claims.get("picture"),
        phone_number=firebase_claims.get("phone_number"),
        provider=provider,
    )
    db.add(user)
    await db.flush()

    # Create default settings
    user_settings = UserSettings(user_id=user.id)
    db.add(user_settings)
    await db.flush()

    logger.info(f"Created new user: {user.email or user.firebase_uid}")
    return user


async def send_email_verification(email: str) -> None:
    """Generate and send an email verification link via Firebase."""
    try:
        link = auth.generate_email_verification_link(email)
        logger.info(f"Email verification link generated for {email}: {link}")
    except Exception as e:
        logger.error(f"Failed to generate email verification link: {e}")
        raise ValueError("Could not send verification email. Please try again.")
