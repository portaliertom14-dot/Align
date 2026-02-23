/**
 * AuthProvider — Mode "zéro session persistée" côté UI (progression conservée en DB).
 * - Au boot : signOut({ scope: "local" }) une seule fois, puis manualLoginRequired = true, authStatus = "signedOut".
 * - Jamais de signOut global au boot.
 * - signedIn uniquement après login/signup manuel (SIGNED_IN) → manualLoginRequired = false.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { withTimeout } from '../lib/withTimeout';
import { ensureProfileRowExistsForLogin, markOnboardingCompleted } from '../services/userService';

const ONBOARDING_COMPLETE_CACHE_KEY = (userId) => `@align_onboarding_complete_${userId}`;

const FETCH_ONBOARDING_MS = 15000;

function logAuth(phase, data) {
  const payload = { phase, timestamp: Date.now(), ...data };
  if (data?.durationMs !== undefined) payload.durationMs = data.durationMs;
  console.log(JSON.stringify(payload));
}

function logAuthFlow(msg, data) {
  if (__DEV__) console.log('[AUTH_FLOW]', msg, data ?? '');
}

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Source de vérité = DB. Retourne { status, step, firstName, profile } pour routing + logs. */
async function fetchProfileForRouting(userId, timeoutMs = FETCH_ONBOARDING_MS) {
  const start = Date.now();
  logAuthFlow('PROFILE_FETCH_START', { userId: userId?.slice(0, 8) });
  const p = supabase
    .from('user_profiles')
    .select('onboarding_completed, onboarding_step, first_name, username')
    .eq('id', userId)
    .maybeSingle();
  try {
    const res = await withTimeout(p, timeoutMs, 'FETCH_ONBOARDING_TIMEOUT');
    const durationMs = Date.now() - start;
    const row = res?.data ?? null;
    const hasProfileRow = row != null;
    const completed = row?.onboarding_completed === true;
    const step = Math.max(0, Number(row?.onboarding_step) || 0);
    let firstName = (row?.first_name ?? '').toString().trim() || null;
    if (firstName && firstName.toLowerCase() === 'utilisateur') {
      firstName = null;
    }
    const usernameRaw = (row?.username ?? '').toString().trim() || null;
    const hasFirstName = !!firstName;
    const hasUsername = !!usernameRaw;

    const profile = hasProfileRow
      ? { onboarding_completed: row.onboarding_completed, onboarding_step: row.onboarding_step, first_name: row.first_name ?? null, username: row.username ?? null }
      : null;
    if (__DEV__) {
      console.log('[AUTH_FLOW] PROFILE', JSON.stringify(profile, null, 2));
      console.log('[AUTH_FLOW] DECISION_INPUTS', JSON.stringify({ onboardingStatus: completed ? 'complete' : 'incomplete', onboardingStep: step, hasUsername, hasFirstName, hasProfileRow }, null, 2));
    }
    if (completed && userId) {
      AsyncStorage.setItem(ONBOARDING_COMPLETE_CACHE_KEY(userId), 'true').catch(() => {});
    }
    let status = completed ? 'complete' : 'incomplete';
    if (!completed && userId) {
      try {
        const cached = await AsyncStorage.getItem(ONBOARDING_COMPLETE_CACHE_KEY(userId));
        if (cached === 'true') {
          logAuthFlow('ROUTE_FALLBACK_CACHE', { reason: 'db_incomplete_cache_complete', usedCache: true });
          if (__DEV__) console.log('[AUTH_FLOW] DB incomplete but cache complete → Feed, repairing DB');
          status = 'complete';
          markOnboardingCompleted(userId).catch(() => {});
        }
      } catch (_) {}
    }
    logAuthFlow('PROFILE_FETCH_END', { onboardingStatus: status, onboardingStep: step, hasFirstName, hasUsername, hasProfileRow, durationMs });
    return { status, step, firstName, hasProfileRow };
  } catch (e) {
    const durationMs = Date.now() - start;
    if (__DEV__) {
      console.log('[AUTH_FLOW] PROFILE', null);
      console.log('[AUTH_FLOW] DECISION_INPUTS', JSON.stringify({ onboardingStatus: 'incomplete', onboardingStep: 0, hasUsername: false, hasFirstName: false, hasProfileRow: false, error: e?.message }, null, 2));
    }
    logAuthFlow('PROFILE_FETCH_END', { error: e?.message, onboardingStatus: 'incomplete', durationMs });
    if (e?.message === 'FETCH_ONBOARDING_TIMEOUT' && userId) {
      try {
        const cached = await AsyncStorage.getItem(ONBOARDING_COMPLETE_CACHE_KEY(userId));
        if (cached === 'true') {
          logAuthFlow('ROUTE_FALLBACK_CACHE', { reason: 'timeout', usedCache: true });
          if (__DEV__) console.log('[AUTH_FLOW] Timeout: using cached onboarding_complete → Feed');
          return { status: 'complete', step: 3, firstName: null, hasProfileRow: true };
        }
      } catch (_) {}
    }
    return { status: 'incomplete', step: 0, firstName: null, hasProfileRow: false };
  }
}

export function AuthProvider({ children }) {
  const [manualLoginRequired, setManualLoginRequired] = useState(true);
  const [authStatus, setAuthStatus] = useState('signedOut');
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState('unknown');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);
  const [hasProfileRow, setHasProfileRow] = useState(false);
  const [userFirstName, setUserFirstName] = useState(null);
  const [loading, setLoading] = useState(false);
  const listenerUnsub = useRef(null);

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
        const userId = sess.user.id;
        setSession(sess);
        setUser(sess.user);
        setManualLoginRequired(false);
        setAuthStatus('signedIn');
        setProfileLoading(true);
        logAuthFlow('SIGNED_IN', userId);
        // Source de vérité = DB. Ne pas router avant d'avoir le profil.
        fetchProfileForRouting(userId)
          .then(({ status, step, firstName, hasProfileRow: hasRow }) => {
            setOnboardingStatus(status);
            setOnboardingStep(step);
            setHasProfileRow(hasRow ?? false);
            setUserFirstName(firstName);
            setProfileLoading(false);
            const screen = status === 'complete' ? 'Main/Feed' : 'Onboarding';
            if (__DEV__) console.log('[AUTH_FLOW] ROUTE_DECISION', JSON.stringify({ screen, onboardingStatus: status, onboardingStep: step }, null, 2));
            // Après signup, le profil peut être créé juste après notre fetch → retry une fois si pas de ligne.
            if (!hasRow && userId) {
              setTimeout(() => {
                fetchProfileForRouting(userId).then((retry) => {
                  if (retry.hasProfileRow) {
                    setOnboardingStatus(retry.status);
                    setOnboardingStep(retry.step);
                    setHasProfileRow(true);
                    if (retry.firstName) setUserFirstName(retry.firstName);
                    if (__DEV__) console.log('[AUTH_FLOW] ROUTE_DECISION (retry post-signup)', JSON.stringify({ screen: 'Onboarding', onboardingStep: retry.step }, null, 2));
                  }
                }).catch(() => {});
              }, 700);
            }
          })
          .catch(() => {
            setOnboardingStatus('incomplete');
            setOnboardingStep(2);
            setHasProfileRow(false);
            setUserFirstName(null);
            setProfileLoading(false);
            if (__DEV__) console.log('[AUTH_FLOW] ROUTE_DECISION', JSON.stringify({ screen: 'Onboarding', fallback: true }, null, 2));
          })
          .finally(() => {
            // Délai pour laisser signUp() créer le profil en premier (évite 409/FK race).
            setTimeout(() => {
              ensureProfileRowExistsForLogin(userId, sess.user.email).catch(() => {});
            }, 500);
          });
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setAuthStatus('signedOut');
        setOnboardingStatus('unknown');
        setOnboardingStep(0);
        setHasProfileRow(false);
        setUserFirstName(null);
        setProfileLoading(false);
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

  const refreshProfileFromDb = () => {
    if (!user?.id) return;
    fetchProfileForRouting(user.id).then(({ status, step, firstName, hasProfileRow: hasRow }) => {
      setOnboardingStatus(status);
      setOnboardingStep((prev) => (step > prev ? step : prev));
      setHasProfileRow(hasRow ?? false);
      setUserFirstName(firstName);
    }).catch(() => {});
  };

  const value = {
    authStatus,
    manualLoginRequired,
    session,
    user,
    onboardingStatus,
    onboardingStep,
    profileLoading,
    hasProfileRow,
    userFirstName,
    setOnboardingStep,
    loading,
    setLoading,
    setOnboardingStatus,
    refreshOnboardingStatus: refreshProfileFromDb,
    signOut: async () => {
      setOnboardingStep(0);
      setUserFirstName(null);
      await supabase.auth.signOut();
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
