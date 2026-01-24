/**
 * Composant de protection des routes
 * Vérifie l'accès et redirige si nécessaire
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouteProtection } from '../hooks/useRouteProtection';

/**
 * Wrapper pour protéger un écran
 * 
 * @param {Object} props
 * @param {React.Component} props.children - Composant enfant à protéger
 * @param {string} props.routeName - Nom de la route à protéger
 * @param {React.Component} props.LoadingComponent - Composant de chargement (optionnel)
 */
export default function ProtectedRoute({ children, routeName, LoadingComponent }) {
  const { isChecking, isAllowed } = useRouteProtection(routeName);

  // Afficher le chargement pendant la vérification
  if (isChecking) {
    if (LoadingComponent) {
      return <LoadingComponent />;
    }

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Vérification...</Text>
      </View>
    );
  }

  // Si accès refusé, ne rien afficher (redirection en cours)
  if (!isAllowed) {
    return null;
  }

  // Afficher le contenu protégé
  return <>{children}</>;
}

/**
 * HOC (Higher Order Component) pour protéger un écran
 * 
 * Usage:
 * const ProtectedFeedScreen = withRouteProtection(FeedScreen, 'Main');
 * export default ProtectedFeedScreen;
 */
export function withRouteProtection(Component, routeName) {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute routeName={routeName}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
