-- =====================================================
-- Paywall reminder email automation
-- - Track paywall views
-- - Send reminder after 30 minutes (via Edge Function + pg_cron)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.paywall_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ
);

COMMENT ON TABLE public.paywall_events IS 'Tracks paywall views to trigger reminder emails when user stays non-premium.';
COMMENT ON COLUMN public.paywall_events.email_sent IS 'false = pending reminder, true = reminder handled/sent.';

-- Keep at most one pending reminder event per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_paywall_events_one_pending_per_user
  ON public.paywall_events(user_id)
  WHERE email_sent = false;

CREATE INDEX IF NOT EXISTS idx_paywall_events_pending_created_at
  ON public.paywall_events(created_at)
  WHERE email_sent = false;

ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paywall_events_select_own" ON public.paywall_events;
CREATE POLICY "paywall_events_select_own"
  ON public.paywall_events
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "paywall_events_insert_own" ON public.paywall_events;
CREATE POLICY "paywall_events_insert_own"
  ON public.paywall_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Client app does not need update/delete rights on this table.

-- -----------------------------------------------------
-- Cron job: invoke Edge Function every 30 minutes
-- -----------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'send-paywall-reminder-every-30-minutes';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END
$$;

SELECT cron.schedule(
  'send-paywall-reminder-every-30-minutes',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-paywall-reminder',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  );
  $$
);
