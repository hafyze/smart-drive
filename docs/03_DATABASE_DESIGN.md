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
