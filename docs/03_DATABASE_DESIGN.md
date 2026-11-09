# Collections

## users

...

## vehicles

...

## service_history

...

## maintenance_checklists

...

## ai_recommendations

...

## receipts

...

## maintenance_knowledge

Stores normalized source-validated maintenance profiles. Each cache record is keyed by a hash of vehicle identity, current mileage, and the reduced maintenance summary. `expires_at` is indexed with MongoDB TTL cleanup; the application also checks expiry and schema version before use. The profile cache contains no user ID, registration data, receipt content, service notes, or recorded costs.

The same collection stores Phase 3 predictive reports in a separate hashed-key namespace. Its cache key is scoped to the authenticated user and vehicle and incorporates identity/engine, current mileage, bounded component service history, knowledge model version, revision, and research schema version. The stored report contains up to three candidates and only accepted source references and record descriptions/dates/mileage/due values; it excludes user ID, VIN, registration, receipts, notes and costs. Automated research entries are marked unreviewed, traceable to source URLs and retrieval timestamps, and expire after 24 hours. The current `maintenance_knowledge` TTL/index is reused; no new permanent knowledge platform or Mongo collection was added.

## maintenance_plans (Phase 4)

Stores a bounded plan aggregate: owner ID, vehicle ObjectId, plan status/version/horizon, and up to 200 embedded actions. Each action carries its UUID, owner/vehicle/plan IDs, idempotency event key, source/type/status, targets, explicit completion data, optional reminder settings/history, status history, and an optional linked service visit ID. Research entries keep the source title, validated URL, and source-matched excerpt used for review. A plan is never populated from a live provider call.

Indexes:

- `{ user_id: 1, vehicle_id: 1, updated_at: -1 }` for owner-scoped plan listing.
- Unique partial `{ user_id: 1, vehicle_id: 1 }` where status is `ACTIVE`, to prevent concurrent active plans.
- Unique partial `maintenance.maintenance_action_id` for string values, to prevent duplicate service visits from completion retries.

Archiving a plan preserves all embedded actions and service history. Reminder thresholds and dismissal events are stored in the action; no separate notification queue exists.
