# Local Development

These commands use Windows PowerShell from the repository root. The backend defaults to MongoDB at `127.0.0.1:27017`; start a local MongoDB service first, or change `MONGODB_URI` in `backend/.env` to your database connection string.

Receipt scanning needs the Tesseract OCR executable available as `tesseract` on `PATH`, with English (`eng`) language data installed. On Windows, install Tesseract from the [UB Mannheim Windows builds](https://github.com/UB-Mannheim/tesseract/wiki), add its installation directory to `PATH`, then reopen PowerShell. Check the setup with `tesseract --version` and `tesseract --list-langs`.

## One-time setup

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
Set-Location frontend
npm install
```

Set `VITE_API_URL=http://127.0.0.1:8000` in `frontend/.env.local`. For example, from the repository root:

```powershell
Set-Content frontend\.env.local 'VITE_API_URL=http://127.0.0.1:8000'
```

## Start the backend

Open a PowerShell terminal at the repository root:

```powershell
.\.venv\Scripts\Activate.ps1
Set-Location backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at `http://127.0.0.1:8000`; interactive API docs are at `http://127.0.0.1:8000/docs`.

## Start the frontend

Open a second PowerShell terminal at the repository root:

```powershell
Set-Location frontend
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. Keep both terminals running while using the app. Stop either server with `Ctrl+C`.

## Backend container (Linux)

From the repository root, build and run the API container. The image installs Tesseract and English language data. Supply the backend environment variables, including the MongoDB URI and a production-safe JWT secret. New vehicle photos and receipts are stored privately in MongoDB GridFS, so they do not need a persistent upload volume. Keep backups of the Atlas database because it now contains both application records and uploaded file content.

```powershell
docker build -f backend/Dockerfile -t smart-drive-api .
docker run --rm -p 8000:8000 `
  -e MONGODB_URI='mongodb://host.docker.internal:27017' `
  -e MONGODB_DATABASE='autocare' `
  -e JWT_SECRET='replace-with-a-unique-secret-of-at-least-32-characters' `
  -e CORS_ORIGINS='["http://localhost:5173"]' `
  smart-drive-api
```

For production, set `CORS_ORIGINS` to the deployed HTTPS frontend origin. The backend's MongoDB user needs permission to read and write the app database, including GridFS collections (`receipt_files.files`, `receipt_files.chunks`, `vehicle_photos.files`, and `vehicle_photos.chunks`). Existing local uploads continue to work while their files remain in `uploads/receipts` or `uploads/vehicle_photos`; new uploads go to GridFS.
