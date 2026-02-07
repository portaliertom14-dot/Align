-- =====================================================
-- PROFIL: cooldown 30j (prénom/username), referral, colonnes affichage
-- =====================================================

-- 1) Colonnes user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name_last_changed_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username_last_changed_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS modules_completed INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS favorite_sector TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS favorite_job TEXT;

-- Unicité du referral_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code) WHERE referral_code IS NOT NULL;

-- Username unique : d'abord supprimer les doublons (garder un seul username par valeur, les autres passent à NULL)
UPDATE user_profiles u
SET username = NULL
WHERE username IS NOT NULL AND username <> ''
  AND id NOT IN (
    SELECT (array_agg(id ORDER BY id))[1]
    FROM user_profiles
    WHERE username IS NOT NULL AND username <> ''
    GROUP BY username
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE username IS NOT NULL AND username <> '';

-- 2) Table referral_redemptions (un invité = une seule récompense)
CREATE TABLE IF NOT EXISTS referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_invited_user UNIQUE (invited_user_id),
  CONSTRAINT chk_not_self CHECK (inviter_user_id <> invited_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_inviter ON referral_redemptions(inviter_user_id);

-- RLS
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral_redemptions"
  ON referral_redemptions FOR SELECT
  USING (auth.uid() = inviter_user_id OR auth.uid() = invited_user_id);

-- Seul l'invité (nouvel utilisateur) peut insérer une ligne où il est invited_user_id (via RPC après signup)
CREATE POLICY "User can insert self as invited"
  ON referral_redemptions FOR INSERT
  WITH CHECK (auth.uid() = invited_user_id);

-- 3) RPC: mise à jour prénom / username avec cooldown 30 jours (strict)
CREATE OR REPLACE FUNCTION update_profile_fields(
  p_first_name TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row user_profiles%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_cooldown_days INTEGER := 30;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'non_authentifie');
  END IF;

  SELECT * INTO v_row FROM user_profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'profil_inexistant');
  END IF;

  -- Prénom: cooldown 30j
  IF p_first_name IS NOT NULL AND p_first_name <> '' THEN
    IF v_row.first_name_last_changed_at IS NOT NULL
       AND (v_now - v_row.first_name_last_changed_at) < (v_cooldown_days || ' days')::INTERVAL THEN
      RETURN jsonb_build_object('success', false, 'error', 'cooldown_first_name', 'field', 'first_name');
    END IF;
  END IF;

  -- Username: cooldown 30j + unicité
  IF p_username IS NOT NULL AND p_username <> '' THEN
    IF v_row.username_last_changed_at IS NOT NULL
       AND (v_now - v_row.username_last_changed_at) < (v_cooldown_days || ' days')::INTERVAL THEN
      RETURN jsonb_build_object('success', false, 'error', 'cooldown_username', 'field', 'username');
    END IF;
    IF EXISTS (SELECT 1 FROM user_profiles WHERE username = p_username AND id <> v_user_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'username_deja_utilise', 'field', 'username');
    END IF;
  END IF;

  -- Mise à jour
  UPDATE user_profiles
  SET
    updated_at = v_now,
    first_name = COALESCE(NULLIF(trim(p_first_name), ''), first_name),
    first_name_last_changed_at = CASE
      WHEN p_first_name IS NOT NULL AND trim(p_first_name) <> '' AND (first_name IS NULL OR first_name <> trim(p_first_name))
      THEN v_now ELSE first_name_last_changed_at END,
    username = COALESCE(NULLIF(trim(p_username), ''), username),
    username_last_changed_at = CASE
      WHEN p_username IS NOT NULL AND trim(p_username) <> '' AND (username IS NULL OR username <> trim(p_username))
      THEN v_now ELSE username_last_changed_at END
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4) RPC: générer referral_code si null
CREATE OR REPLACE FUNCTION ensure_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code TEXT;
  v_tries INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT referral_code INTO v_code FROM user_profiles WHERE id = v_user_id;
  IF v_code IS NOT NULL AND v_code <> '' THEN
    RETURN v_code;
  END IF;

  LOOP
    v_code := upper(substring(md5(random()::text || v_user_id::text || clock_timestamp()::text) from 1 for 10));
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = v_code) THEN
      UPDATE user_profiles SET referral_code = v_code, updated_at = now() WHERE id = v_user_id;
      RETURN v_code;
    END IF;
    v_tries := v_tries + 1;
    IF v_tries > 20 THEN
      RETURN NULL;
    END IF;
  END LOOP;
END;
$$;

-- 5) RPC: appliquer parrainage (inscription avec code) -> +30 étoiles au parrain, une seule fois
CREATE OR REPLACE FUNCTION apply_referral_if_any(
  p_invited_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id UUID;
  v_etoiles INT;
BEGIN
  IF p_invited_user_id IS NULL OR p_referral_code IS NULL OR trim(p_referral_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'missing_params');
  END IF;

  SELECT id INTO v_inviter_id FROM user_profiles WHERE referral_code = trim(p_referral_code) AND id <> p_invited_user_id;
  IF v_inviter_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  BEGIN
    INSERT INTO referral_redemptions (inviter_user_id, invited_user_id)
    VALUES (v_inviter_id, p_invited_user_id);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'reason', 'already_redeemed');
  END;

  -- +30 étoiles au parrain (user_progress.etoiles)
  UPDATE user_progress
  SET etoiles = COALESCE(etoiles, 0) + 30,
      updated_at = now()
  WHERE id = v_inviter_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION update_profile_fields(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_fields(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION ensure_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_referral_code() TO service_role;
GRANT EXECUTE ON FUNCTION apply_referral_if_any(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_referral_if_any(UUID, TEXT) TO service_role;
