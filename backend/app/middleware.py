"""Request logging and error handling middleware."""

import logging
import time
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log request method, path, status, and duration for every request."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = None
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"Unhandled error: {e}\n{traceback.format_exc()}")
            response = JSONResponse(
                status_code=500,
                content={"detail": "An internal server error occurred. Please try again later."},
            )
        finally:
            elapsed = (time.perf_counter() - start) * 1000
            status = response.status_code if response else 500
            logger.info(
                f"{request.method} {request.url.path} → {status} ({elapsed:.1f}ms)"
            )
        return response
