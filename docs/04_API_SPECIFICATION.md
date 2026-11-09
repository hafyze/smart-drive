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

Authentication is required. The endpoint checks vehicle ownership, searches for vehicle maintenance evidence, asks Gemini for structured extraction, validates cited URLs and vehicle match, and returns a normalized guidance profile. It considers current mileage and summarized saved maintenance history. Validated results are cached for 24 hours using the vehicle identity and relevant history.

The route returns HTTP 503 when AI provider configuration is unavailable, HTTP 504 on a model timeout, and HTTP 502 for other upstream research failures. An empty `guidance` list means no recommendation passed the evidence checks.

Required backend settings: `AI_SEARCH_PROVIDER=tavily`, `TAVILY_API_KEY`, `AI_RESEARCH_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_RESEARCH_MODEL`. OpenAI research is not supported.
