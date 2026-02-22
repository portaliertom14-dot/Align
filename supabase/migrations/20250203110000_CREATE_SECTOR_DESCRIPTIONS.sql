-- Table cache descriptions secteurs (IA + cache).
-- Edge sector-description : lookup par sector_id, si absent → OpenAI puis INSERT.

CREATE TABLE IF NOT EXISTS sector_descriptions (
  sector_id text PRIMARY KEY,
  text text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sector_descriptions_updated_at ON sector_descriptions(updated_at);

COMMENT ON TABLE sector_descriptions IS 'Cache descriptions secteurs générées par IA (edge sector-description).';
