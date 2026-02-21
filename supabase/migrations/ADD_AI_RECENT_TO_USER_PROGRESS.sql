-- Colonne optionnelle pour diversité métiers/secteurs (analyze-job)
-- Structure: { "jobIds": ["developpeur", ...], "clusterIds": ["builder_tech", ...] } (derniers 10)
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS ai_recent JSONB DEFAULT NULL;

COMMENT ON COLUMN public.user_progress.ai_recent IS 'Derniers jobId/clusterId pour pénalité diversité (max 10 chacun).';
