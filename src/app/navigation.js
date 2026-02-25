import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { getWebOrigin } from '../config/webUrl';
import { navigationRef, isReadyRef } from '../navigation/navigationRef';
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
 */
export function RootNavigator() {
  return (
    <NavigationContainer
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
