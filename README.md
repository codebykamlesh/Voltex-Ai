# ⚡ VOLTEX AI

A high-performance AI chat application built for developers and power users.

**Tech Stack:** Next.js 15 • FastAPI • PostgreSQL • Firebase Auth • Groq AI • Docker

---

## Features

- 🔐 **Authentication** — Google Sign-In + Email/Password with verification
- 💬 **Streaming Chat** — Real-time AI responses via Server-Sent Events
- 🧠 **Multiple Models** — Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B, Gemma 2 9B
- 📁 **File Uploads** — PDF, DOCX, TXT, PNG, JPG — ask questions about documents
- 📌 **Chat Management** — Create, rename, pin, delete, search, export conversations
- ⚙️ **User Settings** — Theme, model, temperature, max tokens — persisted server-side
- 🎨 **Premium UI** — Ultra-dark technical minimalism design from Stitch
- 📱 **Responsive** — Desktop + mobile with collapsible sidebar
- 🔒 **Secure** — API keys server-only, CORS, rate limiting, input validation

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 16+
- Firebase project (for auth)
- Groq API key

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd voltex-ai
```

### 2. Configure Environment

```bash
# Root .env
cp .env.example .env
# Edit .env with your database credentials and Groq API key

# Frontend .env
cp frontend/.env.local.example frontend/.env.local
# Edit with your Firebase web config
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project (or use existing)
3. Enable **Authentication** → Sign-in providers:
   - Google
   - Email/Password
4. Go to **Project Settings** → **General** → copy web app config into `frontend/.env.local`
5. Go to **Project Settings** → **Service accounts** → **Generate new private key**
6. Save the JSON file as `backend/firebase-service-account.json`

### 4. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migration
alembic upgrade head

# Start backend
uvicorn app.main:app --reload --port 8000
```

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 6. Open

Navigate to [http://localhost:3000](http://localhost:3000)

---

## Docker

```bash
# Start everything (PostgreSQL + Backend + Frontend)
docker-compose up --build

# Or just the database
docker-compose up postgres -d
```

---

## Project Structure

```
voltex-ai/
├── frontend/                  # Next.js 15 + TypeScript
│   ├── src/
│   │   ├── app/              # Pages (App Router)
│   │   │   ├── login/        # Auth pages
│   │   │   └── (chat)/       # Protected chat pages
│   │   ├── components/       # UI components
│   │   │   ├── chat/         # Chat messages, input, code blocks
│   │   │   ├── sidebar/      # Sidebar, user menu
│   │   │   └── settings/     # Settings dialog
│   │   ├── store/            # Zustand state management
│   │   └── lib/              # Firebase, API client, utilities
│   └── Dockerfile
│
├── backend/                   # FastAPI + Python
│   ├── app/
│   │   ├── models/           # SQLAlchemy database models
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic (auth, groq, files)
│   │   ├── dependencies/     # FastAPI dependencies
│   │   ├── main.py           # App entry point
│   │   └── config.py         # Environment configuration
│   ├── alembic/              # Database migrations
│   └── Dockerfile
│
├── docs/                      # Documentation
├── scripts/                   # Setup scripts
├── docker-compose.yml
└── .env.example
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/verify` | Verify Firebase token |
| GET | `/api/user` | Get user profile |
| GET/PUT | `/api/user/settings` | User settings |
| POST | `/api/chat` | Send message (SSE stream) |
| POST | `/api/chat/stop` | Stop generation |
| GET/POST | `/api/chats` | List/create conversations |
| GET/PUT/DELETE | `/api/chats/{id}` | Conversation CRUD |
| POST | `/api/upload` | Upload file |
| GET | `/api/health` | Health check |

See [docs/API.md](docs/API.md) for full reference.

---

## Environment Variables

See [.env.example](.env.example) for all required variables.

**Required:**
- `GROQ_API_KEY` — Get from [Groq Console](https://console.groq.com/)
- `FIREBASE_SERVICE_ACCOUNT_PATH` — Firebase Admin SDK service account JSON
- `NEXT_PUBLIC_FIREBASE_*` — Firebase web config values
- `DATABASE_URL` — PostgreSQL connection string (auto-configured in Docker)

---

## License

MIT
