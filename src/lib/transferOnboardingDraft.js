/**
 * Transfert du brouillon d'onboarding (local) vers user_profiles au moment de la connexion.
 * Ne remplit que les champs vides en DB (pas d'écrasement).
 */
import { supabase } from '../services/supabase';
import { getUser } from '../services/userService';
import {
  loadDraft,
  markTransferred,
  clearDraft,
  isTransferred,
} from './onboardingDraftStore';

const DRAFT_TO_DB = {
  futureFeeling: 'onboarding_future_feeling',
  discoverySource: 'onboarding_discovery_source',
  openReason: 'onboarding_open_reason',
  schoolLevel: 'onboarding_school_level',
  hasIdeas: 'onboarding_has_ideas',
  clarifyGoal: 'onboarding_clarify_goal',
  dob: 'onboarding_dob',
  completedAt: 'onboarding_completed_at',
};

/**
 * Transfère le brouillon vers le profil utilisateur (idempotent, safe merge).
 * À appeler une fois userId disponible (signIn / signUp).
 * @param {string} userId
 * @returns {Promise<{ transferred: boolean, error?: any }>}
 */
export async function transferOnboardingDraftToProfile(userId) {
  if (!userId) return { transferred: false };

  try {
    if (await isTransferred()) {
      return { transferred: false };
    }

    const draft = await loadDraft();
    const keys = Object.keys(draft).filter((k) => k !== 'updatedAt' && draft[k] != null && draft[k] !== '');
    if (keys.length === 0) {
      return { transferred: false };
    }

    const { data: existing, error: getError } = await getUser(userId);
    if (getError) {
      console.warn('[transferOnboardingDraft] getUser error:', getError);
      return { transferred: false, error: getError };
    }

    const payload = { updated_at: new Date().toISOString() };

    if (draft.dob && (existing?.birthdate == null || existing?.birthdate === '')) {
      payload.birthdate = draft.dob;
    }
    if (draft.schoolLevel && (existing?.school_level == null || existing?.school_level === '')) {
      payload.school_level = draft.schoolLevel;
    }

    Object.keys(DRAFT_TO_DB).forEach((draftKey) => {
      const dbCol = DRAFT_TO_DB[draftKey];
      const value = draft[draftKey];
      if (value == null || value === '') return;
      const existingVal = existing?.[dbCol];
      if (existingVal != null && existingVal !== '') return;
      payload[dbCol] = value;
    });

    const payloadKeys = Object.keys(payload).filter((k) => k !== 'updated_at');
    if (payloadKeys.length > 0) {
      payload.onboarding_version = 'v1';
    }
    if (payloadKeys.length === 0) {
      await markTransferred();
      await clearDraft();
      return { transferred: true };
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(payload)
      .eq('id', userId);

    if (updateError) {
      if (updateError.code === 'PGRST204') {
        const fallback = {
          updated_at: payload.updated_at,
        };
        if (draft.dob && (existing?.birthdate == null || existing?.birthdate === '')) {
          fallback.birthdate = draft.dob;
        }
        if (draft.schoolLevel && (existing?.school_level == null || existing?.school_level === '')) {
          fallback.school_level = draft.schoolLevel;
        }
        const { error: retryError } = await supabase
          .from('user_profiles')
          .update(fallback)
          .eq('id', userId);
        if (retryError) {
          console.warn('[transferOnboardingDraft] fallback update error:', retryError);
          return { transferred: false, error: retryError };
        }
      } else {
        console.warn('[transferOnboardingDraft] update error:', updateError);
        return { transferred: false, error: updateError };
      }
    }

    await markTransferred();
    await clearDraft();
    return { transferred: true };
  } catch (e) {
    console.warn('[transferOnboardingDraft] error:', e);
    return { transferred: false, error: e };
  }
}
