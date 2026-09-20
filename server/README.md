# nimbus.ai — server

Express 5 API for [nimbus.ai](../README.md). See the root README for what the app does and how to run both halves.

```bash
npm install
npm run server   # nodemon, port 3000
npm start        # plain node
```

Run [schema.sql](schema.sql) once against a fresh Neon database before first start — the app never creates or migrates it.

The server holds **no AI API key**. Every generation runs on the calling user's own key, stored per-user in Clerk private metadata.
