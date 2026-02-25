/**
 * AuthProvider — Mode "zéro session persistée" côté UI (progression conservée en DB).
 *
 * Règles absolues :
 * - Un seul PROFILE_FETCH par SIGNED_IN (lastProfileFetchUserIdRef). Verrou routeDecisionLock pendant le fetch.
 * - refreshProfileFromDb ne doit JAMAIS repasser onboardingStatus à 'incomplete' si déjà 'complete' (évite race ChargementRoutine).
 * - Au boot : signOut({ scope: "local" }) une seule fois. signedIn uniquement après login/signup manuel.
 * - SIGNED_OUT : appliqué UNIQUEMENT si userInitiatedSignOutRef (déconnexion volontaire). Sinon, si on est signedIn, on ignore
 *   pour éradiquer le bug "retour écran prénom/pseudo" (SIGNED_OUT retardé du boot ou doublon).
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { withTimeout } from '../lib/withTimeout';
import { ensureProfileRowExistsForLogin, markOnboardingCompleted } from '../services/userService';
import { setProfileCache } from '../services/userProfileService';
import { getLock, releaseLock } from '../lib/routeDecisionLock';
import { isRecoveryMode } from '../lib/recoveryMode';

const ONBOARDING_COMPLETE_CACHE_KEY = (userId) => `@align_onboarding_complete_${userId}`;

const FETCH_ONBOARDING_MS = 15000;
const PROFILE_FETCH_RETRY_DELAY_MS = 800;

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

/** Source de vérité = DB uniquement. Aucun fallback cache pour la décision métier.
 * En cas d'erreur : retry une fois, puis retour incomplete (pas d'accès app via cache). */
async function fetchProfileForRouting(userId, timeoutMs = FETCH_ONBOARDING_MS, retryCount = 0) {
  const start = Date.now();
  logAuthFlow('PROFILE_FETCH_START', { userId: userId?.slice(0, 8) });
  const p = supabase
    .from('user_profiles')
    .select('onboarding_completed, onboarding_step, first_name, username, school_level, birthdate')
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

    const schoolLevel = row?.school_level != null ? String(row.school_level).trim() || null : null;
    const birthdate = row?.birthdate != null ? String(row.birthdate) : null;
    setProfileCache(userId, {
      firstName: row?.first_name ?? row?.prenom ?? null,
      birthdate,
      school_level: schoolLevel,
    });
    if (__DEV__) {
      console.log('[PROFILE_CACHE] school_level final (from fetchProfileForRouting)', schoolLevel);
    }

    if (__DEV__) {
      console.log('[AUTH_FLOW] PROFILE', JSON.stringify({ onboarding_completed: completed, onboarding_step: step, hasProfileRow }, null, 2));
    }
    if (completed && userId) {
      AsyncStorage.setItem(ONBOARDING_COMPLETE_CACHE_KEY(userId), 'true').catch(() => {});
    }
    const status = completed ? 'complete' : 'incomplete';
    logAuthFlow('PROFILE_FETCH_END', { onboardingStatus: status, onboardingStep: step, hasProfileRow, durationMs });
    return { status, step, firstName, hasProfileRow, hasFirstName };
  } catch (e) {
    const durationMs = Date.now() - start;
    if (__DEV__) {
      console.log('[AUTH_FLOW] PROFILE_FETCH_END', { error: e?.message, onboardingStatus: 'incomplete' });
    }
    logAuthFlow('PROFILE_FETCH_END', { error: e?.message, onboardingStatus: 'incomplete', durationMs });

    if (retryCount < 1 && userId) {
      await new Promise((r) => setTimeout(r, PROFILE_FETCH_RETRY_DELAY_MS));
      return fetchProfileForRouting(userId, timeoutMs, retryCount + 1);
    }
    return { status: 'incomplete', step: 0, firstName: null, hasProfileRow: false, hasFirstName: false };
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
  const [bootReady, setBootReady] = useState(false);
  const listenerUnsub = useRef(null);
  const lastProfileFetchUserIdRef = useRef(null);
  const onboardingStatusRef = useRef(onboardingStatus);
  const authStatusRef = useRef(authStatus);
  onboardingStatusRef.current = onboardingStatus;
  authStatusRef.current = authStatus;
  const bootSignOutCompletedRef = useRef(false);
  const userInitiatedSignOutRef = useRef(false);

  // Au boot : détruire la session LOCALEMENT uniquement (pas global). On n'affiche l'AuthStack qu'une fois terminé.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        logAuth('BOOT_SIGNOUT_LOCAL', { message: 'start' });
        await supabase.auth.signOut({ scope: 'local' });
        if (mounted) {
          bootSignOutCompletedRef.current = true;
          logAuth('BOOT_SIGNOUT_LOCAL', { message: 'done' });
        }
      } catch (e) {
        if (mounted) logAuth('BOOT_SIGNOUT_LOCAL', { error: e?.message });
      } finally {
        if (mounted) setBootReady(true);
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

      if (event === 'SIGNED_OUT') {
        // N'appliquer SIGNED_OUT que si l'utilisateur a explicitement demandé la déconnexion (Settings, reset password, suppression compte).
        // Tout autre SIGNED_OUT (boot retardé, doublon, ordre d'événements) → ignoré pour ne plus jamais revenir à l'écran prénom/pseudo.
        if (!userInitiatedSignOutRef.current) {
          logAuth('EVT_SIGNED_OUT_IGNORED', { reason: 'not_user_initiated' });
          return;
        }
        userInitiatedSignOutRef.current = false;
        authStatusRef.current = 'signedOut';
        releaseLock();
        lastProfileFetchUserIdRef.current = null;
        setSession(null);
        setUser(null);
        setAuthStatus('signedOut');
        setOnboardingStatus('unknown');
        setOnboardingStep(0);
        setHasProfileRow(false);
        setUserFirstName(null);
        setProfileLoading(false);
        logAuth('EVT_SIGNED_OUT', { authStatus: 'signedOut' });
        return;
      }

      if (event === 'SIGNED_IN' && sess?.user) {
        const userId = sess.user.id;
        authStatusRef.current = 'signedIn';
        setSession(sess);
        setUser(sess.user);
        setManualLoginRequired(false);
        setAuthStatus('signedIn');
        if (isRecoveryMode()) {
          setProfileLoading(false);
          return;
        }
        if (lastProfileFetchUserIdRef.current === userId) return;
        lastProfileFetchUserIdRef.current = userId;
        getLock('signed_in_fetch');
        setProfileLoading(true);
        logAuthFlow('SIGNED_IN', userId?.slice(0, 8));
        fetchProfileForRouting(userId)
          .then(({ status, step, firstName, hasProfileRow: hasRow, hasFirstName: hasFirst }) => {
            setOnboardingStatus(status);
            const effectiveStep = hasRow && !hasFirst ? 2 : step;
            setOnboardingStep(effectiveStep);
            setHasProfileRow(hasRow ?? false);
            setUserFirstName(firstName);
            setProfileLoading(false);
            releaseLock();
            if (__DEV__) console.log('[AUTH_FLOW] ROUTE_DECISION', JSON.stringify({ screen: status === 'complete' ? 'Main/Feed' : 'Onboarding', onboardingStatus: status, onboardingStep: effectiveStep }));
          })
          .catch(() => {
            setOnboardingStatus('incomplete');
            setOnboardingStep(2);
            setHasProfileRow(false);
            setUserFirstName(null);
            setProfileLoading(false);
            releaseLock();
            if (__DEV__) console.log('[AUTH_FLOW] ROUTE_DECISION', JSON.stringify({ screen: 'Onboarding', fallback: true }));
          })
          .finally(() => {
            setTimeout(() => {
              ensureProfileRowExistsForLogin(userId, sess.user.email).catch(() => {});
            }, 500);
          });
        return;
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
    fetchProfileForRouting(user.id).then(({ status, step, firstName, hasProfileRow: hasRow, hasFirstName: hasFirst }) => {
      const currentStatus = onboardingStatusRef.current;
      if (currentStatus === 'complete') {
        if (__DEV__) console.log('[AUTH_FLOW] refreshProfileFromDb — onboarding already complete, skip routing update');
        setHasProfileRow(hasRow ?? false);
        setUserFirstName(firstName ?? null);
        return;
      }
      setOnboardingStatus(status);
      const effectiveStep = hasRow && !hasFirst ? 2 : step;
      setOnboardingStep((prev) => (effectiveStep > prev ? effectiveStep : prev));
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
    bootReady,
    setOnboardingStep,
    loading,
    setLoading,
    setOnboardingStatus,
    refreshOnboardingStatus: refreshProfileFromDb,
    signOut: async () => {
      userInitiatedSignOutRef.current = true;
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
