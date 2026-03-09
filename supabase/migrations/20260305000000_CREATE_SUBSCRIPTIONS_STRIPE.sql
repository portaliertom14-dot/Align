-- =====================================================
-- Stripe subscriptions: stockage user_id, customer_id, subscription_id, plan, statut, accès premium
-- =====================================================
-- À exécuter dans Supabase SQL Editor (ou via supabase db push)

-- Table des abonnements (une ligne active par user, historique possible via status)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  premium_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Index pour lookup par user et par stripe_subscription_id (webhook)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- RLS : l'utilisateur ne peut lire que sa propre ligne
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Insert/Update/Delete : effectués par les Edge Functions (service_role, RLS contourné)

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
URGENT — fais une opération de restauration ciblée.

Le responsive mobile a été cassé par les dernières modifications.
Je ne veux PAS une nouvelle tentative de responsive.
Je veux revenir au responsive qui fonctionnait avant.

Objectif :
restaurer uniquement le responsive/UI mobile des écrans cassés à partir du dernier état sain du projet (autour du 28 février), sans toucher à la logique métier récente.

Écrans actuellement cassés :
- login / création de compte
- prénom / pseudo
- date de naissance
- écran transition métier / secteur
- écrans checkpoint
- boutons CTA qui débordent ou ne sont plus centrés
- animation / écran vide après "on crée ta routine personnalisée"

Consignes strictes :
1. Ne refais pas le responsive “à ta façon”.
2. Identifie les fichiers modifiés récemment qui ont cassé le mobile.
3. Compare avec le dernier état sain du projet.
4. Restaure uniquement :
   - classes responsive
   - tailles mobile
   - alignements
   - largeurs de boutons
   - layout mobile
5. Ne touche pas :
   - Stripe
   - logique paywall
   - logique métier
   - navigation
   - desktop
6. Si possible, restaure le responsive mobile depuis le commit sain sur les fichiers concernés uniquement.

Important :
- tous les textes dans les boutons doivent être centrés
- aucun texte ne doit déborder
- aucun élément ne doit sortir du viewport mobile
- les checkpoints doivent retrouver leur taille correcte
- les champs formulaire doivent rester visibles et bien espacés
- corrige aussi l’écran vide après "on crée ta routine personnalisée" si cela vient d’une régression récente

Je veux une restauration ciblée, pas une refonte.
Fais un résumé précis :
- fichiers restaurés
- fichiers modifiés
- ce qui a été annulé
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_subscriptions_updated_at();

COMMENT ON TABLE public.subscriptions IS 'Abonnements Stripe : premium_access = true si status actif, utilisé pour débloquer le résultat métier';
