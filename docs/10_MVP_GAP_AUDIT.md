# Consumer MVP Gap Audit

Updated: 2026-11-09. This audit reflects the current code review. See the root [PROJECT_COMPLETION.md](../PROJECT_COMPLETION.md) for phase status and verification history.

## Current journey status

| Journey | Current state | Remaining verification |
| --- | --- | --- |
| Register and sign in | Authenticated frontend and backend flows with stored sessions. | Session expiry, account ownership, logout, and production database behavior. |
| Add and manage a vehicle | Owner-scoped CRUD, soft delete, searchable make/model fields, and private GridFS photo flow. | Cross-user CRUD, replacement/removal cleanup, and deployed GridFS round trip. |
| Record service and receipt | Service forms, due schedule, receipt upload/preview/edit/delete, editable OCR draft, and retry path after visit save. | Full persistence, OCR quality, and upload/retry workflow against a test runtime/database. |
| Review service history | Connected history with timeline and maintenance table/detail action. | Edit/delete consistency, empty/error states, and browser workflow. |
| Review reminders and tracking score | Saved schedule status and local six-area score with missing-data handling. | UI threshold/state coverage and responsive browser journey. |
| Request maintenance research | Optional authenticated frontend action backed by Tavily/Gemini, source/vehicle checks, history-aware prompt, and MongoDB cache. | Provider credentials/rate limits, cache persistence/TTL, endpoint authorization, and live UI journey. |

## Remaining release gaps

### P0 — Verify before collecting more real data

- Exercise owner scoping across vehicles, service visits, receipts, photos, and AI routes. Existing receipt cross-user/mismatch tests pass; other object paths need coverage.
- Confirm Atlas backup and restore, GridFS file persistence, and privacy/retention/account deletion behavior.
- Ensure production secrets and CORS origins are configured in Render/Vercel/Atlas and never stored in Git.

### P1 — Required for a confident release

- Add automated account/session, vehicle ownership/soft-delete, visit CRUD, photo authorization, receipt retry, and core workflow coverage.
- Verify local OCR with representative JPEG/PNG/WEBP/PDF receipts; unit tests validate parser and file checks, not OCR accuracy.
- Verify Tavily/Gemini using test credentials, including provider failure, timeout, no-source, cache, and authenticated access cases. Research is optional and must remain distinct from the local tracking score.
- Run mobile/desktop browser smoke checks and establish monitoring and deployment failure visibility.
- Reconcile remaining broad/aspirational README sections with implemented scope when preparing a public release.

### P2 — Deferred product work

Workshops, analytics, fleet management, account profile/settings, valuation, OBD-II, AI chat, and predictive failure modeling are not part of the currently working consumer journey. Do not advertise them as implemented.
