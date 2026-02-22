/**
 * Service de sons de feedback (quiz).
 * Charge correct.mp3 et wrong.mp3 une seule fois, expose playCorrect() et playWrong().
 */

import { Audio } from 'expo-av';

let soundCorrect = null;
let soundWrong = null;
let loaded = false;

const VOLUME_CORRECT = 0.8;
const VOLUME_WRONG = 0.6;

/**
 * Charge les deux sons une seule fois. À appeler au démarrage de l'app (ex: App.js).
 */
export async function loadSounds() {
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
    if (__DEV__) console.log('[soundService] sounds loaded');
  } catch (e) {
    if (__DEV__) console.warn('[soundService] load error:', e?.message);
  }
}

/**
 * Joue le son "réponse correcte". Volume 0.8.
 */
export function playCorrect() {
  if (!soundCorrect) return;
  try {
    soundCorrect.setVolumeAsync(VOLUME_CORRECT);
    soundCorrect.replayAsync();
  } catch (e) {
    if (__DEV__) console.warn('[soundService] playCorrect error:', e?.message);
  }
}

/**
 * Joue le son "réponse incorrecte". Volume 0.6.
 */
export function playWrong() {
  if (!soundWrong) return;
  try {
    soundWrong.setVolumeAsync(VOLUME_WRONG);
    soundWrong.replayAsync();
  } catch (e) {
    if (__DEV__) console.warn('[soundService] playWrong error:', e?.message);
  }
}
