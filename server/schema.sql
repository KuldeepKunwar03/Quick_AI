-- Schema for the single table this app uses. Run once against a fresh Neon
-- database (psql, or the SQL Editor in the Neon console) before starting the
-- server; the app itself never creates or migrates it.

CREATE TABLE IF NOT EXISTS creations (
    id          SERIAL PRIMARY KEY,
    user_id     TEXT        NOT NULL,
    prompt      TEXT        NOT NULL,
    content     TEXT        NOT NULL,
    type        TEXT        NOT NULL,
    publish     BOOLEAN     NOT NULL DEFAULT FALSE,
    likes       TEXT[]      NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard reads a user's own rows newest-first; Community reads published
-- rows newest-first.
CREATE INDEX IF NOT EXISTS creations_user_id_created_at_idx
    ON creations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS creations_publish_created_at_idx
    ON creations (created_at DESC) WHERE publish;
