# 🚗 AI Vehicle Intelligence Platform

> An AI-powered vehicle intelligence platform that analyzes **service history, mileage, and vehicle information** to provide personalized maintenance recommendations, vehicle health insights, and vehicle valuation.

## Overview

The **SmartDrive** is a vehicle management and intelligence system designed to help vehicle owners understand the condition and maintenance needs of their vehicles.

Unlike a conventional vehicle maintenance tracker that only records service history or sends fixed reminders, this project aims to turn a vehicle's historical data into **personalized, actionable insights**.

The core concept is:

```text
Vehicle Information
        +
Current Mileage
        +
Service & Repair History
        ↓
AI Vehicle Intelligence
        ↓
┌───────────────────────────────┐
│ Vehicle Health Summary        │
│ Preventive Maintenance        │
│ Mileage-Specific Issues       │
│ Maintenance Insights          │
└───────────────────────────────┘
```

The long-term vision is to develop the platform into three areas:

* **Consumer AI Vehicle Assistant**
* **Fleet Maintenance & Intelligence Platform**
* **Enterprise Vehicle Intelligence APIs**

---

# 🎯 Core Concept

The primary objective of this project is to answer questions that a vehicle owner normally has to figure out themselves:

### What has happened to my car?

Analyze the vehicle's recorded service and repair history.

### How well has my car been maintained?

Generate an estimated vehicle maintenance health score based on the available evidence.

### What should I maintain next?

Identify preventive maintenance that may be due based on mileage, previous maintenance, vehicle characteristics, and technical knowledge.

### What should I watch out for at this mileage?

Identify common maintenance considerations and known issues associated with the vehicle, engine, transmission, and mileage range.

### How much is my car worth?

Use a machine learning model to estimate the vehicle's market value based on relevant vehicle characteristics.

---

# ✨ Key Features

## 🔧 AI Maintenance Assistant

The AI Maintenance Assistant analyzes a user's vehicle information and service history to provide personalized maintenance guidance.

### Current implementation

The Maintenance page keeps two features separate:

* **Maintenance tracking score:** a local, rule-based average of saved next-due schedules. It is not an LLM prediction or a mechanical diagnosis.
* **Research-based guidance:** an optional backend action that searches with Tavily, asks Gemini to extract structured maintenance recommendations, and returns only guidance that passes source and vehicle checks. It uses make/model/year/transmission, current mileage, and a reduced summary of saved service records. It does not send account identifiers, receipts, plate numbers, VINs, service notes, or recorded costs.

The research feature requires `AI_SEARCH_PROVIDER=tavily`, `TAVILY_API_KEY`, `AI_RESEARCH_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_RESEARCH_MODEL` in the backend environment. It is unavailable until those are configured. A cache-only request can restore valid research after refresh without calling providers; provider-backed research is user-triggered and limited to one cache miss per user/vehicle per 60 seconds. OpenAI research is not implemented. The rule-based score never calls external AI providers.

The research prompt receives the vehicle identity, current odometer, and recorded service visits summarized by maintenance type, date, mileage, and entered due values. It does not infer driving patterns or treat an unrecorded service as proof that the work was never done. Search results are evidence candidates; recommendations without an accepted source and vehicle match are omitted. Outputs are informational, may be empty, and are not a verified manufacturer schedule.

### Vehicle-specific conversational assistant

The Vehicle Insights page also provides a locally implemented, read-only SmartDrive AI Assistant. It can answer from saved vehicle/service records or, when Gemini routes a question to external research, search with Tavily and return claims linked to accepted sources. Answers separate saved records, external information, and AI interpretation. Record references are checked against the selected vehicle's current history, and external citations must match the supplied search results and pass the existing source-domain and vehicle checks. If no reliable source or record supports an answer, the assistant explains the limitation. Live provider, MongoDB persistence, Docker runtime, and authenticated browser workflows still require integration verification.

Each conversation belongs to the signed-in user and one active vehicle. Multiple saved conversations can be switched, started, or permanently deleted. Conversations and messages expire after 90 days without successful activity. Questions are limited to 1,500 characters; at most eight recent exchanges and 60 recent maintenance items are supplied to the assistant, subject to a 32,000-character prompt cap. Provider usage is limited to 20 attempted assistant requests per user per UTC day and one request per vehicle every 10 seconds. The UI and API do not expose write operations to the assistant.

The chat context includes vehicle make/model/year, engine, mileage, fuel/transmission, relevant maintenance descriptions and due values, and a still-valid cached research profile when available. It excludes VIN, registration, receipts, costs, service notes, account information, and other vehicles. Gemini/Tavily credentials listed above are required for chat; external research is selective, and record-only answers still require Gemini. The assistant is informational, not a mechanical diagnosis.

### Research-based predictive preventive maintenance

Vehicle Insights includes an optional predictive maintenance report. The backend deterministically selects up to three components. At most one slot is reserved for a saved overdue (or upcoming) schedule; other slots prioritize service history and general research, so several overdue schedules cannot crowd out all component research. Tavily searches those candidates; Gemini returns only candidate identifiers, source URLs, and exact excerpts. The backend checks excerpt text against the supplied result and checks URLs and declared vehicle make/model/year/engine/generation applicability. A text match is not proof of factual accuracy or semantic support, so the UI displays the excerpts and links but does not display free-form Gemini findings or recommendations. Backend rules assign `Schedule overdue`, `Monitor`, or `Insufficient data`. `Inspect` is reserved and is not assigned automatically from snippets. Gemini cannot set categories or numeric scores. An overdue schedule describes the saved due value, not a physical fault. Missing records remain unknown.

Reports are scoped to user, vehicle identity (including known engine/generation), mileage, service history and model/schema revisions; they use the existing Mongo research cache and 24-hour expiry. A cache-only endpoint restores saved results; a user action is required to run or refresh external research. The displayed confidence describes source/applicability match only, not technical accuracy. Automated findings are unreviewed and informational, not statistically validated failure predictions, mechanical diagnoses, or a substitute for manufacturer service information or a qualified technician. No maintenance records or reminders are created automatically. See [API Specification](docs/04_API_SPECIFICATION.md) for endpoints and limits. Live provider, isolated MongoDB persistence, Docker 3.13, and authenticated browser verification remain separate manual checks.

---

## 📊 Vehicle Health Dashboard

The Maintenance page generates a schedule-tracking estimate from the latest saved due schedules.

Example:

```text
Vehicle Health

92 / 100

Engine          96
Transmission    84
Cooling         88
Brakes          94
Battery         82
Tyres           95
```

The score describes only whether saved maintenance schedules are up to date, due soon, or overdue. It does not assess physical vehicle condition or replace a mechanical inspection. Areas without usable due data are excluded, and an overall score is withheld until enough areas have data. Each area includes its rule-based explanation.

---

## 🛠️ Service & Repair History

Users can build a digital maintenance history for their vehicles.

A maintenance record can contain:

* Service date
* Mileage
* Workshop
* Reason for visit
* Diagnosis
* Work performed
* Parts replaced
* Labour cost
* Parts cost
* Total cost
* Downtime
* Invoice/receipt
* Photos
* Maintenance category
* Notes

Maintenance categories include:

* Engine
* Transmission
* Cooling system
* Brakes
* Suspension
* Steering
* Electrical
* Battery
* Air conditioning
* Tyres
* Fluids
* Filters
* Other

An important design principle is distinguishing between:

> **No maintenance record exists**

and:

> **The maintenance was never performed**

A missing record should not automatically be treated as proof that the owner failed to perform the maintenance.

---

# 🚨 Preventive Maintenance

The platform is designed to identify maintenance that should be considered **before a component becomes a problem**.

Instead of relying exclusively on a single manufacturer interval, recommendations can take into account:

* Manufacturer documentation
* Component manufacturer guidance
* Independent technical knowledge
* Industry best practices
* Severe-service conditions
* Malaysian climate and traffic
* Vehicle-specific information
* Actual service history
* Historical maintenance data

The system should explain why a recommendation was made.

For example:

> Although a standard service interval may be listed at 10,000 km, your previous service history and predominantly urban driving pattern suggest that servicing slightly earlier may be more appropriate.

The goal is to provide **evidence-based maintenance recommendations**, rather than blindly following a single source.

---

# 🔍 Mileage-Specific Common Issues

A major part of the platform's long-term intelligence is identifying maintenance considerations that may become relevant as a vehicle reaches certain mileage ranges.

For example:

```text
Current Mileage
100,000 km

Potential areas to inspect:

• Cooling system
• Suspension components
• Transmission service condition
• Belts and related components
```

These should be presented as **potential issues or inspection recommendations**, not guaranteed failures.

For example:

> Components in this system may become more likely to require attention around this mileage. Consider having them inspected.

rather than:

> Your water pump will fail at 100,000 km.

---

# 🧠 AI Knowledge Base

The AI system is intended to use a structured vehicle maintenance knowledge base.

Conceptually:

```text
Manufacturer
     ↓
Model
     ↓
Engine / Transmission
     ↓
Mileage Range
     ↓
Maintenance Item
     ↓
Known Issues
     ↓
Symptoms
     ↓
Recommended Action
     ↓
Evidence / Source
```

This allows recommendations to become increasingly specific to individual vehicles.

The knowledge base is an important ongoing part of the project and is one of the areas being developed further.

---

# 📈 AI Vehicle Valuation

The project also includes a machine learning vehicle-price prediction component.

A **Random Forest regression model** is used to estimate vehicle prices based on vehicle characteristics.

Potential inputs include:

* Manufacturer
* Model
* Vehicle age
* Mileage
* Engine capacity
* Transmission
* Vehicle features
* Other engineered vehicle attributes

Example:

```text
Estimated Market Value

RM63,500
```

The valuation system is intended to eventually become part of the broader vehicle intelligence platform.

### Future improvements

* Local Malaysian market data
* Vehicle condition
* Accident history
* Service history
* Market trends
* Depreciation prediction

---

# 🚙 Vehicle Garage

Users can manage their vehicles from a central garage.

Each vehicle can contain:

* Vehicle profile
* Current mileage
* Service history
* Repair history
* Maintenance recommendations
* Health information
* Ownership costs
* Vehicle valuation

The initial consumer model is intended to provide **up to two vehicles for free**, with additional vehicles becoming part of a potential Premium subscription.

---

# 💬 AI Vehicle Assistant

The implemented Vehicle Insights assistant provides a read-only conversational interface where users can ask questions about their own vehicles. It uses saved vehicle context and, when routed to external research, source-checked Tavily results. Live integrations remain to be verified in a separate development environment.

Examples:

```text
"Should I service my car now?"

"What maintenance should I prepare for at 100,000 km?"

"I replaced my brake pads 5,000 km ago. Why is the app recommending an inspection?"

"Is this repair related to my previous cooling-system problem?"

"Is this workshop quotation reasonable?"
```

The AI should use the user's vehicle information and maintenance history when available.

---

# 🔌 OBD-II Integration

OBD-II integration is planned as a future enhancement rather than a requirement for the core system.

Potential data sources include:

* Coolant temperature
* Intake air temperature
* Engine load
* RPM
* Fuel trims
* Battery/charging voltage
* Vehicle speed
* Diagnostic trouble codes (DTCs)

Potential future capabilities:

* Live vehicle data
* DTC interpretation
* Temperature trend analysis
* Battery/charging analysis
* Abnormal reading detection
* AI explanations

The core product is intentionally designed to provide useful maintenance intelligence **without requiring users to purchase an OBD-II device**.

---

# 🏢 Commercialization Vision

The long-term project is designed around three customer segments.

## 1. Consumer — B2C

### AI Vehicle Ownership Assistant

For individual vehicle owners.

Core capabilities:

* Garage
* Service history
* AI maintenance assistant
* Vehicle health
* Preventive maintenance
* Mileage-specific issues
* Vehicle valuation
* Ownership cost tracking

Potential monetization:

* Free tier
* Premium subscription
* One-time AI vehicle reports

---

## 2. Fleet — B2B

### Fleet Maintenance & Intelligence Platform

For organizations operating vehicles such as:

* Rental companies
* Logistics companies
* Truck/lori fleets
* Garbage collection fleets
* Construction companies
* Service companies
* SMEs
* Government/GLC fleets

The platform would centralize:

* Vehicle records
* Workshop visits
* Repair history
* Work performed
* Parts
* Labour
* Maintenance costs
* Downtime
* Vehicle status

### Fleet analytics

Managers could analyze:

* Total maintenance expenditure
* Workshop visits
* Cost per vehicle
* Cost per kilometre
* Average repair cost
* Downtime
* Repeat repairs
* Common failure categories
* Highest-cost vehicles
* Workshop performance

The system should support drill-down from:

```text
Fleet
 ↓
Workshop
 ↓
Vehicle
 ↓
Maintenance Job
 ↓
Repair / Parts / Labour / Cost
```

---

## 3. Enterprise — B2B2B

### Vehicle Intelligence APIs

The long-term platform can expose vehicle intelligence to:

* Insurance companies
* Banks
* Leasing companies
* Used-car marketplaces
* Automotive companies
* Workshop networks
* Vehicle inspection companies
* Fleet software providers

Potential APIs:

* Vehicle Valuation API
* Maintenance Prediction API
* Vehicle Health API
* Fleet Analytics API

---

# 🏗️ Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

## Backend

* Python
* FastAPI

## Database

* MongoDB

## Machine Learning

* Python
* scikit-learn
* Random Forest
* Other models for future predictive maintenance research

## AI

LLM-based AI services for:

* Maintenance explanations
* Vehicle-related conversational assistance
* Service-history interpretation
* Personalized recommendations

---

# 📱 Mobile Strategy

The initial React application is intended to be responsive and mobile-friendly.

### Initial approach

```text
React Web Application
        ↓
Responsive / Mobile-first UI
        ↓
PWA
```

This allows the project to reach mobile users without immediately requiring a separate native application.

A future phase may package the React application for Android and iOS using technologies such as Capacitor.

A full React Native rewrite is not currently required.

---

# 💳 Monetization Strategy

The initial launch is intended to be free.

The goal is to validate:

* User demand
* Retention
* Service-history usage
* AI usefulness
* Which features users value most

### Initial consumer pricing hypothesis

**Free**

* Up to 2 vehicles
* Service history
* Basic vehicle health
* Basic AI intelligence
* Basic preventive maintenance
* Basic valuation

**Premium**

Potential initial price:

* RM9.90/month
* RM99/year

Potential Premium features:

* Unlimited vehicles
* Advanced AI analysis
* Detailed vehicle health
* Advanced maintenance predictions
* Historical analytics
* Advanced vehicle valuation
* AI reports
* Advanced ownership analytics
* OBD-II intelligence when available

Pricing will ultimately be validated through actual user conversion and retention.

---

# 🗺️ Roadmap

## Phase 1 — Core Consumer MVP

* [x] Basic vehicle management
* [x] Vehicle database
* [x] Service/maintenance records
* [x] Vehicle valuation model
* [ ] Complete AI maintenance intelligence
* [ ] Vehicle health scoring
* [ ] Mileage-specific issue knowledge base
* [ ] Preventive maintenance engine
* [ ] AI explanation layer

## Phase 2 — Consumer Product

* [ ] Mobile-first refinement
* [ ] PWA
* [x] Read-only, vehicle-specific AI assistant (live integration verification pending)
* [ ] Ownership cost tracking
* [ ] Advanced vehicle health
* [ ] AI vehicle reports
* [ ] Subscription system
* [ ] Production deployment

## Phase 3 — Advanced Vehicle Intelligence

* [ ] OBD-II integration
* [ ] Maintenance prediction models
* [ ] Historical maintenance analytics
* [ ] Personalized risk scoring
* [ ] More vehicle/engine-specific knowledge

## Phase 4 — B2B Fleet

* [ ] Fleet management
* [ ] Workshop management
* [ ] Maintenance analytics
* [ ] Repair analytics
* [ ] Downtime tracking
* [ ] Fleet cost forecasting
* [ ] AI fleet insights
* [ ] Vehicle replacement intelligence

## Phase 5 — Enterprise

* [ ] Vehicle Valuation API
* [ ] Maintenance Prediction API
* [ ] Vehicle Health API
* [ ] Fleet Analytics API
* [ ] Enterprise integrations
* [ ] Automotive partnerships

---

# 🔐 Data & Privacy

The platform may eventually process:

* User information
* Vehicle information
* Registration information
* Service history
* Workshop information
* Invoices
* Driver information
* Potential OBD/telematics data

Privacy and security should therefore be considered from the beginning.

The production system should investigate and comply with applicable Malaysian requirements, including:

* Personal Data Protection Act (PDPA)
* Data security requirements
* Data retention
* Data breach handling
* Cross-border data transfers
* Data Protection Officer requirements where applicable
* Consumer protection
* MCMC/SKMM applicability
* Telematics/OBD data considerations

Where practical, personal data and vehicle data should be separated architecturally.

---

# ⚠️ Important AI Disclaimer

The platform provides **estimates, recommendations and maintenance insights** based on available data.

It does not replace:

* Professional mechanical inspection
* Manufacturer technical documentation
* Qualified mechanics
* Emergency vehicle diagnostics
* Professional safety assessments

Health scores and predicted maintenance should be presented with appropriate confidence levels.

For example:

```text
Recommendation:
Cooling system inspection

Confidence:
Medium

Reason:
Vehicle has reached the relevant mileage range,
but no live temperature/OBD data is available.
```

---

# 🌱 Long-Term Vision

The long-term objective is to build a **Vehicle Intelligence Platform**, rather than simply another maintenance reminder application.

The core loop remains:

```text
Service History
      +
Mileage
      +
Vehicle Information
      ↓
AI Vehicle Intelligence
      ↓
Vehicle Health
      +
Preventive Maintenance
      +
Mileage-Specific Issues
      +
Vehicle Valuation
```

The same intelligence layer can eventually power:

```text
                 Vehicle Intelligence Platform
                           |
          +----------------+----------------+
          |                |                |
       Consumer          Fleet          Enterprise
        B2C               B2B             B2B2B
          |                |                |
    AI Assistant      Fleet System       APIs
    Health Index      Maintenance        Vehicle Value
    Valuation         Analytics          Health Score
    Service History   AI Planning        Maintenance AI
```

> **Your service history is the data. Our AI turns that data into decisions.**

---

# 📌 Project Status

This project is currently under active development.

The core vehicle, service-history, receipt, and OCR flows are implemented. The maintenance tracking score is local and explainable. Source-checked LLM maintenance research and a read-only vehicle assistant are implemented locally, but live Gemini/Tavily, isolated MongoDB, Docker Python 3.13, and authenticated browser workflows remain unverified. Valuation and the broader intelligence platform remain future work.

For Windows local setup, the backend loads `backend/.env.local` before `backend/.env`; process environment variables take precedence. `APP_ENV=production` must be set by the hosting environment, and production mode ignores dotenv files. See [Local Development](docs/11_LOCAL_DEVELOPMENT.md) and the [Integration Verification Runbook](docs/12_END_TO_END_VERIFICATION.md) for MongoDB, provider, browser, and Docker instructions.

The ultimate goal is to transform the project from a vehicle maintenance application into a commercially viable **AI Vehicle Intelligence Platform**.

## Preventive Maintenance Planner (Phase 4)

The `/maintenance/planner` view brings saved service-history due targets, eligible cached Phase 3 evidence, and owner-created actions into versioned, user-managed plans. Generated plans are drafts. Schedule actions use the latest saved item per maintenance type and the exact due date/mileage the owner recorded; research-backed entries retain their validated source references and remain review suggestions. No new service interval, cost, or calendar projection is inferred. Mileage dates are projected only from an optional owner-entered monthly mileage estimate.

Owners can approve selected or all proposals, add personal actions to draft or active plans, edit allowed fields, reschedule, start, skip, restore, cancel, and complete actions. Completion asks whether to create a service-history visit; that choice is explicit, and a unique action link prevents duplicate visits on retries. Existing saved due values are preserved unless the owner explicitly supplies updated values during completion. The local Maintenance Score logic is unchanged.

Reminders are stored per action and evaluated when the planner is opened. In-app reminder dismissal and history are persisted. There is no background scheduler, email, push, or guaranteed proactive delivery yet; those require a production worker/notification service.

See [API specification](docs/04_API_SPECIFICATION.md), [database design](docs/03_DATABASE_DESIGN.md), and [architecture](docs/02_SYSTEM_ARCHITECTURE.md) for endpoint and persistence details.
