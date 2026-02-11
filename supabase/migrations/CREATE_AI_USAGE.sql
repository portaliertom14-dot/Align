-- Garde-fous IA : quota par utilisateur et global par jour
-- Utilisé par les Edge Functions (analyze-sector, analyze-job, generate-dynamic-modules)

CREATE TABLE IF NOT EXISTS public.ai_usage (
  date DATE NOT NULL,
  user_id UUID NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON public.ai_usage(date);

COMMENT ON TABLE public.ai_usage IS 'Comptage des appels IA par jour et par utilisateur (user_id NULL = anonyme)';

-- Incrément atomique pour un (date, user_id)
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_date DATE, p_user_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.ai_usage (date, user_id, count)
  VALUES (p_date, p_user_id, 1)
  ON CONFLICT (date, user_id) DO UPDATE SET count = public.ai_usage.count + 1;
END;
$$;
