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

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { withTimeout } from '../lib/withTimeout';
import { ensureProfileRowExistsForLogin, markOnboardingCompleted } from '../services/userService';
import { setProfileCache } from '../services/userProfileService';
import { getLock, releaseLock } from '../lib/routeDecisionLock';
import { isRecoveryFlow } from '../lib/recoveryUrl';
import { parseRecoveryParamsFromUrl, isRecoveryUrl } from '../lib/recoveryDeepLink';
const ONBOARDING_COMPLETE_CACHE_KEY = (userId) => `@align_onboarding_complete_${userId}`;

const USER_PROFILES_ENDPOINT = 'user_profiles';
function logUserProfilesFetch(phase, data) {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[USER_PROFILES]', phase, typeof data === 'object' && data !== null ? JSON.stringify(data) : data);
  }
}

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

/** True si la session provient d’un sign up récent : ne pas rediriger vers Home, laisser l’onboarding gérer. */
function isNewSignupUser(user) {
  if (!user) return false;
  if (user.user_metadata?.is_new_user === true) return true;
  const created = user.created_at ? new Date(user.created_at).getTime() : 0;
  const now = Date.now();
  if (created && (now - created) < 120000) return true;
  const identityCreated = user.identities?.[0]?.created_at ? new Date(user.identities[0].created_at).getTime() : 0;
  if (identityCreated && (now - identityCreated) < 120000) return true;
  return false;
}

/** Source de vérité = DB uniquement. Aucun fallback cache pour la décision métier.
 * En cas d'erreur : retry une fois, puis retour incomplete (pas d'accès app via cache). */
async function fetchProfileForRouting(userId, timeoutMs = FETCH_ONBOARDING_MS, retryCount = 0) {
  const start = Date.now();
  const pathname = typeof window !== 'undefined' && window.location ? (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '') : '';
  logUserProfilesFetch('before_fetch', { hasSession: !!userId, isRecoveryFlow: isRecoveryFlow(), pathname });
  logAuthFlow('PROFILE_FETCH_START', { userId: userId?.slice(0, 8) });
  const p = supabase
    .from(USER_PROFILES_ENDPOINT)
    .select('onboarding_completed, onboarding_step, first_name, username, school_level, birthdate')
    .eq('id', userId)
    .maybeSingle();
  try {
    const res = await withTimeout(p, timeoutMs, 'FETCH_ONBOARDING_TIMEOUT');
    const durationMs = Date.now() - start;
    if (res?.error) {
      const statusCode = res.error?.status ?? res.error?.code ?? 'unknown';
      logUserProfilesFetch('error', { statusCode, endpoint: USER_PROFILES_ENDPOINT });
    }
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
    const statusCode = e?.status ?? e?.code ?? e?.response?.status ?? 'unknown';
    logUserProfilesFetch('error', { statusCode, endpoint: USER_PROFILES_ENDPOINT });
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
  /** 'signup' = création de compte → Onboarding. 'login' = connexion → Home. Défini uniquement dans onAuthStateChange. */
  const [authOrigin, setAuthOrigin] = useState(null);
  const listenerUnsub = useRef(null);
  const lastProfileFetchUserIdRef = useRef(null);
  const signupUserIdRef = useRef(null);
  const onboardingStatusRef = useRef(onboardingStatus);
  const authStatusRef = useRef(authStatus);
  onboardingStatusRef.current = onboardingStatus;
  authStatusRef.current = authStatus;
  const bootSignOutCompletedRef = useRef(false);
  const userInitiatedSignOutRef = useRef(false);
  const [recoveryMode, setRecoveryModeState] = useState(false);
  const recoveryModeRef = useRef(false);
  const recoveryModeTimeoutRef = useRef(null);

  const setRecoveryMode = (on) => {
    if (recoveryModeTimeoutRef.current) {
      clearTimeout(recoveryModeTimeoutRef.current);
      recoveryModeTimeoutRef.current = null;
    }
    recoveryModeRef.current = !!on;
    setRecoveryModeState(!!on);
    if (on) {
      recoveryModeTimeoutRef.current = setTimeout(() => {
        recoveryModeTimeoutRef.current = null;
        recoveryModeRef.current = false;
        setRecoveryModeState(false);
        if (__DEV__) console.log('[RECOVERY] timeout cleared recoveryMode');
      }, 10000);
    }
  };

  const clearRecoveryMode = () => {
    setRecoveryMode(false);
  };

  // Échanger immédiatement code/tokens du deep link pour session (une seule fois par URL, pas de double getInitialURL).
  const handleRecoveryDeepLink = useCallback(async (url) => {
    if (!url || !isRecoveryUrl(url)) return;
    if (__DEV__) console.log('[RECOVERY] url received:', url.replace(/access_token=[^&]+/, 'access_token=***').replace(/refresh_token=[^&]+/, 'refresh_token=***'));
    setRecoveryMode(true);
    const parsed = parseRecoveryParamsFromUrl(url);
    if (!parsed) return;
    try {
      if (parsed.type === 'code') {
        const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (error) {
          if (__DEV__) console.warn('[RECOVERY] exchangeCodeForSession error', error?.message);
          return;
        }
      } else if (parsed.type === 'tokens') {
        const { error } = await supabase.auth.setSession({ access_token: parsed.access_token, refresh_token: parsed.refresh_token });
        if (error) {
          if (__DEV__) console.warn('[RECOVERY] setSession error', error?.message);
          return;
        }
      }
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user?.id && __DEV__) {
        console.log('[RECOVERY] exchanged session: userId=', sess.session.user.id);
      }
    } catch (e) {
      if (__DEV__) console.warn('[RECOVERY] handleRecoveryDeepLink error', e?.message);
    }
  }, []);

  // Au boot : détruire la session LOCALEMENT uniquement (pas global). SAUF en flux recovery : ne jamais signOut.
  // Mobile : un seul getInitialURL, échange immédiat si URL recovery pour éviter délai et expiration du lien.
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (isRecoveryFlow() || recoveryModeRef.current) {
        if (typeof console !== 'undefined' && console.log) {
          console.log('[RECOVERY_MODE] bypassing profile and guards');
        }
        if (mounted) setBootReady(true);
        return;
      }
      if (Platform.OS !== 'web') {
        try {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl && isRecoveryUrl(initialUrl)) {
            setRecoveryMode(true);
            if (mounted) setBootReady(true);
            handleRecoveryDeepLink(initialUrl).catch(() => {});
            return;
          }
        } catch (e) {
          // continue to signOut
        }
      }
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
  }, [handleRecoveryDeepLink]);

  // Deep link recovery (mobile) : uniquement les URLs reçues après ouverture (pas getInitialURL, déjà traité au boot).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleRecoveryDeepLink(url);
    });
    return () => sub.remove();
  }, [handleRecoveryDeepLink]);

  // SEUL listener auth de l'app. RootGate dérive le routing de cet état (pas de navigation dans Signup/Login).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      logAuth('AUTH_EVT', { event, userId: sess?.user?.id?.slice(0, 8) ?? 'null' });

      if (event === 'INITIAL_SESSION') {
        // Web recovery : arrivée sur /reset-password avec hash → Supabase émet INITIAL_SESSION. On met la session en state pour afficher le formulaire.
        if (sess?.user && isRecoveryFlow()) {
          authStatusRef.current = 'signedIn';
          setSession(sess);
          setUser(sess.user);
          setManualLoginRequired(false);
          setAuthStatus('signedIn');
          logUserProfilesFetch('bypass', { reason: 'INITIAL_SESSION_recovery' });
          return;
        }
        // Sinon : ne pas restaurer l'UI (connexion manuelle exigée).
        return;
      }

      if (event === 'SIGNED_OUT') {
        // En flux recovery (web ou mobile deep link) : ne jamais appliquer SIGNED_OUT (session temporaire autorisée jusqu'à ce que ResetPasswordScreen ait fini).
        if (isRecoveryFlow() || recoveryModeRef.current) {
          if (typeof console !== 'undefined' && console.log) {
            console.log('[RECOVERY_MODE] bypass guards');
          }
          logAuth('EVT_SIGNED_OUT_IGNORED', { reason: 'recovery_flow' });
          return;
        }
        // N'appliquer SIGNED_OUT que si l'utilisateur a explicitement demandé la déconnexion (Settings, suppression compte).
        // Tout autre SIGNED_OUT (boot retardé, doublon, ordre d'événements) → ignoré pour ne plus jamais revenir à l'écran prénom/pseudo.
        if (!userInitiatedSignOutRef.current) {
          logAuth('EVT_SIGNED_OUT_IGNORED', { reason: 'not_user_initiated' });
          return;
        }
        userInitiatedSignOutRef.current = false;
        authStatusRef.current = 'signedOut';
        releaseLock();
        lastProfileFetchUserIdRef.current = null;
        signupUserIdRef.current = null;
        setAuthOrigin(null);
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

      // CRÉATION DE COMPTE → Onboarding. Toujours. Aucune condition, aucun fetch profile.
      if (event === 'SIGNED_UP' && sess?.user) {
        if (isRecoveryFlow() || recoveryModeRef.current) return;
        const userId = sess.user.id;
        logAuthFlow('SIGNED_UP', userId?.slice(0, 8));
        signupUserIdRef.current = userId;
        setAuthOrigin('signup');
        authStatusRef.current = 'signedIn';
        setSession(sess);
        setUser(sess.user);
        setManualLoginRequired(false);
        setAuthStatus('signedIn');
        setOnboardingStatus('incomplete');
        setOnboardingStep(2);
        setHasProfileRow(false);
        setUserFirstName(null);
        setProfileLoading(false);
        releaseLock();
        if (__DEV__) console.log('[AUTH_FLOW] ROUTE_DECISION', JSON.stringify({ screen: 'Onboarding', reason: 'SIGNED_UP' }));
        return;
      }

      // PASSWORD_RECOVERY : même traitement que SIGNED_IN en recovery (session temporaire, pas de fetch, pas de signOut).
      if (event === 'PASSWORD_RECOVERY' && sess?.user) {
        if (typeof console !== 'undefined' && console.log) {
          console.log('[RECOVERY_MODE] bypassing profile and guards');
        }
        logUserProfilesFetch('bypass', { reason: 'PASSWORD_RECOVERY_no_profile_fetch' });
        authStatusRef.current = 'signedIn';
        setSession(sess);
        setUser(sess.user);
        setManualLoginRequired(false);
        setAuthStatus('signedIn');
        return;
      }

      if (event === 'SIGNED_IN' && sess?.user) {
        const userId = sess.user.id;
        if (isRecoveryFlow() || recoveryModeRef.current) {
          if (typeof console !== 'undefined' && console.log) {
            console.log('[RECOVERY_MODE] bypass guards');
          }
          logUserProfilesFetch('bypass', { isRecoveryFlow: true, pathname: typeof window !== 'undefined' && window.location ? (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '') : '', reason: 'recovery_flow_no_profile_fetch' });
          authStatusRef.current = 'signedIn';
          setSession(sess);
          setUser(sess.user);
          setManualLoginRequired(false);
          setAuthStatus('signedIn');
          return;
        }
        setProfileLoading(true);
        (async () => {
          let flag = null;
          let tsStr = null;
          if (typeof window !== 'undefined' && window.sessionStorage) {
            flag = window.sessionStorage.getItem('align_just_signed_up');
            tsStr = window.sessionStorage.getItem('align_just_signed_up_ts');
          }
          if (flag === null || tsStr === null) {
            flag = await AsyncStorage.getItem('align_just_signed_up');
            tsStr = await AsyncStorage.getItem('align_just_signed_up_ts');
          }
          const ts = tsStr ? parseInt(tsStr, 10) : 0;
          const justSignedUp = flag === '1' && ts && (Date.now() - ts) < 10 * 60 * 1000;
          if (typeof console !== 'undefined' && console.log) {
            console.log('[AUTH_ROUTE] event=SIGNED_IN justSignedUp=', justSignedUp, 'flag=', flag, 'decision=', justSignedUp ? 'OnboardingStart' : (signupUserIdRef.current === userId ? 'keep' : 'AppStackMain'));
          }
          if (justSignedUp) {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              try { window.sessionStorage.removeItem('align_just_signed_up'); window.sessionStorage.removeItem('align_just_signed_up_ts'); } catch (_) {}
            }
            await AsyncStorage.multiRemove(['align_just_signed_up', 'align_just_signed_up_ts']);
            signupUserIdRef.current = userId;
            setAuthOrigin('signup');
            authStatusRef.current = 'signedIn';
            setSession(sess);
            setUser(sess.user);
            setManualLoginRequired(false);
            setAuthStatus('signedIn');
            setOnboardingStatus('incomplete');
            setOnboardingStep(2);
            setHasProfileRow(false);
            setUserFirstName(null);
            setProfileLoading(false);
            releaseLock();
            return;
          }
          if (signupUserIdRef.current === userId) {
            authStatusRef.current = 'signedIn';
            setSession(sess);
            setUser(sess.user);
            setProfileLoading(false);
            return;
          }
          if (isNewSignupUser(sess.user)) {
            logAuthFlow('SIGNED_IN_AS_SIGNUP', userId?.slice(0, 8));
            signupUserIdRef.current = userId;
            setAuthOrigin('signup');
            authStatusRef.current = 'signedIn';
            setSession(sess);
            setUser(sess.user);
            setManualLoginRequired(false);
            setAuthStatus('signedIn');
            setOnboardingStatus('incomplete');
            setOnboardingStep(2);
            setHasProfileRow(false);
            setUserFirstName(null);
            setProfileLoading(false);
            if (typeof console !== 'undefined' && console.log) {
              console.log('[AUTH_ROUTE] event=SIGNED_IN justSignedUp=false (isNewUser) decision=OnboardingStart');
            }
            return;
          }
          lastProfileFetchUserIdRef.current = userId;
          logAuthFlow('SIGNED_IN', userId?.slice(0, 8));
          setAuthOrigin('login');
          authStatusRef.current = 'signedIn';
          setSession(sess);
          setUser(sess.user);
          setManualLoginRequired(false);
          setAuthStatus('signedIn');
          setProfileLoading(false);
          setOnboardingStatus('complete');
          if (typeof console !== 'undefined' && console.log) {
            console.log('[AUTH_ROUTE] event=SIGNED_IN justSignedUp=false decision=AppStackMain');
          }
          setTimeout(() => {
            ensureProfileRowExistsForLogin(userId, sess.user.email).catch(() => {});
          }, 500);
        })();
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
    if (isRecoveryFlow() || recoveryModeRef.current) {
      logUserProfilesFetch('bypass', { isRecoveryFlow: true, pathname: typeof window !== 'undefined' && window.location ? (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '') : '', reason: 'refreshProfileFromDb_skipped' });
      return;
    }
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
    authOrigin,
    manualLoginRequired,
    session,
    user,
    recoveryMode,
    setRecoveryMode,
    clearRecoveryMode,
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
