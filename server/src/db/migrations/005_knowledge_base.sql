CREATE TABLE IF NOT EXISTS knowledge_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type   TEXT NOT NULL,
  title         TEXT NOT NULL,
  source_ref    TEXT,
  raw_content   TEXT NOT NULL,
  search_vector TSVECTOR,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_sources_fts_idx ON knowledge_sources USING GIN(search_vector);

CREATE OR REPLACE FUNCTION knowledge_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.raw_content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS knowledge_tsv_trigger ON knowledge_sources;
CREATE TRIGGER knowledge_tsv_trigger
  BEFORE INSERT OR UPDATE OF title, raw_content ON knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION knowledge_tsv_update();
