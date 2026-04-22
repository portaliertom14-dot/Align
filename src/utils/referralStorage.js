import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeReferralCodeForStorage } from '../lib/safeReferralCode';

const REFERRAL_STORAGE_KEY = '@align_referral_code';

export async function getStoredReferralCode() {
  try {
    return await AsyncStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export async function setStoredReferralCode(code) {
  try {
    const safe = sanitizeReferralCodeForStorage(code);
    if (safe) await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, safe);
  } catch (e) {
    console.warn('[referralStorage] setStoredReferralCode:', e);
  }
}

export async function clearStoredReferralCode() {
  try {
    await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch (e) {
    console.warn('[referralStorage] clearStoredReferralCode:', e);
  }
}

/**
 * Lit l'URL initiale (web ou native) et stocke le paramètre ref= s'il est présent.
 * À appeler au démarrage de l'app (ex. App.js).
 */
export async function captureReferralCodeFromUrl() {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref && sanitizeReferralCodeForStorage(ref)) await setStoredReferralCode(ref);
      return;
    }
    const { Linking } = require('react-native');
    const url = await Linking.getInitialURL();
    if (url) {
      const match = url.match(/[?&]ref=([^&]+)/);
      if (match) {
        const decoded = decodeURIComponent(match[1]);
        if (sanitizeReferralCodeForStorage(decoded)) await setStoredReferralCode(decoded);
      }
    }
  } catch (e) {
    console.warn('[referralStorage] captureReferralCodeFromUrl:', e);
  }
}
