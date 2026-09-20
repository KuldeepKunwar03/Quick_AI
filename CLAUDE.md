# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

Two independent npm packages, no workspace root and no root `package.json`. Install and run each separately.

- `client/` — Vite + React 19 SPA (JSX, no TypeScript), Tailwind v4, Clerk for auth
- `server/` — Express 5 API, ESM (`"type": "module"`), Clerk for auth, Neon Postgres

## Commands

```bash
cd server && npm install && npm run server   # nodemon, port 3000 (PORT env overrides)
cd server && npm start                       # plain node, no watch

cd client && npm install && npm run dev      # vite dev server
cd client && npm run build                   # production build
cd client && npm run lint                    # oxlint (client only; server has no linter)
```

There is **no test framework, no test script, and no test files** in either package. Don't reference or assume one; if tests are needed, the harness has to be added first.

`server/requirement.txt` is a pip-style copy of `server/package.json`'s dependencies. Nothing reads it, and `pip install -r` on it fails — every entry is an npm package. Use `npm install`.

## External services — all three need live credentials

Nothing in this app works end to end without these, and failures surface as `{success: false, message}` with a 200 status, not as a crash:

| Service | Used for | Known failure mode |
|---|---|---|
| The user's AI provider | text + image generation | Supplied per user, never by the server. On a free-tier **Google** key, image models return **429 `limit: 0`** — image generation requires billing enabled there. Text works on the free tier. |
| Cloudinary | stores every generated/processed image | A scoped API key without read+upload permission returns **403 `missing permissions`**. |
| Neon | the single `creations` table | `Error connecting to database: TypeError: fetch failed`. Usually **local, not Neon** — see below. Do not conclude the project is deleted without the IP test. |

## Diagnosing `fetch failed` from Neon

`server.js` calls `net.setDefaultAutoSelectFamilyAttemptTimeout(2000)`. **Don't remove it.** The endpoint advertises both A and AAAA records; the IPv6 routes don't work here and the IPv4 connect takes ~300ms, which is longer than the 250ms after which Node's Happy Eyeballs abandons an attempt. Without the call, every connect dies at ~800ms with ETIMEDOUT, which undici reports as `TypeError: fetch failed` and the driver wraps as `Error connecting to database: TypeError: fetch failed`. Affects Cloudinary and Gemini too, so the fix belongs at the entry point.

Symptoms are identical whether the cause is local or the project is gone, so test before concluding anything:

- **Comparing against a bogus `ep-*` hostname proves nothing.** Neon wildcards `*.aws.neon.tech`, so a made-up endpoint resolves to the same IPs as a live one and fails the same way.
- **The discriminator is connecting by IP.** `net.connect({host, port: 443, autoSelectFamily: false, family: 4})` succeeding while `net.connect({host, port: 443})` times out means the database is fine and the problem is the Happy Eyeballs timeout above.
- **To confirm the project itself is alive**, `POST https://<resolved-ip>/sql` with `servername`/`Host` set to the endpoint hostname, the `Neon-Connection-String` header, and body `{"query":"select 1","params":[]}`. A 200 with rows means Neon is healthy and the credentials are valid.

## Database

Raw SQL through the Neon serverless driver — `sql` tagged templates from [server/configs/db.js](server/configs/db.js). No ORM and no migration tooling.

[server/schema.sql](server/schema.sql) holds the one table. Run it by hand against a fresh Neon database before first start; the app never creates or migrates it. `type` values in use: `article`, `blog-title`, `image`, `resume-review`. For images, `content` holds a Cloudinary URL rather than text.

`likes` is `TEXT[]`. The driver needs an explicit `'{a,b}'::text[]` literal on update — see `toggleLikeCreation`.

## Environment

Both `.env` files are gitignored.

- `server/.env` — `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET`; optional `AI_BASE_URL`, `AI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL` (these three are only the *defaults offered to users*, not credentials). **No AI API key belongs here** — see Personal API keys below.
- `client/.env` — `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BASE_URL` (API origin, defaults to `http://localhost:3000`)

`ClerkProvider` in [client/src/main.jsx](client/src/main.jsx) takes no `publishableKey` prop — it reads the Vite env var implicitly.

The Cloudinary SDK **auto-reads `CLOUDINARY_URL` from the environment on import**, ahead of anything [server/configs/coudinary.js](server/configs/coudinary.js) passes. A malformed value there silently wins and is very hard to spot; the config now uses the three explicit vars instead. Note also that `dotenv` truncates an unquoted value at a newline, so a wrapped line in `.env` parses as a short value plus a junk key.

## Request pipeline

Auth is two layers — read [server/server.js](server/server.js) and [server/middlewares/auth.js](server/middlewares/auth.js) together:

1. `clerkMiddleware()` populates `req.auth`.
2. A bare `app.use` gate in [server.js](server/server.js#L30-L41), positioned *after* the public `GET /`, 401s any unauthenticated request. Route order is load-bearing: anything registered above that gate is public, anything below is protected. **This gate runs before routing**, so an unmounted path under `/api/ai` also returns 401 — probing over HTTP cannot tell you whether a route exists. Inspect `aiRouter.stack` instead.
3. Per-route `auth` middleware resolves the caller's personal Gemini key onto `req.userApiKey` (or `null`).

**There are no plans, no premium tier and no usage quotas.** Every tool is available to any signed-in user. The subscription model was removed along with Clerk's `PricingTable`, `has({plan})`, and the `free_usage` counter — don't reintroduce them.

## Personal API keys — the server holds none

**There is no server-side AI key and no fallback.** `GEMINI_API_KEY` has been removed from the environment and is referenced nowhere. Every generation runs on the calling user's own key; without one, the request fails with "Add your API key on the API Key page to start generating." Don't reintroduce a server key — it would silently start billing the operator again.

### The key is never stored — this is a promise in the UI

The API Key page tells users, in plain language, that the key is not kept anywhere and dies on refresh. **That text is a commitment; the code has to keep matching it.**

The key lives in React state in [ApiKeyProvider](client/src/components/ApiKeyProvider.jsx) and nowhere else. Not `localStorage`, not `sessionStorage`, not a cookie, not Clerk metadata, not the database, not a server-side session map. [useApi](client/src/lib/useApi.js) reads it from memory and attaches it per request as `X-Api-Key` / `X-Api-Base-Url` / `X-Api-Model`; [auth.js](server/middlewares/auth.js) reads those headers into `req.userApi`, the request uses them, and they go out of scope when the handler returns.

Consequences to keep in mind:

- A refresh logs the user out of their key and re-locks every tool. That is intended, not a bug.
- **Never log `req.userApi.key`** or include it in an error message.
- Adding any persistence — even "remember me" in `localStorage` — makes the page's copy false. Change the copy first, or don't do it.

`POST /validate-key` checks a key with one 5-token call and returns yes/no. `POST /provider-models` asks the provider what it offers so the model dropdown shows real options rather than a hardcoded list that rots; it filters out embedding/image/TTS ids that can't serve a chat completion. Neither endpoint stores anything, and both are unauthenticated-by-key by design (the key is in the body).

[providers.js](client/src/lib/providers.js) holds base URLs for Google/OpenAI/Groq/OpenRouter plus a `custom` option. `fallbackModels` there is only for when the live fetch fails — the fetched list always wins, and only Google's fallback is populated.

**Text works with any OpenAI-compatible provider** — OpenAI, Groq, OpenRouter, Together, Gemini's compat layer. `textConfigFor(req)` resolves `{apiKey, baseURL, model}` from the user's settings, defaulting to `DEFAULT_BASE_URL` / `DEFAULT_TEXT_MODEL`. Every call takes that config as an argument; there is deliberately **no module-level client singleton**, because the provider varies per request.

`reasoning_effort: 'none'` is applied **only when `isGoogleBase(baseURL)`**. It fixes Gemini's thinking-token problem (see below) but other providers reject parameters they don't recognise.

**Image generation is Google-only.** It uses Gemini's native REST API, not the OpenAI shape, so `imageKeyFor(req)` requires the user's key to be pointed at `generativelanguage.googleapis.com` and returns a clear error otherwise. `supportsImages` in the status response is what the UI uses to warn about this up front.

`saveApiKey` verifies a key with a 5-token call **against the provider the user chose** before storing it, so a wrong key, base URL or model name fails on the settings page rather than on their next generation. Clerk merges metadata on update, so `null` is how a field is removed.

### The lock

Every generation tool is locked until a key is saved, in **both** layers — a UI-only lock would leave the API open:

- **Client:** [RequireApiKey](client/src/components/RequireApiKey.jsx) is a react-router layout route wrapping the six tool routes in [App.jsx](client/src/App.jsx). It renders an "Enter a valid API key first" panel instead of `<Outlet/>`. Dashboard, Community and the API Key page itself stay outside it. The sidebar shows a padlock on the same six entries.
- **Server:** `requireApiKey(req)` in every one of the six controllers.

Key state is shared, not duplicated. [ApiKeyProvider](client/src/components/ApiKeyProvider.jsx) sits in [Layout](client/src/pages/Layout.jsx) wrapping both the sidebar and the `<Outlet/>`, and [apiKeyContext.js](client/src/lib/apiKeyContext.js) exposes `useApiKeyStatus()` → `{credentials, defaults, setCredentials, clearCredentials}`. The sidebar locks, the route guard and the dashboard card all read `credentials`, so they update together the instant a key is entered or forgotten.

Because it is in-memory, `credentials` is known synchronously — there is no loading state and no flash of the wrong icon, and `null` always means locked.

Background and object removal never spend a personal key — they are Cloudinary operations billing to the operator's account — but they are gated the same way so the lock is uniform and the operator's Cloudinary quota isn't open to users who haven't set up.

Put `requireApiKey(req)` **before** any expensive work. `resumeReview` originally read and parsed the whole PDF first and only then hit the key check, doing all that work for a request it was going to refuse.

## AI providers

Text goes through the `openai` SDK against whichever OpenAI-compatible endpoint the user configured. The default is **Gemini's** compat endpoint (`generativelanguage.googleapis.com/v1beta/openai/`) with model `gemini-3.8-flash` — so by default this is Gemini, not OpenAI. Key, base URL and model all come from `textConfigFor(req)`, never directly from the environment.

`reasoning_effort: 'none'` on every text call is **required, not an optimization**. The model spends its token budget on reasoning before emitting anything, so `max_tokens: 100` without it returns 2–4 tokens of truncated text with `finish_reason: length`. Removing that parameter silently degrades every text endpoint.

Images use the **native** Gemini REST API rather than the OpenAI-compatible layer: `POST v1beta/models/{model}:generateContent`, with the image returned as an `inlineData` part (base64). Default `gemini-3.1-flash-image`. This path previously used ClipDrop; that dependency is gone.

Background and object removal are Cloudinary transformations (`background_removal`, `gen_remove`), not model calls — both are paid Cloudinary add-ons that must be enabled on the account. `gen_remove` takes a single token, so a multi-word object is rejected client-side and underscore-joined server-side.

## API conventions

Every controller returns HTTP **200** with `{ success: boolean, content?/creations?, message? }`, including on failure. The auth gate's 401 is the only non-200. Clients must branch on `success`, not on status — that is what `unwrap()` in [client/src/lib/useApi.js](client/src/lib/useApi.js) exists for.

`describeError` in the controller unpacks the provider's own message; without it every upstream failure collapses to "Request failed with status code NNN".

Routes, all under `/api/ai` ([server/routes/aiRoutes.js](server/routes/aiRoutes.js)):

```
POST  validate-key   POST  provider-models   GET  defaults   (store nothing)

POST  generate-article          POST  remove-image-background   GET   get-user-creations
POST  generate-blog-title       POST  remove-image-object       GET   get-published-creations
POST  generate-image            POST  resume-review             POST  toggle-like-creation
```

The three upload routes run `upload.single(...)` before `auth`, so a rejected request may still have written a temp file — controllers clean up in a `finally`.

## Frontend

[client/src/lib/useApi.js](client/src/lib/useApi.js) is the only place that talks to the server: an axios instance with a request interceptor that attaches a fresh Clerk token. Use it rather than calling axios directly, or requests will 401.

Every page follows the same shape — `loading` / `content` / `error` state, disabled submit button with a spinner, inline red error text. There is no toast library; keep it that way unless asked.

The image endpoint takes a single `prompt` and no style field, so `GenerateImages` folds the selected style into the prompt string. The same applies to article length.

## Gotchas

- The Cloudinary config file is spelled `coudinary.js` (missing `l`) and its export is `connnectCloudinary` (three `n`s). Renaming either requires updating the import in `server.js`.
- `server.js` uses top-level `await`, which works only because the package is ESM.
- `pdf-parse` is v2, whose API is `new PDFParse({data}).getText()` — not the v1 default-export function. Most examples online are v1.
- Tailwind v4 defines `--color-primary` in `@theme` in `index.css`; `.reset-tw` there un-resets typography for rendered Markdown.
