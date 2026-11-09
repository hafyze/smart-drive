# SmartDrive Integration Readiness and Verification

This runbook uses disposable local data. Do not point the integration suite at Atlas, Render, production, or any database containing user data. The Mongo integration test module accepts loopback hosts only and requires a database name starting with `smartdrive_test_`.

## Configuration and precedence

Backend configuration is loaded by Pydantic Settings from the current working directory:

1. Constructor settings (tests/tools only).
2. Process environment variables.
3. `backend/.env.local`.
4. `backend/.env`.
5. Code defaults.

The frontend separately loads `frontend/.env.local` through Vite. `VITE_*` values are public build-time configuration; never put provider keys or database credentials there.

The backend only enters production mode when `APP_ENV=production` is set in the process environment (or explicitly as an initialization argument). Production mode skips `.env` and `.env.local`. A dotenv file cannot switch the backend into production mode. The Dockerfile now defaults `APP_ENV=production`; local Docker QA explicitly overrides it to `development`. Hosting providers must inject `MONGODB_URI`, `MONGODB_DATABASE`, `JWT_SECRET`, and `CORS_ORIGINS` through their secret/environment settings.

Copy `backend/.env.example` to `backend/.env.local` only when you need local settings and no local backend env file exists. Edit the file locally; do not paste credentials into tickets, chat, shell commands, frontend files, or logs. The example contains placeholders only.

Required backend settings:

| Name | Purpose |
| --- | --- |
| `APP_ENV` | `development`, `test`, or `production`; production must be selected outside dotenv files. |
| `MONGODB_URI` | Local or isolated development/test MongoDB URI. |
| `MONGODB_DATABASE` | Database name; integration database must begin `smartdrive_test_`. |
| `JWT_SECRET` | Local placeholder in development; unique 32+ character secret in production. |
| `CORS_ORIGINS` | JSON array of allowed frontend origins. |
| `AI_RESEARCH_PROVIDER` | `gemini` for supported research generation. |
| `GEMINI_API_KEY` | Optional until intentionally testing live AI. |
| `GEMINI_RESEARCH_MODEL` | A Gemini model enabled for the configured key. |
| `AI_SEARCH_PROVIDER` | `tavily` for supported search. |
| `TAVILY_API_KEY` | Optional until intentionally testing live search. |
| `TAVILY_SEARCH_DEPTH` | Search depth; defaults to `advanced`. |
| `TAVILY_MAX_RESULTS` | Integer from 1 to 5 per query. |

`GEMINI_API_KEY` and `TAVILY_API_KEY` are not required to start the app. A maintenance research request calls Tavily and Gemini; a chat message always calls Gemini and may call Tavily. Do not initiate a live check until you intend those provider calls and have chosen a test vehicle.

## Start local development

Use Python 3.13 to match the Docker image. These commands do not overwrite existing env files:

```powershell
py -3.13 -m venv .venv313
.\.venv313\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
if (-not (Test-Path backend\.env.local) -and -not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env.local }
```

Set `MONGODB_URI=mongodb://127.0.0.1:27018/?directConnection=true` and `MONGODB_DATABASE=smartdrive_dev` in the local backend env file. Set `VITE_API_URL=http://127.0.0.1:8000` in `frontend/.env.local`.

Start the backend in one PowerShell window:

```powershell
Set-Location backend
..\.venv313\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend in another window:

```powershell
Set-Location frontend
npm install
npm run dev
```

The frontend defaults to Vite's printed local URL (usually port 5173); backend API docs are at `http://127.0.0.1:8000/docs`.

## Start an isolated MongoDB instance

The repository has no Compose file. With Docker Desktop running, start a disposable MongoDB container bound only to loopback. It has no mounted volume and is removed when stopped:

```powershell
docker run --rm --detach --name smartdrive-mongo-test --publish 127.0.0.1:27018:27017 mongo:7 --bind_ip_all
```

Wait for readiness, then use a separate test database name. Example local test configuration:

```text
MONGODB_URI=mongodb://127.0.0.1:27018/?directConnection=true
MONGODB_DATABASE=smartdrive_test_local
```

The app creates the required cache/conversation indexes on startup. To stop and discard this test database:

```powershell
docker stop smartdrive-mongo-test
```

### Run real MongoDB repository integration tests

Keep the Mongo test container running. From `backend`, use a test-only URI and the required database prefix:

```powershell
$env:SMARTDRIVE_MONGO_TEST_URI = 'mongodb://127.0.0.1:27018/?directConnection=true'
$env:SMARTDRIVE_MONGO_TEST_DATABASE = 'smartdrive_test_local'
..\.venv313\Scripts\python.exe -B -m unittest discover -s tests\integration -v
Remove-Item Env:SMARTDRIVE_MONGO_TEST_URI
Remove-Item Env:SMARTDRIVE_MONGO_TEST_DATABASE
```

The suite rejects non-loopback hosts and non-test database names. It creates uniquely identified owner/vehicle/conversation/cache/limit records and deletes only those test records. It does not drop the database or collections. It checks persisted conversations/turns through a new repository instance, owner/vehicle query isolation, context builder ownership/history isolation, cache schema/expiry/scoping, cooldown and daily quota persistence, retention filtering/refresh, and TTL/unique indexes. Running against a real Mongo service is distinct from the mocked unit suite.

To exercise application restart restoration, start the backend on this test database, create a conversation using a test account/vehicle, stop and restart the backend, then refresh the same Insights URL and verify the conversation and completed messages remain. The repository test's new-instance read checks persistence but does not simulate an OS process restart.

## Manual live Gemini/Tavily verification

This procedure makes real provider calls and may incur usage charges. It is intentionally manual; automated test commands do not call live providers.

1. Confirm the backend is using a disposable test database and a dedicated test account/vehicle.
2. Add valid `GEMINI_API_KEY`, `GEMINI_RESEARCH_MODEL`, and `TAVILY_API_KEY` to `backend/.env.local` or export them in the backend process environment. Keep them out of terminal command text and frontend configuration.
3. Restart the backend and verify no secret values appear in its startup logs.
4. In the browser, run one explicit maintenance research request for a test vehicle. Verify a structured profile is returned, source URLs use allowed domains, vehicle match is present, and a second request within 60 seconds is limited with 429/`Retry-After` (unless a cache hit applies).
5. Ask one records-only assistant question and one external-evidence question. Verify record references match the selected vehicle, research claims cite exact accepted sources, and no unsupported citation is rendered.
6. Confirm chat limit behavior only if safe; the configured limit is 20 attempted answers per user per UTC day and a 10-second per-user/vehicle cooldown. Do not burn the daily allowance merely to test it; repository behavior is covered by mocks and real Mongo limit persistence is covered by the opt-in integration suite.
7. Remove local credentials when the manual run is complete. Never paste raw provider responses or secret-bearing logs into the report.

The Gemini client uses structured JSON responses, a 35-second per-call timeout, and one retry for retryable 503 responses. Total research/chat work is wrapped in a 110-second deadline. Tavily limits chat searches to three queries and research input/results are bounded. Provider exceptions are returned generically to clients; application logs avoid logging query/result contents and provider exception text. Mocked tests cover configuration, response parsing, retry wiring and failure paths; live behavior remains unverified until this procedure is completed.

## Authenticated browser verification checklist

Use two dedicated test accounts and at least two synthetic vehicles (for example, different test make/model, engine, mileage and service records). Do not use another person's real data. In the browser network panel, confirm API requests target the local backend and are authenticated; do not export tokens.

1. Log in as test account A.
2. Open Garage and select test vehicle A1.
3. Open Vehicle Details → Insights and confirm displayed vehicle identity/mileage.
4. Open Research guidance and explicitly start research only if live credentials have been intentionally configured.
5. Switch to AI Assistant; check empty/loading state, saved chat selector, suggestions, and disabled duplicate-submit behavior.
6. Ask a record-only question about a known synthetic service item. Verify the returned record belongs to A1.
7. Ask a vehicle-specific external question. Verify each displayed claim links to a returned source; open a source and confirm the URL is the one shown.
8. Refresh the page and confirm the `conversationId` URL restores the selected conversation and messages.
9. Create a second chat, switch between chats, and verify saved turns restore.
10. Switch to vehicle A2 with different synthetic specs/history. Confirm no A1 turns, records or pending response appear; submit a distinct question and verify A2 context.
11. Log in as test account B in a separate browser profile. Attempt to use A1's vehicle ID and conversation ID through the UI/API. Verify access is rejected (conversation lookup should be 404; vehicle access is denied/not found according to route behavior) and no provider call occurs.
12. Delete one conversation with the confirmation dialog. Verify it disappears, its messages are unavailable after refresh, and the other conversation remains.
13. Exercise empty results, provider-offline error, retry with the same idempotency ID, and slow/loading behavior using a test-only provider stub or controlled test environment. Avoid repeatedly calling paid providers to simulate errors.
14. Test phone/tablet/desktop widths and verify citation links, chat switching and message entry remain usable.

Record results separately from helper tests. The current frontend test runner covers data/API helpers, not the browser interactions above.

## Phase 3 predictive maintenance checks

Use only an isolated test account and synthetic vehicle data. These checks require a valid test vehicle and manual provider authorization; standard automated tests do not make paid provider calls.

1. Open a vehicle's Insights → Predictive maintenance. Confirm a cache miss displays an explicit run action and makes no provider call until clicked.
2. Seed one overdue and one future due schedule for different components. Run research and verify only the scheduled overdue component is marked `Schedule overdue`/`HIGH_PRIORITY`, with text saying this reflects the recorded schedule and not physical condition. Verify the future schedule is `Monitor` with its entered due value.
3. Leave another component without a history record. Confirm it is described as unknown, never as never replaced.
4. Review each research card: the exact displayed excerpt must appear in supplied result text; each linked URL must be one of that component's search results and pass the allowed-domain and vehicle-match rules. Unsupported/mismatched sources should yield `Insufficient data`.
5. Refresh the page and verify cache restoration without provider calls. Use Refresh research only as an explicit action and verify the shared per-user/per-vehicle cooldown returns 429 with `Retry-After` during the limit window.
6. Change mileage, vehicle identity or a saved matching service record, then confirm a stale cache key is not served. Switch to a second synthetic vehicle and verify its report/source/history does not show the first vehicle's data.
7. Confirm no probability, diagnosis, maintenance record, or reminder is created, and verify the existing maintenance score is unchanged.

These results must be recorded separately from mock tests. Current automated UI checks cover API paths/cache miss only; they do not render or operate the panel in a browser.

## Docker/Python 3.13 verification

The Dockerfile uses `python:3.13-slim`, installs Tesseract and English language data, and installs pinned backend requirements. No Compose file is present. With Docker Desktop and the disposable Mongo container available, from the repository root:

```powershell
docker build -f backend/Dockerfile -t smartdrive-api:qa .
docker run --rm --entrypoint python smartdrive-api:qa --version
docker run --rm --name smartdrive-api-qa --publish 127.0.0.1:8000:8000 `
  -e APP_ENV=development `
  -e MONGODB_URI='mongodb://host.docker.internal:27018/?directConnection=true' `
  -e MONGODB_DATABASE='smartdrive_test_local' `
  -e JWT_SECRET='local-qa-only-secret-change-this-0123456789' `
  -e CORS_ORIGINS='["http://localhost:5173"]' `
  smartdrive-api:qa
```

This starts without provider keys and therefore does not trigger paid calls. In another window, request `http://127.0.0.1:8000/health` and check that the service responds healthy. Stop with Ctrl+C. Do not use an Atlas or production URI in this procedure. `docker build` plus container startup/health are required before marking Docker/Python 3.13 verified; local Python 3.14 tests do not count as Docker verification.

## Verification record template

| Category | Required evidence | Status |
| --- | --- | --- |
| Automated mocked tests | Backend unittest and frontend test/typecheck/lint/build logs | Record separately; does not prove live integration. |
| Real MongoDB integration | Opt-in integration suite against loopback `smartdrive_test_*`; restart/browser persistence check | Not verified until explicitly run with MongoDB available. |
| Live Gemini/Tavily | Manual provider calls with dedicated credentials and synthetic data; source validation and failure behavior | Do not trigger automatically; record only after manual execution. |
| Authenticated browser | Checklist above using dedicated accounts/vehicles | Not covered by current helper tests. |
| Docker/Python 3.13 | Successful build, Python version, backend startup and health with isolated MongoDB | Not verified by local Python 3.14 runs. |
