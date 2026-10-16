# Consumer MVP Gap Audit

This audit compares the current code with the journey in [09_MVP_SCOPE.md](09_MVP_SCOPE.md). It is a code review only; no build or automated checks have been run.

## Journey status

| Journey step | Current state | Gap to close |
| --- | --- | --- |
| Register and sign in | Registration, login, current-user lookup, and logout flows exist. | Verify session expiration, logout behavior, and the full flow in a production-like environment. |
| Add and manage a vehicle | Garage list, add/edit dialogs, detail page, and backend vehicle CRUD exist. | Confirm delete behavior for attached service visits and receipts; define whether deletion cascades or is blocked. |
| Record a service and receipt | Maintenance CRUD and receipt upload, preview, edit, and delete components exist. | Receipt delivery is currently public static serving; make receipts private before release. Validate uploaded file content and production persistence. |
| Review service history | A per-vehicle history route and timeline exist. | Verify useful empty/error states and that history remains consistent after editing/deleting records. |
| See upcoming/overdue reminders | Backend computes status from entered due date/mileage and current vehicle mileage; dashboard summary exists. | Verify labels and edge cases in UI; describe these as reminders based on entered schedules, not AI recommendations. |

## Prioritized gaps

### P0 — Resolve before real user data

- **Make receipt files private. (Implemented; release verification pending.)** Public `/uploads` static serving has been removed. Receipt previews now request an authenticated API endpoint that checks receipt ownership before returning the file. Verify access denial for another user's receipt, and migrate any existing files/URLs if they are important.
- **Require safe production configuration.** `backend/app/core/config.py` has development defaults for the MongoDB URI, JWT secret (`change-later`), and localhost CORS origins. Production startup should fail if required secrets/settings are missing; configure only the actual frontend origin and use a production database credential with least privilege.
- **Define vehicle deletion behavior.** `backend/app/services/vehicle_service.py` deletes the vehicle document only. Decide whether to cascade-delete related visits/receipts, soft-delete, or prevent deletion until the user confirms data removal; implement the choice consistently.

### P1 — Close before public launch

- **Remove unfinished destinations from the owner navigation.** `frontend/src/shared/constants/Navigation.ts` exposes AI Maintenance, Workshops, Analytics, Profile, and Settings. Several corresponding pages are placeholders or outside the MVP. Keep only working MVP destinations visible; direct routes should also show a clear unavailable/not-found state where appropriate.
- **Make health checks truthful.** `backend/app/routes/health.py` always reports `database: connected`. Check the actual database connection and return an unhealthy status when the API cannot serve requests reliably.
- **Make uploaded-file validation production safe.** `backend/app/services/receipt_storage_service.py` reads the whole upload into memory and trusts the request content type. Enforce request/body limits while streaming and verify file signatures before storing.
- **Plan for durable receipt storage.** Uploads currently go to a local `uploads/receipts` directory. Use persistent private storage appropriate to the deployment platform and include a backup/restore plan.
- **Verify authorization across every object route.** Vehicle ownership checks exist in service code, and receipt operations are user-scoped. Review service visits, receipts, and AI endpoints for both user ownership and cross-vehicle ID mismatches, then cover those cases with automated checks.
- **Complete release verification.** Add automated coverage for account access, the full owner journey, schedule status, unauthorized object access, upload limits, and file privacy. Run the frontend production build and backend checks in CI before deployment.
- **Confirm small-screen usability.** The app has responsive layout classes, but verify the complete owner journey on mobile widths, including sidebar navigation, dialogs, and receipt preview.
- **Decide account recovery and privacy behavior.** Before collecting real accounts and invoices, decide password recovery, account/data deletion, retention, privacy notice, and support contact behavior.

### P2 — After the first stable release

- Add AI maintenance research and recommendations only after source quality, vehicle matching, rate limits, and clear uncertainty labels are defined.
- Add valuation, vehicle-health scoring, workshops, fleet features, subscriptions, and PWA/mobile enhancements as separate product milestones.

## Suggested implementation order

1. Fix receipt privacy and establish production configuration requirements.
2. Decide and implement vehicle deletion semantics.
3. Trim navigation and make the MVP screens consistent.
4. Correct health checks and upload validation/storage.
5. Add critical-path automated checks and run build/deployment verification.
6. Do a mobile and privacy-readiness pass before opening registration publicly.
