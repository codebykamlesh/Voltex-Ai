"""File upload service — handles storage and text extraction from documents."""

import logging
import os
import uuid
from pathlib import Path
from typing import Optional

import aiofiles

from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/png",
    "image/jpeg",
}


def _ensure_upload_dir() -> Path:
    """Create upload directory if it doesn't exist."""
    upload_path = Path(settings.upload_dir)
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


def validate_file(filename: str, file_size: int) -> tuple[bool, str]:
    """Validate file extension and size. Returns (is_valid, error_message)."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type '{ext}' is not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    if file_size > settings.max_upload_bytes:
        return False, f"File size exceeds {settings.max_upload_size_mb}MB limit."

    return True, ""


async def save_file(filename: str, content: bytes) -> tuple[str, str]:
    """Save file to disk. Returns (storage_path, file_type)."""
    upload_dir = _ensure_upload_dir()
    ext = Path(filename).suffix.lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / unique_name

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return str(file_path), ext.lstrip(".")


async def extract_text(file_path: str, file_type: str) -> Optional[str]:
    """Extract text content from a file for AI context."""
    try:
        if file_type == "txt":
            return await _extract_txt(file_path)
        elif file_type == "pdf":
            return _extract_pdf(file_path)
        elif file_type == "docx":
            return _extract_docx(file_path)
        elif file_type in ("png", "jpg", "jpeg"):
            return f"[Image file: {os.path.basename(file_path)}. Image analysis is available when using a vision-capable model.]"
        else:
            return None
    except Exception as e:
        logger.error(f"Text extraction failed for {file_path}: {e}")
        return f"[File uploaded: {os.path.basename(file_path)}. Text extraction encountered an error.]"


async def _extract_txt(file_path: str) -> str:
    """Read plain text file."""
    async with aiofiles.open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = await f.read()
    # Limit to ~50k chars to avoid blowing up context
    if len(content) > 50000:
        content = content[:50000] + "\n\n[... text truncated to 50,000 characters ...]"
    return content


def _extract_pdf(file_path: str) -> str:
    """Extract text from PDF using PyPDF2."""
    from PyPDF2 import PdfReader

    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            pages.append(f"--- Page {i + 1} ---\n{text}")

    content = "\n\n".join(pages)
    if len(content) > 50000:
        content = content[:50000] + "\n\n[... text truncated to 50,000 characters ...]"
    return content if content else "[PDF contained no extractable text]"


def _extract_docx(file_path: str) -> str:
    """Extract text from DOCX using python-docx."""
    from docx import Document

    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    content = "\n\n".join(paragraphs)
    if len(content) > 50000:
        content = content[:50000] + "\n\n[... text truncated to 50,000 characters ...]"
    return content if content else "[Document contained no extractable text]"


async def delete_file(file_path: str) -> None:
    """Remove a file from disk."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.error(f"Failed to delete file {file_path}: {e}")
