# Vehicle API

GET /vehicles

Purpose

Return all vehicles belonging to the authenticated user.

Authentication

Required

Response

200

[
]

## AI maintenance research

POST `/ai/research/{vehicle_id}`

Authentication is required. The endpoint checks vehicle ownership and soft-delete status, then searches for vehicle maintenance evidence, asks Gemini for structured extraction, validates cited URLs and vehicle match, and returns a normalized guidance profile. It considers current mileage and summarized saved maintenance history. Validated results are cached for 24 hours using the authenticated user, vehicle, identity, mileage, and relevant history. Cache hits bypass provider calls and the research cooldown.

The route returns HTTP 429 with a `Retry-After` header when a provider-backed cache miss was requested within 60 seconds of the user's previous request for that vehicle. The cooldown is stored in MongoDB and fails closed if the storage operation fails. It returns HTTP 503 when AI provider configuration is unavailable, HTTP 504 on the overall research deadline, and HTTP 502 for other upstream research failures. Provider failure details are not returned to clients. An empty `guidance` list means no recommendation passed the evidence checks.

GET `/ai/research/{vehicle_id}/cached`

Authentication and vehicle ownership are required. This endpoint only reads the current valid profile for the authenticated user's vehicle and returns HTTP 204 on a cache miss. It never runs Tavily or Gemini, so the UI can restore a prior result after refresh without silently making provider requests. Cached entries are schema-versioned and expire after 24 hours.

The backend bounds Tavily results and Gemini prompt content before sending provider requests. Sources must explicitly match vehicle make and model; supplied year, variant, or transmission information must also be compatible. Only cited HTTP(S) URLs on allowed domains are returned.

Required backend settings: `AI_SEARCH_PROVIDER=tavily`, `TAVILY_API_KEY`, `AI_RESEARCH_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_RESEARCH_MODEL`. OpenAI research is not supported.

## Vehicle conversational assistant

All conversation endpoints require the bearer-authenticated user. The backend verifies that the vehicle is active and belongs to the caller; conversation reads, writes, and deletion also match the authenticated user and vehicle. A conversation ID from another owner or vehicle returns 404. The assistant has no vehicle or maintenance mutation operations.

- `POST /ai/vehicles/{vehicle_id}/conversations` — create an empty conversation; returns `ConversationSummary` (201).
- `GET /ai/vehicles/{vehicle_id}/conversations` — list unexpired conversations for that vehicle, newest activity first.
- `GET /ai/vehicles/{vehicle_id}/conversations/{conversation_id}` — return conversation metadata and completed turns.
- `DELETE /ai/vehicles/{vehicle_id}/conversations/{conversation_id}` — permanently delete that conversation and its turns (204).
- `POST /ai/vehicles/{vehicle_id}/conversations/{conversation_id}/messages` — submit `{ "client_message_id": "<UUID>", "content": "<question>" }`; returns the saved user turn and structured assistant answer.

The assistant response separates exact saved maintenance records from external researched claims and AI interpretation. Each external claim carries the exact source URLs supporting it; only URLs from the supplied Tavily results or the still-valid vehicle research cache that pass the existing allowlist and vehicle match checks are returned. Record references are resolved by the backend against the selected vehicle's bounded history, so model-generated record details are not trusted as facts. Missing service history is unknown, not proof that work was not performed.

Questions are limited to 1,500 characters, up to the latest eight exchanges are sent as conversation history, at most 60 recent service items are included, and the assembled prompt is capped at 32,000 characters. Each conversation allows at most 100 submitted turn attempts (failed attempts count toward this limit). Gemini decides whether external research is needed; Tavily receives at most three queries. A Tavily failure may fall back to a records-only answer with an explicit limitation. Gemini is required for both records-only and research answers.

Conversation metadata and messages are stored in separate MongoDB collections. They expire 90 days after the last successful activity; successful activity refreshes expiry for the conversation and its turns. Deleting a conversation immediately removes its stored turns. MongoDB TTL indexes enforce cleanup. Usage is limited to 20 attempted provider-backed answers per authenticated user per UTC day and a 10-second per-user/per-vehicle cooldown. Cache-independent quota or cooldown failures return 429 with `Retry-After`; limit-storage failures fail closed. Backend requests have a 110-second deadline; the frontend allows 120 seconds. Provider errors are returned generically and message text is not logged.

## Predictive preventive maintenance (Phase 3)

- `GET /ai/predictive-maintenance/{vehicle_id}/cached` — return a currently valid cached report, or HTTP 204. Requires authentication and active vehicle ownership; performs no provider calls.
- `POST /ai/predictive-maintenance/{vehicle_id}` — run research or return the cache. Body: `{ "refresh": false }`; setting `refresh` to true bypasses the cache and explicitly runs a fresh research attempt. Requires authentication and active vehicle ownership.

Candidate selection is deterministic and bounded to three components. It reserves at most one slot for a recorded overdue schedule (or, if none, one upcoming schedule), then uses available slots for service-history candidates and general lookups. Other overdue items remain handled by the normal Maintenance UI and cannot crowd every predictive search slot. The report includes recorded item dates, mileage, maintenance type/description and due values; visit notes, item notes/costs, receipts, VIN, registration and account data are excluded. No service record means unknown, not never replaced. The current maintenance-score calculation is not used to assign predictive categories and is unchanged.

Tavily searches a backend-generated query per selected candidate (at most three); Gemini returns only candidate keys, exact result URLs and excerpt text. The backend accepts an excerpt only when it exactly occurs in that candidate's supplied search result and a URL passes the existing domain and vehicle-match validator. This text match is not proof of the source's technical accuracy or semantic support. Engine- or generation-specific matches are rejected if the vehicle's known engine/generation disagrees or is absent. The backend assigns categories: an overdue saved schedule is `HIGH_PRIORITY` with schedule-only wording; a future recorded schedule is `MONITOR`; source-matched excerpts are also `MONITOR`; missing/invalid evidence is `INSUFFICIENT_DATA`. Automated reports do not assign `INSPECT`; snippets alone cannot establish that inspection is appropriate. These labels are not statistical failure probabilities or diagnosis. Automated research entries are versioned and marked `UNREVIEWED_AUTOMATED_RESEARCH`.

Reports use the existing `maintenance_knowledge` collection and TTL index, a distinct predictive namespace, an identity/mileage/history/user/vehicle/version hash, and a 24-hour lifetime. Explicit refreshes use the existing Mongo-backed per-user/per-vehicle research cooldown and therefore share its 60-second limit with other research for the same vehicle. Cache hits bypass the cooldown. Provider-backed research remains user-triggered; no external provider is called on the cache-only route. Live Gemini/Tavily, real MongoDB persistence and authenticated browser journeys remain unverified unless separately run in an isolated environment.

## Preventive Maintenance Planner (Phase 4)

All endpoints require bearer authentication and validate the caller's active vehicle ownership through the plan and action hierarchy. IDs supplied by the client are not trusted as standalone authorization.

- `GET /maintenance-plans/vehicles/{vehicle_id}` — list plans for the owned vehicle.
- `GET /maintenance-plans/vehicles/{vehicle_id}/timeline` — return the vehicle's plan actions, sorted by recorded date/mileage targets.
- `POST /maintenance-plans/vehicles/{vehicle_id}/generate` — create/update a draft using horizons 3, 6, or 12 months and optional `expected_monthly_mileage` (1–20,000). This reads saved schedules and a valid cached predictive report; it does not call providers.
- `GET /maintenance-plans/{plan_id}` — retrieve an owner-scoped plan.
- `POST /maintenance-plans/{plan_id}/approve` — approve `action_ids` (omit to approve all proposals). A draft becomes active; remaining proposals can be approved later.
- `POST /maintenance-plans/{plan_id}/archive` — archive without removing history.
- `POST /maintenance-plans/{plan_id}/actions` — add a user-created Proposed action to a draft or active plan.
- `PATCH /maintenance-plans/{plan_id}/actions/{action_id}` — edit allowed action fields.
- `POST /maintenance-plans/{plan_id}/actions/{action_id}/review` — accept or reject a proposal.
- `POST /maintenance-plans/{plan_id}/actions/{action_id}/reschedule` — set a date/mileage target or appointment date with a reason.
- `POST /maintenance-plans/{plan_id}/actions/{action_id}/skip` — skip with a reason; `/restore` restores a skipped action.
- `POST /maintenance-plans/{plan_id}/actions/{action_id}/cancel` — cancel with a reason.
- `POST /maintenance-plans/{plan_id}/actions/{action_id}/start` — mark approved work in progress.
- `POST /maintenance-plans/{plan_id}/actions/{action_id}/complete` — record owner-confirmed work and optionally create one linked existing service visit using `create_service_record: true`.
- `POST /maintenance-plans/{plan_id}/actions/{action_id}/reminder` — enable/disable date and/or mileage thresholds.
- `POST /maintenance-plans/{plan_id}/actions/{action_id}/reminder/dismiss` — persist dismissal.

The timeline/calendar is derived from saved actions. Reminders are checked when the planner loads; scheduled background, email, and push delivery are not implemented. See the README and `PROJECT_COMPLETION.md` for verification and current limitations.
