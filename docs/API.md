# Voltex AI API Reference

## Base URL

```
http://localhost:8000
```

All endpoints (except `/api/health` and `/api/auth/verify`) require a Firebase Bearer token in the `Authorization` header.

---

## Authentication

### `POST /api/auth/verify`

Verify a Firebase ID token and create/retrieve user.

**Request:**
```json
{
  "id_token": "firebase-id-token-here"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "https://...",
  "provider": "google"
}
```

---

## User

### `GET /api/user`

Get authenticated user's profile.

### `GET /api/user/settings`

Get user settings.

**Response:**
```json
{
  "theme": "dark",
  "ai_model": "llama-3.3-70b-versatile",
  "temperature": 0.7,
  "max_tokens": 4096,
  "sidebar_collapsed": false
}
```

### `PUT /api/user/settings`

Update user settings. All fields optional.

---

## Conversations

### `GET /api/chats`

List conversations. Query params: `search`, `limit`, `offset`.

### `POST /api/chats`

Create a new conversation.

### `GET /api/chats/{id}`

Get conversation with all messages.

### `PUT /api/chats/{id}`

Update conversation title or pin status.

### `DELETE /api/chats/{id}`

Soft-delete a conversation.

### `GET /api/chats/{id}/export`

Export conversation as JSON.

---

## Chat

### `POST /api/chat`

Send a message and stream AI response via SSE.

**Request:**
```json
{
  "conversation_id": "uuid (optional)",
  "message": "Your message",
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.7,
  "max_tokens": 4096,
  "file_ids": ["uuid"]
}
```

**SSE Events:**
```
data: {"type": "meta", "conversation_id": "uuid", "message_id": "uuid"}
data: {"type": "content", "content": "token"}
data: {"type": "done", "usage": {"total_tokens": 150}}
data: {"type": "error", "content": "error message"}
```

### `POST /api/chat/stop`

Stop active generation.

### `GET /api/chat/models`

List available AI models.

---

## Upload

### `POST /api/upload`

Upload a file (multipart/form-data).

Fields: `file` (required), `conversation_id` (optional).

Supported: PDF, DOCX, TXT, PNG, JPG, JPEG.

---

## Health

### `GET /api/health`

Health check with database connectivity test.
