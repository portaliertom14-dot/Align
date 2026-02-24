/**
 * Service singleton de sons de feedback (quiz).
 * Point d'entrée unique : playSound(type). Respecte le réglage "Couper les sons" via setSoundsEnabledGetter().
 * Charge correct.mp3 et wrong.mp3 une seule fois au boot.
 * Lecture fiable : stop + rewind puis playAsync(). Anti double-tap 200 ms.
 * Sécurité : try/catch partout, jamais de throw.
 */

import { Audio } from 'expo-av';

let soundCorrect = null;
let soundWrong = null;
let loaded = false;
let soundsEnabledGetter = null;

const VOLUME_CORRECT = 0.8;
const VOLUME_WRONG = 0.6;
const MIN_PLAY_INTERVAL_MS = 200;

let lastPlayTime = 0;

/**
 * Enregistre le getter appelé par playSound/playCorrect/playWrong pour savoir si les sons sont activés.
 * Appelé par SoundContext au mount. Si getter === null ou getter() === false, aucun son ne joue.
 * @param {(() => boolean) | null} getter
 */
export function setSoundsEnabledGetter(getter) {
  soundsEnabledGetter = getter;
}

/**
 * Charge les deux sons une seule fois. Idempotent : rappel sans effet.
 * À appeler au démarrage de l'app (ex: App.js).
 */
export async function initSounds() {
  if (loaded) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    const { sound: s1 } = await Audio.Sound.createAsync(
      require('../../assets/sounds/correct.mp3')
    );
    const { sound: s2 } = await Audio.Sound.createAsync(
      require('../../assets/sounds/wrong.mp3')
    );
    soundCorrect = s1;
    soundWrong = s2;
    loaded = true;
    console.log('[SOUND] init ok');
  } catch (e) {
    console.log('[SOUND] init fail', e?.message ?? e);
  }
}

/** Alias pour compatibilité : même chose que initSounds(). */
export async function loadSounds() {
  return initSounds();
}

/**
 * Préparer un son pour rejouer : si en cours, stop puis rewind à 0.
 * @param {object} sound - instance Audio.Sound
 * @returns {Promise<boolean>} true si prêt à play
 */
async function rewindAndPrepare(sound) {
  if (!sound) return false;
  try {
    const status = await sound.getStatusAsync();
    if (status?.isPlaying) {
      await sound.stopAsync();
    }
    await sound.setPositionAsync(0);
    return true;
  } catch (e) {
    console.log('[SOUND] rewind error', e?.message ?? e);
    return false;
  }
}

/**
 * Joue le son "réponse correcte". Volume 0.8.
 * Ignoré si sons désactivés (getter), non chargés, ou double-tap.
 */
export async function playCorrect() {
  if (soundsEnabledGetter && !soundsEnabledGetter()) return;
  const now = Date.now();
  if (now - lastPlayTime < MIN_PLAY_INTERVAL_MS) return;
  if (!loaded || !soundCorrect) return;
  lastPlayTime = now;
  try {
    await soundCorrect.setVolumeAsync(VOLUME_CORRECT);
    const ready = await rewindAndPrepare(soundCorrect);
    if (!ready) return;
    await soundCorrect.playAsync();
    if (__DEV__) console.log('[SOUND] play correct ok');
  } catch (e) {
    if (__DEV__) console.log('[SOUND] play correct error', e?.message ?? e);
  }
}

/**
 * Joue le son "réponse incorrecte". Volume 0.6.
 * Ignoré si sons désactivés (getter), non chargés, ou double-tap.
 */
export async function playWrong() {
  if (soundsEnabledGetter && !soundsEnabledGetter()) return;
  const now = Date.now();
  if (now - lastPlayTime < MIN_PLAY_INTERVAL_MS) return;
  if (!loaded || !soundWrong) return;
  lastPlayTime = now;
  try {
    await soundWrong.setVolumeAsync(VOLUME_WRONG);
    const ready = await rewindAndPrepare(soundWrong);
    if (!ready) return;
    await soundWrong.playAsync();
    if (__DEV__) console.log('[SOUND] play wrong ok');
  } catch (e) {
    if (__DEV__) console.log('[SOUND] play wrong error', e?.message ?? e);
  }
}

/**
 * Point d'entrée unique pour tous les sons de l'app.
 * Ne fait rien si soundsEnabled = false ou si type inconnu. Jamais de throw.
 * @param {'correct' | 'wrong'} type
 */
export function playSound(type) {
  try {
    if (soundsEnabledGetter && !soundsEnabledGetter()) return;
    if (type === 'correct') {
      playCorrect().catch(() => {});
      return;
    }
    if (type === 'wrong') {
      playWrong().catch(() => {});
      return;
    }
  } catch (e) {
    if (__DEV__) console.log('[SOUND] playSound error', e?.message ?? e);
  }
}
