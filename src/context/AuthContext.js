/**
 * AuthProvider — Mode "zéro session persistée" côté UI (progression conservée en DB).
 * - Au boot : signOut({ scope: "local" }) une seule fois, puis manualLoginRequired = true, authStatus = "signedOut".
 * - Jamais de signOut global au boot.
 * - signedIn uniquement après login/signup manuel (SIGNED_IN) → manualLoginRequired = false.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { withTimeout } from '../lib/withTimeout';
import { upsertUser } from '../services/userService';

const FETCH_ONBOARDING_MS = 2000;
const ENSURE_PROFILE_MS = 2000;

function logAuth(phase, data) {
  const payload = { phase, timestamp: Date.now(), ...data };
  if (data?.durationMs !== undefined) payload.durationMs = data.durationMs;
  console.log(JSON.stringify(payload));
}

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

async function fetchOnboardingFlagAndStep(userId, timeoutMs = FETCH_ONBOARDING_MS) {
  const start = Date.now();
  const p = supabase.from('user_profiles').select('onboarding_completed, onboarding_step').eq('id', userId).maybeSingle();
  try {
    const res = await withTimeout(p, timeoutMs, 'FETCH_ONBOARDING_TIMEOUT');
    const durationMs = Date.now() - start;
    const completed = res?.data?.onboarding_completed === true;
    const step = Math.max(0, Number(res?.data?.onboarding_step) || 0);
    logAuth('FETCH_ONBOARDING', { authStatus: 'signedIn', onboardingStatus: completed ? 'complete' : 'incomplete', onboardingStep: step, durationMs });
    return { status: completed ? 'complete' : 'incomplete', step };
  } catch (e) {
    const durationMs = Date.now() - start;
    logAuth('FETCH_ONBOARDING', { errorCode: e?.message ?? 'FETCH_ONBOARDING_TIMEOUT', onboardingStatus: 'incomplete', durationMs });
    return { status: 'incomplete', step: 0 };
  }
}

async function ensureUserProfileExists(userId, email) {
  const start = Date.now();
  const username = 'user_' + String(userId).replace(/-/g, '').slice(0, 8);
  const p = upsertUser(userId, {
    email: email || undefined,
    onboarding_completed: false,
    onboarding_step: 2,
    first_name: 'Utilisateur',
    username,
  });
  try {
    await withTimeout(p.then((r) => r.error && Promise.reject(r.error)), ENSURE_PROFILE_MS, 'ENSURE_PROFILE_TIMEOUT');
    logAuth('ENSURE_PROFILE', { userId: userId?.slice(0, 8), durationMs: Date.now() - start });
  } catch (e) {
    logAuth('ENSURE_PROFILE', { errorCode: e?.message ?? 'ENSURE_PROFILE_TIMEOUT', durationMs: Date.now() - start });
  }
}

export function AuthProvider({ children }) {
  // Au boot : forcer l'écran Auth (pas d'auto-login). Jamais de signOut au démarrage.
  const [manualLoginRequired, setManualLoginRequired] = useState(true);
  const [authStatus, setAuthStatus] = useState('signedOut');
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState('unknown');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const listenerUnsub = useRef(null);

  const setOnboardingInBackground = (userId) => {
    if (!userId) return;
    fetchOnboardingFlagAndStep(userId).then(({ status, step }) => {
      setOnboardingStatus(status);
      setOnboardingStep((prev) => (step > prev ? step : prev));
    }).catch(() => setOnboardingStatus('incomplete'));
  };

  // Au boot : détruire la session LOCALEMENT uniquement (pas global). Évite 403/getUser en boucle.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        logAuth('BOOT_SIGNOUT_LOCAL', { message: 'start' });
        await supabase.auth.signOut({ scope: 'local' });
        if (mounted) logAuth('BOOT_SIGNOUT_LOCAL', { message: 'done' });
      } catch (e) {
        if (mounted) logAuth('BOOT_SIGNOUT_LOCAL', { error: e?.message });
      }
    })();
    return () => { mounted = false; };
  }, []);

  // SEUL listener auth de l'app. RootGate dérive le routing de cet état (pas de navigation dans Signup/Login).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      logAuth('AUTH_EVT', { event, userId: sess?.user?.id?.slice(0, 8) ?? 'null' });

      if (event === 'INITIAL_SESSION') {
        // Ne pas restaurer l'UI : à chaque lancement on exige une connexion manuelle.
        return;
      }

      if (event === 'SIGNED_IN' && sess?.user) {
        setSession(sess);
        setUser(sess.user);
        setManualLoginRequired(false);
        setAuthStatus('signedIn');
        setOnboardingStatus('incomplete');
        setOnboardingStep(2);
        logAuth('EVT_SIGNED_IN', { authStatus: 'signedIn' });
        ensureUserProfileExists(sess.user.id, sess.user.email).then(() => {
          setOnboardingInBackground(sess.user.id);
        }).catch(() => setOnboardingInBackground(sess.user.id));
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setAuthStatus('signedOut');
        setOnboardingStatus('unknown');
        setOnboardingStep(0);
        logAuth('EVT_SIGNED_OUT', { authStatus: 'signedOut' });
      }
    });

    const unsubscribe = sub?.subscription?.unsubscribe ?? null;
    listenerUnsub.current = unsubscribe;
    return () => {
      if (typeof listenerUnsub.current === 'function') listenerUnsub.current();
      listenerUnsub.current = null;
    };
  }, []);

  const value = {
    authStatus,
    manualLoginRequired,
    session,
    user,
    onboardingStatus,
    onboardingStep,
    setOnboardingStep,
    loading,
    setLoading,
    setOnboardingStatus,
    refreshOnboardingStatus: () => user?.id && setOnboardingInBackground(user.id),
    signOut: async () => {
      setOnboardingStep(0);
      await supabase.auth.signOut();
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
