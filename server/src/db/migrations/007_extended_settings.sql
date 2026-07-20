-- Extend org_settings with kb_only flag, humanness level, and optional API key
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS kb_only        BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS humanness      SMALLINT     NOT NULL DEFAULT 3 CHECK (humanness BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS anthropic_key  TEXT;
