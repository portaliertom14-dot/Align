import React, { useRef } from 'react';
import { View } from 'react-native';
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
          Paywall: 'paywall',
          PaywallSuccess: 'paywall/success',
          ResultatMetier: 'resultat-metier',
          OrientationMetier: 'orientation-metier',
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
  const containerKey = recoveryKeyActive ? 'recovery' : authStatus;

  return (
    <View style={{ flex: 1 }}>
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
    </View>
  );
}

/** Alias pour compatibilité : utilise RootNavigator (state-derived). */
export function AppNavigator(props) {
  return <RootNavigator {...props} />;
}
