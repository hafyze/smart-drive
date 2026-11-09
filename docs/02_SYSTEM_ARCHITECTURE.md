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
