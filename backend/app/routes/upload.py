"""File upload route — handles file uploads and text extraction."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.uploaded_file import UploadedFile as UploadedFileModel
from app.models.user import User
from app.services.file_service import extract_text, save_file, validate_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/upload", tags=["Upload"])


class UploadResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    has_extracted_text: bool


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file (PDF, DOCX, TXT, PNG, JPG, JPEG) and extract text for AI context."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Validate
    is_valid, error_msg = validate_file(file.filename, file_size)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Save to disk
    storage_path, file_type = await save_file(file.filename, content)

    # Extract text
    extracted = await extract_text(storage_path, file_type)

    # Save metadata to database
    conv_uuid = uuid.UUID(conversation_id) if conversation_id else None
    uploaded = UploadedFileModel(
        user_id=user.id,
        conversation_id=conv_uuid,
        filename=file.filename,
        file_type=file_type,
        file_size=file_size,
        storage_path=storage_path,
        extracted_text=extracted,
    )
    db.add(uploaded)
    await db.flush()

    return UploadResponse(
        id=str(uploaded.id),
        filename=uploaded.filename,
        file_type=uploaded.file_type,
        file_size=uploaded.file_size,
        has_extracted_text=bool(extracted),
    )
