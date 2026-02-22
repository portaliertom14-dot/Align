-- Table cache descriptions métiers (IA + cache).
-- job_key = sector_id + normalized job title (ex: "creation_design:motion designer").
-- Edge job-description : lookup par job_key, si absent → OpenAI puis INSERT.

CREATE TABLE IF NOT EXISTS job_descriptions (
  job_key text PRIMARY KEY,
  sector_id text NOT NULL,
  job_title text NOT NULL,
  text text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_sector_id ON job_descriptions(sector_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_updated_at ON job_descriptions(updated_at);

COMMENT ON TABLE job_descriptions IS 'Cache descriptions métiers générées par IA (edge job-description).';
