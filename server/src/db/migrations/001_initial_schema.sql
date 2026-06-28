CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zendesk_ticket_id BIGINT UNIQUE NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  subject TEXT,
  status TEXT,
  channel TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  triggered_by TEXT,
  connector TEXT,
  status TEXT,
  evidence JSONB,
  report JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  engineer_id TEXT,
  suggestions JSONB DEFAULT '[]',
  accepted_count INT DEFAULT 0,
  ignored_count INT DEFAULT 0,
  debrief JSONB,
  quality_score INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reply_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  draft_text TEXT,
  accepted BOOLEAN,
  edited BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);
