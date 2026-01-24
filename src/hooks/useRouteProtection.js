/**
 * Hook de protection des routes
 * Vérifie l'accès et redirige si nécessaire
 */

import { useEffect, useState } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  canAccessRoute,
  protectRoute,
  checkAndRedirectOnFocus,
} from '../services/navigationService';
import { getAuthState } from '../services/authState';

/**
 * Hook pour protéger une route
 * Vérifie l'accès et redirige si nécessaire
 * 
 * @param {string} routeName - Nom de la route à protéger
 * @param {Object} options - Options de protection
 * @returns {Object} État de la protection
 */
export function useRouteProtection(routeName, options = {}) {
  const navigation = useNavigation();
  const route = useRoute();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  const {
    onAccessDenied = null,
    checkOnFocus = true, // Vérifier à chaque focus
  } = options;

  // Vérification initiale
  useEffect(() => {
    checkAccess();
  }, []);

  // Vérification au focus de l'écran
  useFocusEffect(
    useCallback(() => {
      if (checkOnFocus) {
        checkAccess();
      }
    }, [checkOnFocus])
  );

  const checkAccess = async () => {
    try {
      setIsChecking(true);

      const { allowed, redirectTo } = await canAccessRoute(routeName);

      if (!allowed && redirectTo) {
        console.log(`[useRouteProtection] Accès refusé à ${routeName}, redirection vers ${redirectTo}`);
        
        if (onAccessDenied) {
          onAccessDenied(redirectTo);
        }

        await protectRoute(routeName, navigation);
        setIsAllowed(false);
      } else {
        setIsAllowed(true);
      }
    } catch (error) {
      console.error('[useRouteProtection] Erreur:', error);
      setIsAllowed(false);
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isChecking,
    isAllowed,
    checkAccess,
  };
}

/**
 * Hook pour vérifier l'authentification
 * Retourne l'état d'authentification et l'état d'onboarding
 */
export function useAuth() {
  const [authState, setAuthState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      setLoading(true);
      const state = await getAuthState();
      setAuthState(state);
    } catch (error) {
      console.error('[useAuth] Erreur:', error);
      setAuthState(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = async () => {
    await loadAuthState();
  };

  return {
    authState,
    loading,
    isAuthenticated: authState?.isAuthenticated || false,
    hasCompletedOnboarding: authState?.hasCompletedOnboarding || false,
    userId: authState?.userId || null,
    email: authState?.email || null,
    refreshAuth,
  };
}

/**
 * Hook pour protéger l'accès à l'application principale
 * Redirige vers onboarding si pas complété
 */
export function useMainAppProtection() {
  return useRouteProtection('Main', {
    checkOnFocus: true,
    onAccessDenied: (redirectTo) => {
      console.log('[useMainAppProtection] Accès refusé, redirection vers:', redirectTo);
    },
  });
}

/**
 * Hook pour protéger l'accès à l'onboarding
 * Redirige vers Main si déjà complété
 */
export function useOnboardingProtection() {
  return useRouteProtection('Onboarding', {
    checkOnFocus: true,
    onAccessDenied: (redirectTo) => {
      console.log('[useOnboardingProtection] Accès refusé, redirection vers:', redirectTo);
    },
  });
}

/**
 * Hook pour gérer la navigation initiale au démarrage de l'app
 */
export function useInitialNavigation() {
  const navigation = useNavigation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    handleInitialNavigation();
  }, []);

  const handleInitialNavigation = async () => {
    try {
      const { determineInitialRoute } = require('../services/navigationService');
      const initialRoute = await determineInitialRoute();

      console.log('[useInitialNavigation] Route initiale:', initialRoute);

      // Laisser React Navigation gérer la navigation initiale
      setIsReady(true);
    } catch (error) {
      console.error('[useInitialNavigation] Erreur:', error);
      setIsReady(true);
    }
  };

  return { isReady };
}

/**
 * Hook pour vérifier si l'utilisateur doit passer par l'onboarding
 */
export function useRequiresOnboarding() {
  const { authState, loading } = useAuth();
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && authState) {
      const requires = authState.isAuthenticated && !authState.hasCompletedOnboarding;
      setRequiresOnboarding(requires);
    }
  }, [authState, loading]);

  return { requiresOnboarding, loading };
}
