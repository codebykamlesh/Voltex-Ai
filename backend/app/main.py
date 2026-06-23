"""Voltex AI — FastAPI application entry point."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.middleware import RequestLoggingMiddleware
from app.services.auth_service import initialize_firebase

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    logger.info("Starting Voltex AI Backend...")
    os.makedirs(settings.upload_dir, exist_ok=True)

    try:
        initialize_firebase()
    except Exception as e:
        logger.warning(f"Firebase initialization skipped: {e}")

    # Initialize database tables
    from app.database import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Voltex AI Backend ready")
    yield
    # Shutdown
    logger.info("Shutting down Voltex AI Backend...")


app = FastAPI(
    title="Voltex AI API",
    description="High-performance AI chat backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging
app.add_middleware(RequestLoggingMiddleware)


# Global exception handler — never expose raw errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again later."},
    )


# Register routers
from app.routes.auth import router as auth_router
from app.routes.chat import router as chat_router
from app.routes.conversations import router as conversations_router
from app.routes.user import router as user_router
from app.routes.upload import router as upload_router
from app.routes.health import router as health_router

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(conversations_router)
app.include_router(user_router)
app.include_router(upload_router)
app.include_router(health_router)


@app.get("/")
async def root():
    return {"name": "Voltex AI", "version": "1.0.0", "status": "running"}
