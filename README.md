# nimbus.ai

A suite of AI content tools that runs on **your** API key, not ours.

Sign in, add a key from any OpenAI-compatible provider, and every tool unlocks. There is no subscription and no server-side key — whatever you generate bills to your own provider account.

## Tools

| Tool | Runs on |
|---|---|
| Write Article | your key |
| Blog Titles | your key |
| Generate Images | your key (Google AI only) |
| Review Resume | your key |
| Remove Background | server-side image processing |
| Remove Object | server-side image processing |

Published images appear in the Community gallery, where any signed-in user can like them.

## Running it

```bash
cd server && npm install && npm run server   # port 3000
cd client && npm install && npm run dev
```

The server needs `server/.env` with a Neon `DATABASE_URL`, Clerk keys, and Cloudinary credentials. Run `server/schema.sql` once against a fresh database before first start. The client needs `client/.env` with `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_BASE_URL`.

**No AI API key belongs in `.env`** — users supply their own in the app.
