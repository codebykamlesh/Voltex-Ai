# Voltex AI — Setup Script (PowerShell)
# Run: .\scripts\setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VOLTEX AI — Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$missing = @()

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    $missing += "Node.js (https://nodejs.org/)"
}

if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    $missing += "Python 3.12+ (https://python.org/)"
}

if ($missing.Count -gt 0) {
    Write-Host "Missing prerequisites:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Please install the above and re-run this script." -ForegroundColor Red
    exit 1
}

Write-Host "  Node.js: $(node --version)" -ForegroundColor Green
Write-Host "  Python: $(python --version)" -ForegroundColor Green
Write-Host ""

# Create .env from example
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "  Created .env — please fill in your values!" -ForegroundColor Green
} else {
    Write-Host "  .env already exists, skipping." -ForegroundColor Gray
}

# Copy .env to frontend/.env.local so Next.js picks up NEXT_PUBLIC_* vars
Write-Host "Syncing .env to frontend/.env.local..." -ForegroundColor Yellow
Copy-Item ".env" "frontend/.env.local" -Force
Write-Host "  Synced." -ForegroundColor Green

Write-Host ""

# Backend setup
Write-Host "Setting up backend..." -ForegroundColor Yellow
Push-Location backend

if (-not (Test-Path "venv")) {
    Write-Host "  Creating Python virtual environment..." -ForegroundColor Gray
    python -m venv venv
}

Write-Host "  Installing Python dependencies..." -ForegroundColor Gray
& "venv\Scripts\pip.exe" install -r requirements.txt --quiet

Pop-Location
Write-Host "  Backend setup complete." -ForegroundColor Green
Write-Host ""

# Frontend setup
Write-Host "Setting up frontend..." -ForegroundColor Yellow
Push-Location frontend

Write-Host "  Installing npm dependencies..." -ForegroundColor Gray
npm install --silent

Pop-Location
Write-Host "  Frontend setup complete." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Fill in .env with your MySQL URL, Groq API key, and Firebase config" -ForegroundColor White
Write-Host "  2. Run migrations: cd backend && venv\Scripts\alembic.exe upgrade head" -ForegroundColor White
Write-Host "  3. Start backend: cd backend && venv\Scripts\uvicorn.exe app.main:app --reload" -ForegroundColor White
Write-Host "  4. Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
