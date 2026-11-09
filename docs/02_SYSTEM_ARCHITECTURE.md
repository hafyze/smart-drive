# System Architecture

## Frontend

React

↓

React Query

↓

Axios

↓

REST API

## Backend

FastAPI Route

↓

Service

↓

Repository

↓

MongoDB

## AI

Authenticated FastAPI research action

↓

Owner-scoped vehicle identity + reduced saved-maintenance summary

↓

Tavily evidence search → Gemini structured extraction

↓

Exact search-URL allow-list + source-domain and vehicle-match validation

↓

Identity/history-keyed MongoDB cache with 24-hour expiry

↓

Frontend source-cited guidance, separate from the local maintenance score

The local score uses saved schedules only and does not call external AI providers.

## Predictive preventive maintenance (Phase 3)

Authenticated Insights action

↓

Owner-checked vehicle context + bounded item-level service history (no notes, costs, receipts, VIN or registration)

↓

Deterministic backend candidate selection (maximum three; overdue/upcoming recorded schedules and service-history context prioritized)

↓

Candidate-specific Tavily searches → Gemini structured evidence analysis

↓

Exact search-result quote check + existing source allowlist and vehicle-match validation

↓

Backend-assigned attention category → user/vehicle/identity/mileage/history/version scoped 24-hour report cache

The categories describe attention to saved schedules or validated evidence and are not component failure probabilities. The existing maintenance score and conversation assistant remain separate.

## Preventive maintenance planner (Phase 4)

Authenticated client

↓
Owner- and active-vehicle-scoped plan service

↓
Latest saved due targets + bounded cached Phase 3 report + owner-created actions

↓
Draft review → explicit approval → scheduled/in-progress → complete, skip, cancel, or archive

↓
Optional confirmed completion → existing service-history writer with a unique planner-action link

Plans and actions are stored as one bounded `maintenance_plans` aggregate per plan. A partial unique index permits at most one ACTIVE plan per user and vehicle. A separate unique partial index on `maintenance.maintenance_action_id` makes service-visit creation idempotent. The planner does not call Gemini or Tavily while generating a plan; it reads only an eligible cached predictive report. Reminders are evaluated on planner reads and are not background notifications.
