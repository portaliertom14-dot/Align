import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { getWebOrigin } from '../config/webUrl';
import { navigationRef, isReadyRef } from '../navigation/navigationRef';
import { useAuth } from '../context/AuthContext';
import { isRecoveryFlow } from '../lib/recoveryUrl';
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
 * Container prêt → isReadyRef pour safeReset si besoin ailleurs.
 * Clé sur le container : à la déconnexion (authStatus → signedOut), remontage pour réinitialiser
 * l'état de navigation et afficher AuthStack/Welcome au lieu d'un écran vide.
 * En flux recovery (/reset-password) : clé stable "recovery" pour éviter remontage au SIGNED_IN
 * (sinon boucle infinie : remontage → setSession à nouveau → SIGNED_IN → remontage…).
 */
export function RootNavigator() {
  const { authStatus } = useAuth();
  const isRecovery = typeof window !== 'undefined' && isRecoveryFlow();
  const containerKey = isRecovery ? 'recovery' : authStatus;
  // #region agent log
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    const payload = { sessionId: '89e9d0', location: 'navigation.js:RootNavigator', message: 'containerKey', data: { containerKey, isRecoveryFlow: isRecovery, authStatus }, timestamp: Date.now(), hypothesisId: 'A' };
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
