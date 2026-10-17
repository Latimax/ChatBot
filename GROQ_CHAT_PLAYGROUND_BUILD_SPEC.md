# Project Brief — Groq Chat Playground

> **Instructions for the coding AI:** Build a complete, working **JavaScript** application from this specification. Write the code, configuration files, and README; do not stop at architecture advice or mockups. Implement the MVP first, test it, and then implement the enhancements in order. Make reasonable decisions without asking unnecessary questions. Use current, maintained dependency versions. Never include a real API key in the source code.

**Specification date:** 2026-10-17  
**Project name:** Groq Chat Playground  
**Primary goal:** A developer-friendly web app for testing Groq-powered chatbots, experimenting with free-tier Groq models, defining a company's background knowledge and instructions, and inspecting what is sent to the AI and returned by it.  
**Audience:** A single developer / small team testing prompts and chatbot behavior before integrating an AI assistant into an existing Laravel website.

---

## 1. What to build

Build a beautiful, functional, responsive chatbot testing dashboard with four main areas:

1. **Chat Playground:** chat with the selected Groq model via a multiline text area; preserve multi-turn history; see responses, errors, and usage.
2. **Organization Context / Prompt Studio:** edit the assistant's system instructions, paste potentially long organization information, and add/reorder/delete custom messages with roles.
3. **Free-Tier Model Explorer:** browse supported chat models, learn which are listed for the Groq Free plan, compare **documented** rate limits, and inspect **observed** remaining limits after requests.
4. **Request Inspector:** preview the *exact final ordered `messages` array* and model parameters, examine results/latency/token usage, and export test sessions.

The design should feel like a clean developer playground (modern dashboard, sidebar, cards, code-friendly details), not a generic marketing website. Make it responsive and accessible; dark mode is welcome.

### Important terminology

Groq has a **Free plan** with model-specific rate limits, not a collection of separately purchasable "free plans." The app should help explore **free-plan eligible models and their limits**. A model's public existence does **not** prove that a particular API key can use it. Show the distinction between:

- **Published free-plan limits:** a documented snapshot, not live usage.
- **Models currently available via the authenticated `/models` API:** live model discovery, not a definitive free-tier entitlement check.
- **Observed limits / remaining allowance:** response headers captured from requests made with the user's API key; only the values Groq actually supplies.
- **Account-specific complete quotas and usage:** link to the Groq console; never invent missing metrics.

---

## 2. Required technology stack

Build in **JavaScript, not TypeScript**:

- **Frontend:** React + Vite, functional components, React hooks, Tailwind CSS (or a similarly lightweight styling approach).
- **Backend:** Node.js 20+ with Express, using Node's native `fetch` against Groq's OpenAI-compatible HTTP API. Native `fetch` simplifies capturing the response headers. You may use the official `groq-sdk` if you can still reliably access raw response headers and streaming.
- **State:** React state/context plus `localStorage` for non-secret playground settings and profiles. No database required for MVP.
- **Testing:** Vitest for pure utilities, and Supertest or equivalent for backend routes using mocked Groq responses.
- **Dev:** Vite frontend on `localhost:5173`, Express API on `localhost:3001`, Vite `/api` proxy to Express; provide a convenient root `npm run dev` script.
- **Environment:** Server-side `.env` file with `GROQ_API_KEY`, `PORT`, and optionally `NODE_ENV`. Provide `.env.example`. Use `dotenv` server-side.

**Never call Groq directly from browser code using a secret key.** There must be a backend proxy. Do not use `VITE_GROQ_API_KEY` or persist the key in the browser.

### Architecture

```text
Browser (React/Vite)
  ├── Chat Playground
  ├── Prompt Studio: instructions + company background + custom messages
  ├── Model Explorer: published free-tier limits + discovered models
  └── Request Inspector: exact payload + response diagnostics
        |
        | /api/* (same-origin in deployment; Vite proxy during development)
        v
Node.js / Express backend
  ├── validates request shape, size, selected model and chat roles
  ├── assembles effective Groq message array
  ├── reads GROQ_API_KEY on server
  ├── calls https://api.groq.com/openai/v1/...
  ├── captures usage, latency, rate-limit headers and safe errors
  └── responds with JSON or relays a streaming response
        |
        v
Groq Chat Completions API
```

Design the backend API so it could later be replaced by a Laravel backend without changing the React app significantly.

---

## 3. Layout / interface requirements

### Desktop layout

```text
+--------------------------------------------------------------------------+
| Groq Chat Playground      [API Connected]  [Model selector] [Theme]      |
+-----------------------+----------------------------------+---------------+
| PROMPT STUDIO         | CHAT PLAYGROUND                  | INSPECTOR     |
|                       |                                  |               |
| System instructions   | Assistant / User messages        | Model & params|
| [multiline textarea]  | Scrollable conversation          | Request JSON  |
|                       |                                  | Tokens        |
| Company background    |                                  | Latency       |
| [large textarea]      |                                  | Rate limits   |
|                       |                                  | API errors    |
| Custom role messages  |                                  |               |
| [+ Add] [reorder]     |                                  |               |
| [save profile]        | [multiline chat textarea] [Send] |               |
+-----------------------+----------------------------------+---------------+
| Tabs / navigation: [Playground] [Free Model Explorer] [Saved Profiles]    |
+--------------------------------------------------------------------------+
```

On mobile, stack the sidebar/panels behind tabs, drawers, or collapsible sections. The chat text area must remain convenient to use.

### Core controls

- Model dropdown with searchable model ID, status and documented free-tier badge where supported.
- "Free models only" filter; do not mislabel undocumented models as free.
- System instruction textarea.
- **Large Organization Background textarea** with character counter, clear button, paste support, and optional sample template. This is the core feature: the user can paste what the business does, services, FAQs, policies, target customers, contact details, hours, prices, and website information.
- Custom message editor: repeatable items with role selector (`system`, `user`, `assistant`), editable content, move up/down, duplicate, remove. This is for prompt experiments and few-shot examples.
- Temperature control (0–2, default 0.7) and max completion tokens (default 1024, adjustable). Do not submit optional parameters if a model rejects them; show clear compatibility errors, not silent changes.
- Chat input: multiline `<textarea>`; **Enter to send, Shift+Enter for newline**; also a visible Send button. Don't submit empty messages.
- New conversation / Clear conversation, Retry last request, Copy answer, Copy request payload.
- Live indicator while waiting; error and retry UI; optional streaming toggle.
- Token metrics (prompt, completion, total) when returned; elapsed time; model ID actually used.
- Profile save/load, export/import JSON, and reset to default. No real key in exports.
- A 'Preview Effective Messages' panel that shows the *actual order and content* sent to Groq.

### Suggested starter company-background template

```text
Organization name: [Name]
Website: [URL]
What we do: [Short description]
Products and services: [List]
Target customers: [Who we serve]
Location / service regions: [Details]
Opening hours: [Details]
Pricing: [Only confirmed prices]
Support / contact details: [Details]
Refund / cancellation policy: [Details]
Frequently asked questions: [Q&A]
Things the chatbot must never promise: [Details]
Escalation / handoff instructions: [Details]
Last updated: [Date]
```

Include a separate starter **system instruction** such as: "You are the organization's friendly, accurate support assistant. Use provided organization facts when applicable, don't invent company details, acknowledge uncertainty, and keep answers helpful and clear." These are editable examples, not forced behavior.

---

## 4. Correct prompt / chat composition (critical)

The app must clearly distinguish:

- **Base system instructions:** behavioral guidance for the assistant.
- **Company background:** factual context supplied by the app operator (not model training and not live web lookup).
- **Custom fixed messages:** user-defined system messages and user/assistant examples; these are prepended on every new model request.
- **Conversation messages:** the actual visible user/assistant chat history.
- **Current draft message:** the new user message being sent.

Implement a **pure, unit-tested `buildMessages` utility** with deterministic ordering. Recommended behavior:

1. Build one **system** message combining nonempty base instructions, organization background in a clearly marked section, and any custom messages with role `system`. Delimit sections explicitly.
2. Add all non-system custom messages (`user`, `assistant`) in their user-configured order as few-shot examples.
3. Append the conversation history in chronological order.
4. Append the latest user message **exactly once**.
5. Omit empty sections/messages. Do not overwrite earlier user/assistant turns.
6. Keep the chat UI's history separate from fixed custom messages; never silently mix examples into the visible conversation.
7. If context/instructions change mid-conversation, changes apply on the **next** request; previous AI answers are not retroactively regenerated. Show a subtle note to that effect.

**Example effective request body:**

```json
{
  "model": "openai/gpt-oss-20b",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful support assistant.\n\n## Organization reference\nName: Acme...\nServices: ..."
    },
    { "role": "user", "content": "What are your support hours?" },
    { "role": "assistant", "content": "Our support hours are ..." },
    { "role": "user", "content": "Do you also offer phone support?" }
  ],
  "temperature": 0.7,
  "max_completion_tokens": 1024,
  "stream": false
}
```

The above example demonstrates formatting, not a real organization or guaranteed model answer.

**Context warning:** Pasting a whole website/company handbook into a system message works for small experiments but will consume tokens on *every turn*. Display an approximate character/word count and a warning for very large contexts; do not pretend the character count equals exact model tokens. RAG/document retrieval is explicitly **out of scope for MVP**, but note it as a future feature.

---

## 5. Free-Tier Model Explorer

Provide a comparison screen using an editable local snapshot of Groq's **documented** free-plan limits. The app should fetch the current active model list through the authenticated Models API and join it with this curated metadata. **Do not treat `/models` as a free-tier eligibility endpoint.** If a model is not in the documented free-plan snapshot, display "Free-tier status unverified" rather than guessing.

### Initial documented free-plan text-chat rows (verify before release)

Groq's published Free Plan limits viewed on **2026-10-17** included:

| Model ID | Requests/minute (RPM) | Requests/day (RPD) | Tokens/minute (TPM) | Tokens/day (TPD) |
| --- | ---: | ---: | ---: | ---: |
| `openai/gpt-oss-20b` | 30 | 1,000 | 8,000 | 200,000 |
| `openai/gpt-oss-120b` | 30 | 1,000 | 8,000 | 200,000 |
| `qwen/qwen3.8-27b` | 30 | 1,000 | 8,000 | 200,000 |

**Sources:**
- [Groq Free Plan / rate limits](https://console.groq.com/docs/rate-limits)
- [Groq supported models](https://console.groq.com/docs/models)
- [Groq console: actual account limits](https://console.groq.com/settings/limits) (if redirect/URL differs, link to console and explain how to navigate)

**Important:** These are a **dated reference snapshot, not guaranteed live limits or model access**. Models and quotas can change. Keep the data in an isolated `server/data/freeTierModels.json` with `lastVerified`, `sourceUrl`, and per-model numbers so it is easy to update. Show this date in the UI and link to current documentation.

A real Groq account may have different quotas, restrictions, or enabled models. Allow manual refresh of the current `/models` list. Do not label a model as "tested and accessible" until a successful actual inference request confirms that.

### Explorer features

- Search/filter/sort model cards by name, documented free-plan listing, active discovery status, context window (only if API provides it), and model type.
- Show model metadata returned by `GET /openai/v1/models`, including `id`, `active`, `owned_by`, `context_window` where available.
- Prefer text-chat-capable models for Chat Playground. Audio and safety/classifier models should be excluded from normal chat selection or explicitly marked as non-chat/specialized; do not assume every ID from `/models` accepts chat-completion requests.
- Click a model to activate it in the chat panel.
- Compare rate-limit dimensions in a table with a note that the **first exhausted quota blocks further calls**.
- Offer a link to the Groq console for full account-specific limits and usage.
- The Free plan is not an unlimited-cost-free public chatbot backend. Usage is subject to limits and terms.

### Observed quota and diagnostics after API calls

The Express backend should read and safely return these Groq response headers when present:

```text
x-ratelimit-limit-requests        # documented to mean RPD, not RPM
x-ratelimit-remaining-requests    # RPD remaining
x-ratelimit-reset-requests
x-ratelimit-limit-tokens          # documented to mean TPM, not TPD
x-ratelimit-remaining-tokens      # TPM remaining
x-ratelimit-reset-tokens
retry-after                       # on 429 when provided
```

- Show this as **Last observed from API response**, with timestamp and model.
- Do **not** derive live RPM or TPD balances from these headers: they are not supplied here.
- Do **not** present session token totals as complete Groq organization usage.
- When switching models, do not mix observed quotas across different models.
- On 429, show a human-readable rate-limit message and any valid `retry-after` value. Do not automatically retry in a tight loop.
- Correctly display `401` invalid key, `403` not allowed, `404` missing model, `400` invalid request and network timeout errors.

---

## 6. Backend API contract

Use consistent JSON responses. Suggested endpoints:

### `GET /api/health`

Return `{ "ok": true, "groqConfigured": true }`, without exposing the API key. If missing, the app should start but show a useful setup banner and disable live calls.

### `GET /api/models`

Server calls:

```http
GET https://api.groq.com/openai/v1/models
Authorization: Bearer <SERVER_SIDE_KEY>
```

Return `{ models: [...], fetchedAt: ISO_TIMESTAMP }` or a safe error. Cache briefly (e.g., 5 minutes), with a force-refresh option. Only expose appropriate public model metadata.

### `GET /api/free-tier-limits`

Return the maintained `freeTierModels.json` snapshot: `{ lastVerified, sourceUrl, models }`. This is documentary information, not a live account usage endpoint.

### `POST /api/preview`

Accept the same request data as `/api/chat`, validate it, and return `{ messages: [...], model, options }` **without contacting Groq**. This ensures the inspector sees precisely what the server would send. Exclude secrets and private internal diagnostic data. Preview is available even when no API key is configured.

### `POST /api/chat`

Suggested request:

```json
{
  "model": "openai/gpt-oss-20b",
  "systemInstructions": "You are a helpful assistant.",
  "companyBackground": "Organization name: Example Company...",
  "customMessages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ],
  "history": [
    { "role": "user", "content": "Tell me about your services" },
    { "role": "assistant", "content": "We offer ..." }
  ],
  "message": "What are your office hours?",
  "options": {
    "temperature": 0.7,
    "maxCompletionTokens": 1024
  }
}
```

Validate that `history` contains only `user`/`assistant`, custom role is one of `system`/`user`/`assistant`, and user message is nonempty. Set reasonable request/body limits (e.g., 1 MB total), constrain message counts, text sizes, numbers, and model IDs; make limits configurable. Resolve selected model against currently known/discovered models where possible. Use the **server's** `buildMessages()` output, not an unvalidated raw `messages` array from the frontend.

Server makes:

```http
POST https://api.groq.com/openai/v1/chat/completions
Authorization: Bearer <SERVER_SIDE_KEY>
Content-Type: application/json
```

with `model`, `messages`, `temperature`, `max_completion_tokens`, `stream: false`. Provide a sensible timeout, parse the reply at `choices[0].message.content`, and collect `usage` and sanitized rate-limit headers.

Suggested success response:

```json
{
  "reply": "Our business hours are ...",
  "model": "openai/gpt-oss-20b",
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  },
  "latencyMs": 0,
  "rateLimits": {
    "requestsPerDayLimit": null,
    "requestsPerDayRemaining": null,
    "tokensPerMinuteLimit": null,
    "tokensPerMinuteRemaining": null,
    "requestsReset": null,
    "tokensReset": null,
    "retryAfter": null
  }
}
```

These numeric zeros and nulls represent response **shape**, not real values. Populate only known fields; absent data should stay `null` or `undefined`, never be invented.

Suggested error response:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Groq rate limit reached. Try again later.",
    "status": 429
  },
  "rateLimits": { "retryAfter": "12" }
}
```

Do not forward internal stack traces, credentials, or unnecessary provider details to the browser.

### `POST /api/chat/stream` — enhancement, strongly preferred

Same request schema, but make a streamed Groq completion and relay **normalized SSE events** to the client: `meta`, `delta`, `done`, `error`. Include the model and allowed rate-limit metadata in `meta`; stream text deltas in `delta`; add final usage only if Groq supplies it; include latency at completion. Cancel the upstream Groq request with `AbortController` when the client disconnects. Properly handle multi-byte/partial SSE chunks. If streaming is hard to implement reliably at first, ship the complete non-streaming MVP before adding it.

**Important:** Groq's streaming completions terminate with `data: [DONE]`. Handle chunks with robust SSE framing; do not assume one network chunk equals one complete JSON event.

---

## 7. Frontend components and suggested files

Use a structure similar to this (adapt if beneficial):

```text
groq-chat-playground/
├── package.json               # scripts for frontend + backend development
├── .gitignore
├── .env.example
├── README.md
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── AppHeader.jsx
│       │   ├── ChatPanel.jsx
│       │   ├── MessageBubble.jsx
│       │   ├── PromptStudio.jsx
│       │   ├── CustomMessageEditor.jsx
│       │   ├── ModelSelector.jsx
│       │   ├── FreeModelExplorer.jsx
│       │   ├── RequestInspector.jsx
│       │   ├── UsageAndRateLimitPanel.jsx
│       │   └── ProfilesManager.jsx
│       ├── hooks/
│       │   ├── useLocalStorage.js
│       │   └── useChatPlayground.js
│       ├── lib/
│       │   └── api.js
│       └── styles/
│           └── index.css
├── server/
│   ├── package.json
│   ├── index.js
│   ├── routes/
│   │   ├── models.js
│   │   └── chat.js
│   ├── lib/
│   │   ├── buildMessages.js
│   │   ├── groqClient.js
│   │   ├── rateLimitHeaders.js
│   │   └── validators.js
│   └── data/
│       └── freeTierModels.json
└── tests/
    └── ...
```

You may simplify the tree to keep the initial code understandable. Prioritize functioning software over unnecessary abstractions.

### User workflows

**Workflow A — Test a company's chatbot:** Paste company background, edit system instructions, select a Groq free-tier-documented model, ask questions, inspect answers, change prompt, retry and compare.

**Workflow B — Few-shot prompting:** Add a sample user message and desired assistant response in Custom Messages, then ask a similar question. Inspect the full assembled payload.

**Workflow C — Compare models:** Ask the same question of two different selected models. Preserve conversation history or start fresh explicitly, show per-turn model and latency, and compare output and token usage. A formal side-by-side comparison page can be a follow-up enhancement.

**Workflow D — Explore limits:** Open Model Explorer, see the dated documentation snapshot, perform a call, view observed remaining RPD/TPM from headers and open the Groq console for full quotas.

**Workflow E — Save prompt experiments:** Save a named profile of model, system prompt, company background, custom messages and settings. Export/import JSON. Do not include secrets.

---

## 8. Persistence, data handling and safety

- Store prompt profiles and optional chat history in browser `localStorage` (user can clear it); optionally use `sessionStorage` for history if that is easier. State explicitly that browser storage is **not encrypted**.
- Never persist API credentials in frontend storage, exports, logs or URLs. The app uses the server environment variable only.
- Provide an option to clear history/background/profiles separately and a "Clear all local data" action.
- Warn that sending company-background text to Groq sends that content to an external inference provider. Do not use real private employee/customer information during casual testing.
- Do not render arbitrary AI-generated HTML. For Markdown answers, use a safe Markdown renderer with unsafe HTML disabled or sanitizer enabled.
- Do not log raw prompts or private business background on the backend by default.
- The MVP should be **local/private-dev only**. If the server is ever exposed publicly, require authentication and add per-user rate limiting, request caps, abuse protection, HTTPS, and production CORS/CSRF controls before deployment.
- Handle missing `.env`, upstream errors, malformed responses, and request aborts gracefully.
- Do not claim that prompt text is "training" the model. It provides **per-request context**. Fine-tuning and RAG are different projects.

---

## 9. Model / parameter compatibility and practical details

- Prefer a default model from the current documented free-plan chat list, such as `openai/gpt-oss-20b`, **only if current live model discovery confirms the ID exists**; otherwise prompt user to select an available chat model.
- Model list entries can change, be deprecated or have different capabilities. Avoid an immutable list as the source of truth.
- Chat completion endpoint: `https://api.groq.com/openai/v1/chat/completions`.
- Models endpoint: `https://api.groq.com/openai/v1/models`.
- Prefer `max_completion_tokens`; the older `max_tokens` name is deprecated.
- `temperature` for chat completions is documented as 0–2; start with 0.7.
- Avoid sending unsupported parameters, particularly unsupported penalties, to arbitrary models.
- Support response errors from unusual/model-specific parameter combinations.
- If a response has no plain answer text, show a useful error or appropriate diagnostic rather than `undefined`.
- When a user changes the selected model during a conversation, show a note that subsequent turns use the new model; display model IDs on individual assistant replies.
- Distinguish request latency from Groq model token speed; do not estimate tokens-per-second unless elapsed time and output token count are present and label it as an approximation.

---

## 10. Automated tests and acceptance criteria

Create unit/integration tests for at least:

1. `buildMessages()` composition and order, including long company context, system custom messages, few-shot items and history.
2. Empty input rejection; multiline user messages are preserved; current message is not duplicated.
3. Invalid roles, oversized payloads, unknown/bad model IDs, invalid parameters and missing API key.
4. Model API response parsing and free-tier metadata merging; missing metadata displays as unknown, not free.
5. Rate headers: `x-ratelimit-limit-requests` maps to **RPD**, while `x-ratelimit-limit-tokens` maps to **TPM**; do not conflate them with RPM/TPD.
6. Upstream `401`, `403`, `400`, `429`, server failure, timeout and malformed response.
7. Tokens or quota fields missing from API responses render as "Not available".
8. Persistence and export/import round-trip; API key is never exported.
9. If streaming is implemented: stream deltas, partial SSE frames, `[DONE]`, errors and disconnect cancellation.

### Definition of done — MVP

- [ ] `npm install` and `npm run dev` work following README instructions.
- [ ] The UI opens with no key configured and explains how to configure the key.
- [ ] After adding `GROQ_API_KEY` to server environment, live models load.
- [ ] User can edit system instructions and a **large company-background textarea**.
- [ ] User can add, edit, reorder and remove custom fixed `system`/`user`/`assistant` messages.
- [ ] User can send messages and receive real Groq responses, with multi-turn conversation history.
- [ ] "Preview Effective Messages" accurately represents the backend payload.
- [ ] User can explore published free-plan model limits without misleading live quota claims.
- [ ] After a live request, observed Groq response rate-limit headers and token usage are displayed if present.
- [ ] `429`, bad credentials and other errors are actionable.
- [ ] Prompt profiles persist locally and export/import safely.
- [ ] Responsive layout and basic tests pass.
- [ ] API key never reaches a frontend bundle, localStorage or a Git commit.

### After MVP — enhancements (in order)

1. Streaming chat with Stop Generation button.
2. Side-by-side same-prompt model comparison with response time and token metrics.
3. Named test scenarios (question + expected answer criteria) and simple pass/fail notes.
4. Import organization context from `.txt` / `.md` with local text extraction only; show what is sent to the model.
5. Shareable **sanitized** prompt profiles without exposing private company data by default.
6. Optional later Laravel backend adapter and RAG with real document retrieval.

---

## 11. Developer delivery instructions

**Please now implement the project.** Start by scaffolding the Vite React and Express folders, then build the backend client, message builder and model/free-tier endpoints, then the prompt editor, model explorer, chat panel and diagnostics. Test with mock API responses even if no Groq API key is provided. Do not claim a live Groq call succeeded unless a real key was configured and a request actually worked.

Provide:

- Working source code and all needed package manifests.
- `.env.example`, `.gitignore`, and `README.md` with exact commands.
- A short explanation of how to create a Groq API key at https://console.groq.com/keys.
- A brief description of each main screen and the data flow.
- The test commands and results.
- A note about which data is public documentation versus live API observations.

### Suggested local startup

```bash
# From project root (adjust scripts to your final workspace structure)
npm install

# Copy `.env.example` to `.env` and set GROQ_API_KEY on the SERVER only

npm run dev
# Browser: http://localhost:5173
# Express: http://localhost:3001
```

Write a convenient root script to start both processes, or explain any required separate install command clearly. Ensure `README.md` matches the actual commands.

---

## 12. Official documentation to consult while coding

- Groq API keys: https://console.groq.com/keys
- Groq models and model-discovery API: https://console.groq.com/docs/models
- Groq free-plan limits and response headers: https://console.groq.com/docs/rate-limits
- Groq API reference and supported request fields: https://console.groq.com/docs/api-reference
- Groq chat and streaming: https://console.groq.com/docs/text-chat
- Groq prompting / message roles: https://console.groq.com/docs/prompting
- Groq security / API keys: https://console.groq.com/docs/production-readiness/security-onboarding

**Final principle:** This is a serious testing tool. Optimize for truthfulness (what Groq actually reports), editability (company context and custom messages), reproducibility (exact payload preview and saved profiles), and a smooth chat experience.
