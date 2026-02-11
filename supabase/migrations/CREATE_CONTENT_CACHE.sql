-- Table de cache pour contenu généré (modules dynamiques, etc.)
-- Utilisée par l'Edge Function generate-dynamic-modules (lecture/écriture via service_role)

CREATE TABLE IF NOT EXISTS public.content_cache (
  key TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index optionnel pour des requêtes par version
CREATE INDEX IF NOT EXISTS idx_content_cache_version ON public.content_cache(version);

COMMENT ON TABLE public.content_cache IS 'Cache de contenu généré (ex: dynamic_modules:sectorId:jobId:contentVersion:language)';
