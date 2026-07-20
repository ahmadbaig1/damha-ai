ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS helpdesk_provider TEXT    NOT NULL DEFAULT 'zendesk',
  ADD COLUMN IF NOT EXISTS helpdesk_config   JSONB   NOT NULL DEFAULT '{}';
