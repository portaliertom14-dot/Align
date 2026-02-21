-- ESCO Pipeline: tables + pgvector + recherche sémantique
-- Remplace la whitelist 21 métiers par une base ESCO quasi exhaustive.

-- 1) Extension pgvector (requise pour les embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Table esco_groups (groupes ESCO)
CREATE TABLE IF NOT EXISTS esco_groups (
  id TEXT PRIMARY KEY,
  label_fr TEXT,
  label_en TEXT,
  parent_id TEXT REFERENCES esco_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Table esco_occupations (métiers ESCO)
CREATE TABLE IF NOT EXISTS esco_occupations (
  id TEXT PRIMARY KEY,
  code TEXT,
  title_fr TEXT NOT NULL,
  title_en TEXT,
  description_fr TEXT,
  description_en TEXT,
  group_id TEXT REFERENCES esco_groups(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esco_occupations_group_id_idx ON esco_occupations(group_id);
CREATE INDEX IF NOT EXISTS esco_occupations_is_active_idx ON esco_occupations(is_active) WHERE is_active = true;

-- 4) Table esco_embeddings (vecteurs pour recherche sémantique)
-- text-embedding-3-small / text-embedding-ada-002 = 1536 dimensions
CREATE TABLE IF NOT EXISTS esco_embeddings (
  occupation_id TEXT PRIMARY KEY REFERENCES esco_occupations(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index HNSW pour recherche par similarité cosine (fonctionne sur table vide)
-- ivfflat nécessite des lignes pour construire les centroides
CREATE INDEX IF NOT EXISTS esco_embeddings_vec_idx
  ON esco_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5) RPC: recherche topK par similarité cosine
CREATE OR REPLACE FUNCTION rpc_search_esco_occupations(
  query_embedding vector(1536),
  k int DEFAULT 30
)
RETURNS TABLE (
  occupation_id TEXT,
  score float,
  title_fr TEXT,
  description_fr TEXT,
  group_label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS occupation_id,
    (1 - (e.embedding <=> query_embedding))::float AS score,
    o.title_fr,
    COALESCE(NULLIF(TRIM(o.description_fr), ''), o.description_en, '')::TEXT AS description_fr,
    COALESCE(g.label_fr, g.label_en, '')::TEXT AS group_label
  FROM esco_embeddings e
  JOIN esco_occupations o ON o.id = e.occupation_id AND o.is_active = true
  LEFT JOIN esco_groups g ON g.id = o.group_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT k;
END;
$$;

-- RLS: les Edge Functions utilisent service_role, pas besoin de politiques pour l'instant
-- Si besoin de lecture publique: GRANT EXECUTE ON FUNCTION rpc_search_esco_occupations TO anon, authenticated;
