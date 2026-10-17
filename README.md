# Groq Chat Playground

A modern developer-friendly web application for testing Groq-powered chatbots, experimenting with free-tier models, defining organizational background knowledge, and inspecting the exact message payloads and rate limits returned by Groq.

Built with **React + Vite** (JavaScript) on the frontend and **Node.js + Express** on the backend using native `fetch` and Server-Sent Events (SSE) streaming.

---

## Features

1. **3-Column Playground Studio:**
   - **Prompt Studio:** Configure system instructions, paste detailed company context (products, pricing, policies, SLAs, escalation paths), and configure custom fixed few-shot dialogue examples (`system`, `user`, `assistant`). Includes character/word counter, context size warnings, starter company template, and local `.txt`/`.md` document import.
   - **Chat Playground:** Full multi-turn conversational testing with selected Groq models, real-time SSE streaming with "Stop Generation" button, error diagnostics, per-message latency, model badges, and safe Markdown rendering with one-click code copy.
   - **Request Inspector:** Real-time visibility into the exact payload assembled by the server's `buildMessages()` utility, roundtrip latency, token consumption breakdown (prompt, completion, total), and observed rate-limit headers.

2. **Free-Tier Model Explorer:**
   - Dated snapshot (`2026-10-17`) of Groq Free Plan published limits: RPM (Requests/min), RPD (Requests/day), TPM (Tokens/min), and TPD (Tokens/day).
   - Dynamic live model discovery via Groq's `/models` endpoint (when API key is provided).
   - Clear distinction between documented limits, discovered models, and observed response headers.

3. **Side-by-Side Model Comparison (Enhancement 2):**
   - Execute the same prompt simultaneously against two different Groq models with identical organizational context.
   - Compare outputs, roundtrip latency, and token efficiency side by side.

4. **Test Scenarios & Pass/Fail Audit (Enhancement 3):**
   - Benchmark pre-configured test scenarios (pricing adherence, boundary guardrails, unapproved discounts, support SLAs, and security incident escalation).
   - Send questions directly to the chat playground and record audit pass/fail evaluations.

5. **Profile Management & Presets:**
   - Save and load named playground profiles locally.
   - Built-in archetype presets (SaaS Cloud Support, Strict Compliance, Concise Bullet-Point Bot).
   - Export and import sanitized JSON profiles (zero credentials stored or exported).

6. **Security & Zero Key Exposure:**
   - Never exposes API keys to client code, browser `localStorage`, or Git commits.
   - Server-side environment variable only (`GROQ_API_KEY`).
   - Preview mode allows testing prompts and inspecting assembled payloads even before an API key is supplied.

---

## Architecture & Data Flow

```text
Browser (React / Vite on http://localhost:5173)
  ├── Prompt Studio (instructions, company context, few-shots, parameters)
  ├── Chat Playground (multi-turn conversation, streaming SSE, markdown)
  ├── Request Inspector (effective payload preview, latency, tokens, headers)
  ├── Model Explorer (documented limits snapshot + live models)
  ├── Model Compare (side-by-side prompt testing)
  ├── Test Scenarios (evaluation benchmarks & pass/fail audit)
  └── Profiles Manager (local storage & sanitized JSON import/export)
        |
        | /api/* (Proxied to Express during development; same-origin in production)
        v
Node.js / Express Backend (http://localhost:3001)
  ├── validates request shape, sizes, roles, and message emptiness
  ├── assembles effective Groq message array (lib/buildMessages.js)
  ├── reads GROQ_API_KEY from server environment (.env)
  ├── proxies requests to https://api.groq.com/openai/v1/...
  ├── extracts x-ratelimit-* response headers safely (lib/rateLimitHeaders.js)
  └── streams chunks or returns JSON completions
        |
        v
Groq Chat Completions API (https://api.groq.com/openai/v1/chat/completions)
```

> **Integration with Laravel:** The Express API contracts (`/api/chat`, `/api/chat/stream`, `/api/preview`, `/api/models`) mirror standard RESTful endpoints. The backend can be replaced by Laravel controllers implementing identical request/response schemas without modifying the React frontend.

---

## Getting Started

### Prerequisites

- **Node.js**: v20 or higher (v24 tested)
- **npm**: v10 or higher

### 1. Installation

From the project root:

```bash
# Install dependencies for both server and client
node scripts/install.js

# Or install manually in each directory:
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
# Also available in server/.env
```

Edit `.env` (or `server/.env`) to add your Groq API key:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
PORT=3001
NODE_ENV=development
```

#### How to Create a Free Groq API Key:
1. Visit the Groq Console at [https://console.groq.com/keys](https://console.groq.com/keys).
2. Sign in or create a free account.
3. Click **"Create API Key"**, give it a label (e.g. `ChatPlaygroundDev`), and copy the key (`gsk_...`).
4. Paste it into your `server/.env` file.
5. *Note: If you run the app without an API key, the playground starts in **Preview Mode**, allowing you to craft company prompts, inspect payloads, and explore documented model limits.*

### 3. Run Development Servers

Start both the backend API and frontend Vite server with a single command:

```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001](http://localhost:3001)

---

## Running Automated Tests

Run all unit and integration test suites:

```bash
# Run all tests (Server + Client)
npm test

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client
```

### Test Coverage Includes:
- `buildMessages()` deterministic composition: single system message combining instructions, organization background in `## Organization Reference`, and custom system messages; few-shot placement; chronological conversation history; single draft message append; empty section handling; and role validation.
- `extractRateLimitHeaders()` verification: accurately maps `x-ratelimit-limit-requests` to **RPD** (Requests Per Day) and `x-ratelimit-limit-tokens` to **TPM** (Tokens Per Minute), avoiding conflation with RPM or TPD.
- Backend API route tests (`/api/health`, `/api/free-tier-limits`, `/api/preview`, `/api/chat`, `/api/models`) including missing API key handling, validation rejection (400), and rate-limit parsing.
- Profile JSON import/export sanitization (ensuring zero credentials ever export).

---

## Important Terminology: Documentation vs. Live Data

Groq offers a **Free Plan** with model-specific rate limits, not individual purchasable free plans. The app strictly distinguishes between:

| Category | Source | Meaning |
|---|---|---|
| **Documented Free Limits** | `server/data/freeTierModels.json` (Snapshot: `2026-10-17`) | Reference figures published in Groq documentation. Useful for baseline planning. |
| **Discovered Models** | `GET /openai/v1/models` | Models returned live by Groq for an authenticated API key. Does not guarantee free tier entitlement. |
| **Observed Response Headers** | `x-ratelimit-*` on chat responses | Live remaining RPD and TPM values returned specifically by Groq for requests made with your key. |
| **Complete Quotas** | [Groq Console Limits](https://console.groq.com/settings/limits) | Account-specific organization tier limits. The app provides direct navigation links and never fabricates missing metrics. |

---

## License

MIT
