-- =====================================================
-- MIGRATION : Ajouter les colonnes manquantes à user_profiles
-- =====================================================
-- Cette migration ajoute les colonnes nécessaires pour l'onboarding
-- Sans supprimer aucune donnée existante
-- Exécuter dans Supabase SQL Editor

-- 1. Ajouter la colonne birthdate (date de naissance)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS birthdate DATE;

-- 2. Ajouter la colonne school_level (niveau scolaire)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS school_level TEXT;

-- 3. Ajouter la colonne professional_project (projet professionnel)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS professional_project TEXT;

-- 4. Ajouter la colonne similar_apps (apps similaires utilisées)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS similar_apps TEXT;

-- 5. Ajouter les colonnes first_name et last_name si elles n'existent pas
-- (pour cohérence avec le code qui utilise ce format)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 6. Ajouter la colonne avatar_url pour la photo de profil
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 7. Ajouter la colonne welcome_email_sent pour le tracking de l'email de bienvenue
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE;

-- 8. Ajouter la colonne welcome_email_sent_at pour la date d'envoi
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

-- =====================================================
-- COMPATIBILITÉ : Synchroniser les colonnes prenom/nom avec first_name/last_name
-- =====================================================
-- Si prenom/nom existent et first_name/last_name sont vides, copier les valeurs
UPDATE user_profiles
SET first_name = prenom
WHERE first_name IS NULL AND prenom IS NOT NULL;

UPDATE user_profiles
SET last_name = nom
WHERE last_name IS NULL AND nom IS NOT NULL;

-- =====================================================
-- VÉRIFICATION : Afficher les colonnes de la table
-- =====================================================
-- Exécuter séparément pour vérifier
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_profiles'
-- ORDER BY ordinal_position;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
