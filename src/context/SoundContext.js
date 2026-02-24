/**
 * Contexte global "Sons" — source de vérité pour l’option "Couper les sons".
 * Persistance AsyncStorage, défaut ON (sons activés).
 * Enregistre un getter dans soundService pour que playSound() respecte le réglage.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSoundsEnabledGetter } from '../services/soundService';

const STORAGE_KEY = '@align_sounds_enabled';

const SoundContext = createContext(null);

export function useSoundSettings() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSoundSettings must be used within SoundProvider');
  return ctx;
}

export function SoundProvider({ children }) {
  const [soundsEnabled, setSoundsEnabledState] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const soundsEnabledRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const value = raw === 'false' ? false : true;
        if (mounted) {
          soundsEnabledRef.current = value;
          setSoundsEnabledState(value);
        }
      } catch (e) {
        if (__DEV__) console.log('[SoundContext] load fail', e?.message ?? e);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setSoundsEnabledGetter(() => soundsEnabledRef.current);
    return () => setSoundsEnabledGetter(null);
  }, []);

  const setSoundsEnabled = (value) => {
    const next = !!value;
    soundsEnabledRef.current = next;
    setSoundsEnabledState(next);
    AsyncStorage.setItem(STORAGE_KEY, next ? 'true' : 'false').catch(() => {});
  };

  const value = {
    soundsEnabled,
    setSoundsEnabled,
    hydrated,
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}
