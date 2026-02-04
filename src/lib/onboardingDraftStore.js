/**
 * Stockage local des réponses d'onboarding AVANT connexion.
 * Transfert automatique vers user_profiles au moment de la connexion / création de compte.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DRAFT = 'ONBOARDING_DRAFT_V1';
const KEY_UPDATED_AT = 'ONBOARDING_DRAFT_UPDATED_AT';
const KEY_TRANSFERRED = 'ONBOARDING_DRAFT_TRANSFERRED';

/**
 * Structure du brouillon (alignée sur les 6 questions + DOB)
 * @typedef {Object} OnboardingDraft
 * @property {string} [futureFeeling]
 * @property {string} [discoverySource]
 * @property {string} [openReason]
 * @property {string} [schoolLevel]
 * @property {string} [hasIdeas]
 * @property {string} [clarifyGoal]
 * @property {string} [dob] - YYYY-MM-DD
 * @property {string} [completedAt] - ISO date
 */

/**
 * Merge partiel et sauvegarde du brouillon.
 * @param {Partial<OnboardingDraft>} partialAnswers
 */
export async function saveDraft(partialAnswers) {
  try {
    const current = await loadDraft();
    const merged = { ...current, ...partialAnswers, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(KEY_DRAFT, JSON.stringify(merged));
    await AsyncStorage.setItem(KEY_UPDATED_AT, String(Date.now()));
  } catch (e) {
    console.warn('[OnboardingDraftStore] saveDraft error:', e);
  }
}

/**
 * Charge le brouillon depuis le stockage local.
 * @returns {Promise<OnboardingDraft>}
 */
export async function loadDraft() {
  try {
    const raw = await AsyncStorage.getItem(KEY_DRAFT);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.warn('[OnboardingDraftStore] loadDraft error:', e);
    return {};
  }
}

/**
 * Vide le brouillon local (après transfert réussi).
 */
export async function clearDraft() {
  try {
    await AsyncStorage.multiRemove([KEY_DRAFT, KEY_UPDATED_AT]);
  } catch (e) {
    console.warn('[OnboardingDraftStore] clearDraft error:', e);
  }
}

/**
 * Marque le brouillon comme transféré (idempotence).
 */
export async function markTransferred() {
  try {
    await AsyncStorage.setItem(KEY_TRANSFERRED, 'true');
  } catch (e) {
    console.warn('[OnboardingDraftStore] markTransferred error:', e);
  }
}

/**
 * Indique si le brouillon a déjà été transféré pour cette "session" / appareil.
 * @returns {Promise<boolean>}
 */
export async function isTransferred() {
  try {
    const v = await AsyncStorage.getItem(KEY_TRANSFERRED);
    return v === 'true';
  } catch (e) {
    return false;
  }
}
