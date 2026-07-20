ALTER TABLE investigations
  ADD COLUMN IF NOT EXISTS zendesk_user_id   TEXT,
  ADD COLUMN IF NOT EXISTS zendesk_ticket_id BIGINT,
  ADD COLUMN IF NOT EXISTS issue_type        TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raised_issue_url  TEXT;

CREATE INDEX IF NOT EXISTS investigations_zendesk_user_idx ON investigations(zendesk_user_id);
CREATE INDEX IF NOT EXISTS investigations_issue_type_idx   ON investigations(issue_type);
