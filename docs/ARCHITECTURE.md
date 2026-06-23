# Voltex AI — Architecture

## System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│                 │     │                  │     │             │
│   Next.js 15    │────▶│   FastAPI        │────▶│  PostgreSQL │
│   Frontend      │◀────│   Backend        │◀────│  Database   │
│   (Port 3000)   │     │   (Port 8000)    │     │  (Port 5432)│
│                 │     │                  │     │             │
└────────┬────────┘     └────────┬─────────┘     └─────────────┘
         │                       │
         │                       │
    ┌────▼────┐            ┌─────▼──────┐
    │Firebase │            │  Groq API  │
    │  Auth   │            │ (LLM)     │
    └─────────┘            └────────────┘
```

## Data Flow

1. **Authentication**: Client authenticates with Firebase (Google/Email) → gets ID token → sends to backend `/api/auth/verify` → backend verifies with Firebase Admin SDK → creates/gets user in PostgreSQL.

2. **Chat**: Client sends message → backend builds conversation context from DB → streams response from Groq API via SSE → frontend renders tokens in real-time → assistant message saved to DB.

3. **File Upload**: Client uploads file → backend validates and stores → extracts text (PDF/DOCX/TXT) → saves metadata to DB → text injected into next chat context.

## Security Model

- **API keys** (Groq) are never exposed to the frontend
- **Firebase tokens** are verified server-side on every request
- **CORS** is restricted to frontend origin
- **Rate limiting** via slowapi
- **SQL injection** prevented by SQLAlchemy ORM
- **Input validation** via Pydantic models

## Database Schema

| Table | Purpose |
|-------|---------|
| users | Firebase-authenticated user profiles |
| conversations | Chat threads with soft delete and pinning |
| messages | Individual messages with role, content, token count |
| user_settings | Per-user preferences (theme, model, temperature) |
| uploaded_files | File metadata and extracted text |
| feedback | Thumbs up/down ratings on AI responses |
| api_usage | Token consumption tracking per request |
