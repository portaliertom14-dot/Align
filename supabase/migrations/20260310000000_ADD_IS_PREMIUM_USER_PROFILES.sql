-- Ajout de is_premium sur user_profiles pour les paiements one-shot (accès à vie).
-- Si true, l'utilisateur est considéré premium même sans ligne dans subscriptions (paiement unique 9€).
-- À mettre à true côté backend après succès checkout (webhook ou Edge Function).
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN public.user_profiles.is_premium IS 'Accès premium (paiement unique ou abonnement). Utilisé avec subscriptions.premium_access pour la garde Paywall.';
