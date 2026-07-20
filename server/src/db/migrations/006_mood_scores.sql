CREATE TABLE IF NOT EXISTS mood_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zendesk_ticket_id BIGINT,
  conversation_id   UUID REFERENCES conversations(id),
  score             INT NOT NULL,
  label             TEXT NOT NULL,
  assessed_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mood_scores_ticket_idx   ON mood_scores(zendesk_ticket_id);
CREATE INDEX IF NOT EXISTS mood_scores_assessed_idx ON mood_scores(assessed_at);
