# SmartDrive Consumer MVP Scope

## Release goal

Give an individual vehicle owner one dependable place to manage a vehicle, record service and repair visits, keep receipt files, and see maintenance schedules they have entered.

The MVP establishes clean, trustworthy vehicle history as the foundation for the longer-term AI vehicle intelligence product. It does not claim to assess a vehicle's physical condition or predict failures.

## Target user

An individual vehicle owner who wants to organize vehicle details and maintenance records. The first release is for personal use, not workshops, fleets, or enterprise customers.

## Core user journey

1. Create an account and sign in.
2. Add a vehicle with its identity and current mileage.
3. Record a service or repair, including date, mileage, work, costs, notes, and an optional receipt.
4. Review the vehicle's service history and update or remove incorrect records.
5. See upcoming or overdue schedules when the owner has entered a due date or mileage.

## In scope

- Account registration, login, logout, and access to only the signed-in user's data.
- Vehicle create, view, edit, and delete.
- Service and maintenance record create, view, edit, and delete.
- Per-vehicle service history.
- Receipt upload, preview, and deletion with private access controls.
- Dashboard summary of vehicles, recorded maintenance, and user-entered schedules.
- Optional source-checked maintenance research. This feature requires configured Gemini and Tavily credentials; core vehicle and maintenance workflows remain usable without it.
- Responsive layout for desktop and mobile browser sizes.
- Clear loading, empty, validation, and recoverable error states for the core journey.
- Production hosting for the frontend, API, and database with HTTPS, backups, and basic error monitoring.

## Out of scope for this release

- Physical vehicle health claims or failure predictions. The maintenance score is only a schedule-tracking estimate; research recommendations remain source-cited and advisory.
- Mileage-specific issue predictions beyond source-backed maintenance guidance.
- AI chat, valuation estimates, OBD-II, and machine-learning models.
- Workshops directory, fleet management, enterprise APIs, subscriptions, and paid plans.
- Native mobile apps. A responsive website is sufficient for the first release.

Valuation, OBD-II, AI chat, and failure prediction remain future product directions. LLM research guidance is optional and must remain clearly separate from the rule-based schedule score.

## Navigation and unfinished screens

For the public MVP, show working destinations for Dashboard, Garage, Maintenance/Service History, and optional source-checked Maintenance Research. Keep login and registration available before sign-in. Hide Workshops, Analytics, Fleet, Profile, and Settings until each has a complete, useful flow. Do not present placeholder content as a finished feature. Maintenance Research is separate from the local tracking score and unavailable until Gemini and Tavily backend credentials are configured.

## MVP release checks

The MVP is ready for a limited public release when:

- A new user can complete the core journey without developer help.
- A user cannot read, change, or delete another user's vehicles, records, or receipts.
- Receipt files are not publicly accessible by guessing or sharing a URL.
- Due/upcoming status uses the entered due date or mileage and is labelled as a reminder, not an AI prediction.
- Production secrets, database access, CORS, HTTPS, backups, and error monitoring are configured.
- The critical journey has automated checks and has been verified against the production-like environment.
- Privacy notices and data deletion/retention behavior are decided before real user data is collected.

## Next implementation milestone

Use the current [MVP gap audit](10_MVP_GAP_AUDIT.md) and [project completion roadmap](../PROJECT_COMPLETION.md) to track release verification and remaining core journey coverage.
