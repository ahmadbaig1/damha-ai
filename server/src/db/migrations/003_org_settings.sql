CREATE TABLE IF NOT EXISTS org_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE NOT NULL,
  tone_config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO org_settings (key, tone_config)
VALUES ('default', '{"formality":"professional","signOff":null,"forbiddenPhrases":[],"customInstructions":null,"emojiPolicy":"discouraged"}')
ON CONFLICT (key) DO NOTHING;
