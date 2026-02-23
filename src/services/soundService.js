/**
 * Service singleton de sons de feedback (quiz).
 * Charge correct.mp3 et wrong.mp3 une seule fois au boot, expose playCorrect() et playWrong().
 * Lecture fiable : stop + rewind (setPositionAsync(0)) puis playAsync() au lieu de replayAsync().
 * Anti double-tap : ignore un play si appelé < 200 ms après le précédent.
 */

import { Audio } from 'expo-av';

let soundCorrect = null;
let soundWrong = null;
let loaded = false;

const VOLUME_CORRECT = 0.8;
const VOLUME_WRONG = 0.6;
const MIN_PLAY_INTERVAL_MS = 200;

let lastPlayTime = 0;

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
 * Ignoré si sons non chargés ou si appelé < 200 ms après le dernier play.
 */
export async function playCorrect() {
  const now = Date.now();
  if (now - lastPlayTime < MIN_PLAY_INTERVAL_MS) {
    console.log('[SOUND] play correct skipped (double-tap)');
    return;
  }
  if (!loaded || !soundCorrect) {
    console.log('[SOUND] play correct skipped (not loaded)');
    return;
  }
  lastPlayTime = now;
  try {
    await soundCorrect.setVolumeAsync(VOLUME_CORRECT);
    const ready = await rewindAndPrepare(soundCorrect);
    if (!ready) {
      console.log('[SOUND] play correct skipped (rewind failed)');
      return;
    }
    await soundCorrect.playAsync();
    console.log('[SOUND] play correct ok');
  } catch (e) {
    console.log('[SOUND] play correct error', e?.message ?? e);
  }
}

/**
 * Joue le son "réponse incorrecte". Volume 0.6.
 * Ignoré si sons non chargés ou si appelé < 200 ms après le dernier play.
 */
export async function playWrong() {
  const now = Date.now();
  if (now - lastPlayTime < MIN_PLAY_INTERVAL_MS) {
    console.log('[SOUND] play wrong skipped (double-tap)');
    return;
  }
  if (!loaded || !soundWrong) {
    console.log('[SOUND] play wrong skipped (not loaded)');
    return;
  }
  lastPlayTime = now;
  try {
    await soundWrong.setVolumeAsync(VOLUME_WRONG);
    const ready = await rewindAndPrepare(soundWrong);
    if (!ready) {
      console.log('[SOUND] play wrong skipped (rewind failed)');
      return;
    }
    await soundWrong.playAsync();
    console.log('[SOUND] play wrong ok');
  } catch (e) {
    console.log('[SOUND] play wrong error', e?.message ?? e);
  }
}
