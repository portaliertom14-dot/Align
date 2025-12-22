-- Schéma Supabase pour Align
-- Table des utilisateurs (extension de auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  birthdate DATE,
  school_level TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des profils (maintenue pour compatibilité)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réponses au quiz (une ligne par utilisateur avec toutes les réponses)
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb, -- ["A", "B", "C", ...] - 40 réponses
  scores JSONB, -- { "A": number, "B": number, "C": number }
  profile TEXT, -- "Structuré" | "Créatif" | "Dynamique" | "Mix" | "Polyforme"
  generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réponses individuelles (pour compatibilité si nécessaire)
CREATE TABLE IF NOT EXISTS public.quiz_responses_individual (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des scores
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL,
  profile_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id ON public.quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_individual_user_id ON public.quiz_responses_individual(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON public.scores(user_id);













