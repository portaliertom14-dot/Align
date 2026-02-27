import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { getWebOrigin } from '../config/webUrl';
import { navigationRef, isReadyRef } from '../navigation/navigationRef';
import { useAuth } from '../context/AuthContext';
import { ALIGN_RECOVERY_KEY_ACTIVE } from '../lib/recoveryUrl';
import RootGate from '../navigation/RootGate';

const origin = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : (getWebOrigin() || '');
const linking = origin
  ? {
      prefixes: [origin],
      config: {
        screens: {
          ResetPassword: 'reset-password',
          ForgotPassword: 'forgot-password',
          Login: 'auth',
          Welcome: '',
          Invite: 'invite',
        },
      },
    }
  : undefined;

/**
 * Navigation 100% dérivée d'état via RootGate (aucun reset ici).
 * Clé sur le container : à la déconnexion (authStatus → signedOut), remontage pour réinitialiser l'état.
 * Sur /reset-password : key = 'recovery' pour éviter remount → setSession en boucle.
 * sessionStorage garde l'état "recovery" même si RootNavigator remonte (parent au-dessus), ref seul ne survivrait pas.
 */
export function RootNavigator() {
  const { authStatus } = useAuth();

  const containerKeyRef = useRef(null);
  if (containerKeyRef.current === null) {
    const onResetPassword =
      typeof window !== 'undefined' &&
      ((window.location.pathname || '').includes('reset-password') ||
       (window.location.href || '').includes('reset-password'));
    let recoveryKeyActive = onResetPassword;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        if (onResetPassword) window.sessionStorage.setItem(ALIGN_RECOVERY_KEY_ACTIVE, '1');
        recoveryKeyActive = recoveryKeyActive || window.sessionStorage.getItem(ALIGN_RECOVERY_KEY_ACTIVE) === '1';
      } catch (_) {}
    }
    containerKeyRef.current = recoveryKeyActive ? 'recovery' : authStatus;
  }
  const containerKey = containerKeyRef.current;

  // #region agent log
  if (typeof window !== 'undefined' && window.location && typeof fetch !== 'undefined') {
    const payload = { sessionId: '89e9d0', location: 'navigation.js:RootNavigator', message: 'containerKey', data: { pathname: window.location.pathname, href: window.location.href, authStatus, containerKey }, timestamp: Date.now(), hypothesisId: 'A' };
    fetch('http://127.0.0.1:7242/ingest/6c6b31a2-1bcc-4107-bd97-d9eb4c4433be', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89e9d0' }, body: JSON.stringify(payload) }).catch(function() {});
  }
  // #endregion

  return (
    <NavigationContainer
      key={containerKey}
      ref={navigationRef}
      linking={linking}
      onReady={() => {
        isReadyRef.current = true;
      }}
    >
      <RootGate />
    </NavigationContainer>
  );
}

/** Alias pour compatibilité : utilise RootNavigator (state-derived). */
export function AppNavigator(props) {
  return <RootNavigator {...props} />;
}
