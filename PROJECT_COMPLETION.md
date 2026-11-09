# SmartDrive Project Completion

Updated: 2026-11-09

This is the working completion roadmap. “Complete” means locally implemented and verified as described; it does not imply a live production integration has been verified.

## Architecture overview

- **Frontend:** React 19, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind, and shared shadcn-style components. Feature modules live under `frontend/src/features`.
- **Backend:** FastAPI, Pydantic, Motor/MongoDB, bearer sessions, repository/service layers, and owner-scoped routes. Receipt and vehicle-image bytes use private GridFS storage. Local OCR uses Tesseract and PDFium.
- **AI:** The Maintenance page has a rule-based schedule score that is separate from optional research guidance. Research uses Tavily search and Gemini structured extraction, then applies source URL, domain, and vehicle-match validation. Validated profiles are cached in MongoDB.
- **Hosting:** Frontend is configured for Vercel, backend for Render via Docker, and MongoDB Atlas is external. Production credentials, networking, persistence, and provider calls require verification in the user’s deployed environment.

## Feature completion matrix

| Feature | Status | What exists / what remains |
| --- | --- | --- |
| Registration and sign-in | NEEDS VERIFICATION | Password hashing, stored/revocable sessions, auth endpoints and frontend flows exist. Add account/session workflow tests and verify against the deployed database. |
| Vehicle garage and details | NEEDS VERIFICATION | Owner-scoped vehicle CRUD, soft delete, searchable local make/model catalog, responsive forms, private photo storage, and a five-tab vehicle dashboard with real specs, score, mileage chart, service history, research, and receipts exist. Cross-user CRUD, replacement cleanup, and deployed GridFS behavior need broader verification; visual viewport review remains. |
| Service visits and history | NEEDS VERIFICATION | Visit/item CRUD, due schedules, status calculations, desktop table/mobile cards, detail actions, receipt links, and add-service actions exist. Add persistent CRUD and edit/delete consistency tests; verify the browser workflow. |
| Receipts and OCR | NEEDS VERIFICATION | Private GridFS upload, authenticated access, local image/PDF OCR, editable draft, and post-save receipt attach/retry flow exist. Parser and storage unit tests pass; real OCR quality, GridFS persistence, and full save/retry journey need integration verification. |
| Dashboard | NEEDS VERIFICATION | Connected vehicle and maintenance summaries with bounded photos exist. Verify the authenticated journey and empty/error states on desktop/mobile. |
| Rule-based maintenance score | COMPLETE (local logic) | Six areas, saved due schedules, 100/70/30 thresholds, exclusion of missing data, minimum two eligible areas, and non-diagnostic explanation are implemented. It does not use an LLM. UI/browser behavior lacks automated tests. |
| LLM maintenance research | PARTIALLY COMPLETE | Authenticated frontend POST, vehicle/history context, Tavily, Gemini schema output, source and vehicle-match validation, cache expiry/versioning, same-process request deduplication, UI states, and citations are implemented. Backend unit tests cover prompt/history, source validation, cache-key changes, and cached-profile path. Live provider credentials, rate-limit behavior, Mongo cache integration, endpoint authorization, and full UI journey remain unverified. |
| Workshops, analytics, fleet, profile, settings | NOT IMPLEMENTED (deferred) | Placeholder destinations have been removed from navigation and unknown unfinished routes no longer masquerade as working pages. Implement only if included in a later product scope. |
| Production readiness | PARTIALLY COMPLETE | Docker/Vercel/Render configuration, environment guidance, Mongo-pinging health endpoint, and private GridFS design exist. Verify production CORS/secrets, Atlas access, durable backups/restore, monitoring, retention/account deletion policy, and smoke journeys. |

## Initial audit findings

- Auth, garage, service history, receipt/photo GridFS and OCR, and rule-based score were present, but had limited automated coverage.
- Health previously reported MongoDB as healthy without pinging it; maintenance context did not retain the latest service mileage.
- Several linked destinations were placeholders.
- The backend research prototype was not connected to the frontend; its cache service/provider interfaces were mismatched and it omitted saved maintenance history. OpenAI support was unfinished.
- Documentation disagreed on whether the maintenance score and generated guidance were MVP features. The score is now documented as local schedule tracking; LLM research is optional and credential-gated.
- The repository initially had no backend tests and no frontend component-test runner.

## Prioritized roadmap

### Phase 1 — Correctness and safety: COMPLETE

- [x] Make `/health` ping MongoDB and return 503 if unavailable.
- [x] Correct latest maintenance mileage and avoid negative distance for inconsistent odometers.
- [x] Remove unfinished destinations from navigation and show a clear unavailable route.
- [x] Add initial backend unit coverage and clear frontend lint errors.

### Phase 2 — Core journey and data integrity: IN PROGRESS

- [x] Add tests for maintenance due status and creation, receipt file validation/OCR uncertainty/ownership/visit attachment/metadata rollback, vehicle ownership/soft-delete, and photo access/replacement.
- [ ] Add tests for login/logout and session revocation/expiry lookup, service visit edit/delete/history consistency, GridFS integration, and the frontend receipt retry journey.
- [ ] Verify real Tesseract/PDF scan behavior and GridFS round trips against a test database.
- [ ] Verify responsive browser workflows and record a production-like smoke procedure.

**Affected areas:** `backend/app/routes`, `services`, `repositories`, GridFS/OCR modules, and the frontend garage, maintenance, and receipt flows.

**Risks:** MongoDB/GridFS and browser workflows require integration-level setup; do not interpret parser/storage unit tests as proving cloud persistence or OCR accuracy.

**Acceptance:** Critical owner journeys persist after reload; users cannot access other users’ resources; upload/scan/attach retry behavior is recoverable; automated regression checks pass.

### Phase 3 — LLM research integration: IMPLEMENTED LOCALLY, NEEDS LIVE VERIFICATION

- [x] Align provider interfaces and route through the normalized knowledge-cache service.
- [x] Include reduced vehicle history and current mileage in the Gemini prompt without costs or identifying account/vehicle registration data.
- [x] Instruct the model to treat source text as untrusted, not to infer from missing service records, and to use only supplied source evidence.
- [x] Validate exact cited URLs, allowed source domains, and vehicle matches; return normalized structured results only.
- [x] Cache by identity, current mileage, and relevant history for 24 hours; add TTL index and same-process in-flight deduplication.
- [x] Add frontend initiation, timeout/abort handling, duplicate prevention, loading/empty/error states, and source-linked recommendations, separated from the local score.
- [x] Explicitly reject OpenAI configuration because that provider is not implemented.
- [ ] Verify configured Tavily/Gemini calls, timeout/retry behavior, cache read/write/TTL, and authenticated endpoint in a non-production integration environment.

**Affected areas:** `backend/app/ai`, `backend/app/routes/ai.py`, Mongo repository/index, frontend Maintenance page/API/types, `.env.example`, and AI/API docs.

**Risk/limitation:** External calls and provider credentials have not been exercised here. Current allowed source domains are deliberately narrow, so valid research can return empty guidance. Do not market outputs as diagnosis or guaranteed manufacturer service schedules.

**Acceptance:** With credentials configured, owner can request evidence-based guidance; results cite allowed sources and match the selected vehicle; saved history is considered; cache and provider errors are handled without presenting unsupported claims.

### Phase 4 — Release readiness and documentation: IN PROGRESS

- [x] Document current MVP and optional research credential requirements; update API, architecture, database, and local setup docs.
- [x] Replace the basic vehicle detail layout with a URL-backed five-tab ownership dashboard; reuse the rule score and research UI, plot actual dated service mileage, and make the Documents tab manage existing receipts with clear limits.
- [x] Remove the unused, unfinished OpenAI prototype and its direct dependency/configuration so only the actually supported Gemini/Tavily research provider is presented.
- [ ] Reconcile remaining older docs and verify README instructions against current repository behavior.
- [ ] Configure and verify production environment, Atlas access, backups/restore, monitoring, CORS, privacy notice, and data deletion/retention.
- [ ] Run production-like smoke checks for deploy, auth, vehicle/photo, service/receipt, and optional research.

## Verification record

Latest local verification (2026-11-09):

- Backend: `python -B -m unittest discover -s tests -v` — **31 tests passed**.
- Frontend: `npm run lint` — **0 errors, 5 React Hook Form compatibility warnings**.
- Frontend: `npm run typecheck` — passed.
- Frontend: `npm run build` — passed. Vite reports its existing config-loader `__dirname` advisory and a 1.19 MB JavaScript chunk advisory.
- Vehicle details redesign: code/build verified; no authenticated browser viewport test was run, so visual desktop/tablet/mobile acceptance remains unverified.
- Not verified: live Atlas/GridFS, Tesseract/PDFium end-to-end, browser-driven workflows, or Tavily/Gemini calls. The current local Windows asyncio harness is unsuitable for reliable task-creating async integration tests; use a normal CI/runtime test environment for those checks.
- No commits or pushes have been made.

## Execution log

### Initial audit — 2026-11-09

- Inspected the repository structure, README/docs, requirements, config/environment examples, recent commits and Git status, frontend routes/API/features, backend routes/services/repositories, and AI/search integrations before code changes.
- Working tree was clean and aligned with `origin/master` at audit start. No tests existed at that point.

### Phase 1 — 2026-11-09

- Corrected Mongo-aware health, maintenance mileage context, and placeholder routing/navigation. Added initial backend tests and resolved frontend lint errors.

### Phase 2 and Phase 3 implementation — 2026-11-09

- Added local unit coverage for session token storage/lifetimes, maintenance status/create, analyzer history, receipt scan parsing, file signatures/limits, receipt attachment/rollback and ownership, vehicle ownership/soft-delete, photo replacement/access, research prompt/history, source/vehicle validation, cache keys, and cache-hit behavior.
- Implemented the frontend research action and wired it to the authenticated normalized backend result; supplied history context to Gemini and added validated-profile caching.
- Added a lazy provider lookup so a valid cached profile remains available even if external providers are not configured or are temporarily unavailable.
- Replaced the basic vehicle detail page with Overview, Service History, Maintenance, Insights, and Documents tabs. Tabs update the query string for browser history, service-history edit/delete and receipts are retained, mileage chart data comes from recorded service visits only, and the documents view uses the existing receipt APIs.
- Extracted the existing score calculation and presentation for reuse; the redesign keeps the score rules unchanged and keeps Gemini research separate.
- Removed the unreferenced unfinished OpenAI implementation and its direct package/environment settings.
- Updated deployment/API/architecture/database/MVP/local-development documentation. Live services remain unverified pending credentials and test environment.
