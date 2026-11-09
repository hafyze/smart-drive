# Local Development

These commands use Windows PowerShell from the repository root. The backend defaults to MongoDB at `127.0.0.1:27017`; start a local MongoDB service first, or set `MONGODB_URI` in `backend/.env.local` to an isolated development database. The backend loads `backend/.env.local` and then `backend/.env`; process environment variables override both, and `.env.local` overrides `.env`. Production deployments must set `APP_ENV=production` in their process environment. In production mode the backend ignores both dotenv files, so deployment secrets must come from the hosting provider's environment/secret settings.

Receipt scanning needs the Tesseract OCR executable available as `tesseract` on `PATH`, with English (`eng`) language data installed. On Windows, install Tesseract from the [UB Mannheim Windows builds](https://github.com/UB-Mannheim/tesseract/wiki), add its installation directory to `PATH`, then reopen PowerShell. Check the setup with `tesseract --version` and `tesseract --list-langs`.

## One-time setup

```powershell
py -3.13 -m venv .venv313
.\.venv313\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
if (-not (Test-Path backend\.env.local) -and -not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env.local }
Set-Location frontend
npm install
```

Python 3.13 matches `backend/Dockerfile`. Existing environment files are never overwritten by this setup. The checked-in `.env.example` contains placeholders only; `.env` and `.env.local` are ignored by Git.

Set `VITE_API_URL=http://127.0.0.1:8000` in `frontend/.env.local`. Frontend `.env.local` is a Vite configuration file and is separate from backend settings. For example, from the repository root:

```powershell
if (-not (Test-Path frontend\.env.local)) { Set-Content frontend\.env.local 'VITE_API_URL=http://127.0.0.1:8000' }
```

If the file already exists, inspect/edit only the `VITE_API_URL` entry instead of replacing the file.

## Optional maintenance research and assistant

The local maintenance-tracking score works without external credentials. Research and the assistant require these values in `backend/.env.local` or `backend/.env` (or the production backend process environment):

```dotenv
AI_SEARCH_PROVIDER=tavily
TAVILY_API_KEY=your-tavily-key
AI_RESEARCH_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
GEMINI_RESEARCH_MODEL=your-enabled-gemini-model
```

The research action sends vehicle make/model/year/transmission, current mileage, and summarized maintenance types/dates/mileages/due values to Gemini. Tavily receives vehicle-identity search queries. Neither provider receives account identifiers, receipts, notes, costs, license plates, or VINs. Keep provider keys in the backend environment, never in `frontend/.env.local`.

Provider credentials are optional and blank by default. Do not add them just to start the application. Research calls invoke Tavily and Gemini; chat calls invoke Gemini and may invoke Tavily. Follow [End-to-end verification](12_END_TO_END_VERIFICATION.md) before intentionally making live calls.

## Start the backend

Open a PowerShell terminal at the repository root:

```powershell
.\.venv\Scripts\Activate.ps1
Set-Location backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Run from `backend` so the backend dotenv paths resolve there. If port 8000 is unavailable, select another port and update `VITE_API_URL` to match.

The API is available at `http://127.0.0.1:8000`; interactive API docs are at `http://127.0.0.1:8000/docs`.

## Start the frontend

Open a second PowerShell terminal at the repository root:

```powershell
Set-Location frontend
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. Keep both terminals running while using the app. Stop either server with `Ctrl+C`.

## Backend container (Linux)

From the repository root, the Docker image installs Tesseract and English language data and defaults to production mode. For local verification, follow the explicit isolated build/run commands in [End-to-end verification](12_END_TO_END_VERIFICATION.md); they set `APP_ENV=development`, use a disposable test database, and do not pass provider credentials. New vehicle photos and receipts are stored privately in MongoDB GridFS, so they do not need a persistent upload volume. Keep backups of the production Atlas database because it contains both application records and uploaded file content.

For production, set `CORS_ORIGINS` to the deployed HTTPS frontend origin. The backend's MongoDB user needs permission to read and write the app database, including GridFS collections (`receipt_files.files`, `receipt_files.chunks`, `vehicle_photos.files`, and `vehicle_photos.chunks`). Existing local uploads continue to work while their files remain in `uploads/receipts` or `uploads/vehicle_photos`; new uploads go to GridFS.

The repository has no Compose file. The API Docker image defaults `APP_ENV=production`, so the deployment must provide production MongoDB, JWT, and CORS settings. Local container testing should explicitly set `APP_ENV=development` and use a disposable database as shown in [End-to-end verification](12_END_TO_END_VERIFICATION.md).
