/**
 * Écran Paramètres — redesign DA Align
 * Header ALIGN, sections COMPTE / PROGRESSION / LÉGAL, blocs #333D4B, bouton SE DÉCONNECTER.
 * Aucun autre écran modifié.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getUserProfile } from '../../lib/userProfile';
import { getUserProgress } from '../../lib/userProgressSupabase';
import { signOut } from '../../services/auth';
import { clearAuthState } from '../../services/authState';
import Header from '../../components/Header';
import BottomNavBar from '../../components/BottomNavBar';
import HoverableText from '../../components/HoverableText';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';

// Rayon unique pour tous les blocs (très arrondi)
const BLOCK_RADIUS = 48;
// Dégradé titres de sections : FF7B2B → FFD93F (Bowlby One SC)
const SECTION_TITLE_GRADIENT = ['#FF7B2B', '#FFD93F'];
const LABEL_COLOR = '#ACACAC';
const BLOCK_BG = '#333D4B';
const LOGOUT_RED = '#EC3912';

/** Nom lisible pour secteur ou métier (progress) */
function getMetierDisplayName(progress) {
  if (!progress) return 'Non défini';
  const metier = progress.activeMetier || progress.activeMetierId;
  const sector = progress.activeDirection;
  const metierNames = {
    developpeur: 'Développeur logiciel',
    entrepreneur: 'Entrepreneur',
    designer: 'Designer',
    avocat: 'Avocat',
    medecin: 'Médecin',
    data_scientist: 'Data Scientist',
  };
  const sectorNames = {
    tech: 'Tech',
    business: 'Business',
    creation: 'Création',
    droit: 'Droit',
    sante: 'Santé',
    santé: 'Santé',
  };
  if (metier && metierNames[metier]) return metierNames[metier];
  if (sector && sectorNames[sector]) return sectorNames[sector];
  if (metier) return String(metier).charAt(0).toUpperCase() + String(metier).slice(1).replace(/_/g, ' ');
  if (sector) return String(sector).charAt(0).toUpperCase() + String(sector).slice(1);
  return 'Non défini';
}

/** Remonte au navigator racine (pour reset vers Choice/Login). */
function getRootNavigation(nav) {
  if (!nav || typeof nav.getParent !== 'function') return nav;
  let n = nav;
  try {
    while (n) {
      const parent = n.getParent();
      if (!parent || parent === n) break;
      n = parent;
    }
  } catch (_) {}
  return n;
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const logoutRef = useRef(null);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  // .hover-lift appliqué via className (pas ref) pour ne pas être écrasé par React au re-render.

  const loadData = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
      const userProgress = await getUserProgress();
      setProgress(userProgress);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    }
  };

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
        Alert.alert('Erreur', 'Impossible de se déconnecter, réessaie.');
        return;
      }
      await clearAuthState();
      const rootNav = getRootNavigation(navigation);
      (rootNav || navigation).reset({
        index: 0,
        routes: [{ name: 'Choice' }],
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter, réessaie.');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleAbout = () => {
    navigation.navigate('About');
  };

  const email = userProfile?.email || 'Non défini';
  const birthdate = userProfile?.birthdate || userProfile?.date_naissance || userProfile?.dateNaissance || 'Non renseigné';
  const birthdateFormatted = birthdate && birthdate !== 'Non renseigné'
    ? (typeof birthdate === 'string' && birthdate.match(/^\d{4}-\d{2}-\d{2}$/) ? birthdate : birthdate)
    : 'Non renseigné';

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Header />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Titre de section : COMPTE — Bowlby One SC, dégradé */}
        <Text style={styles.sectionTitleSpacer} />
        <GradientText colors={SECTION_TITLE_GRADIENT} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 0 }} style={styles.sectionTitle}>
          COMPTE
        </GradientText>
        <View style={styles.block}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>ADRESSE E-MAIL</Text>
            <Text style={styles.value}>{email}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoItem}>
            <Text style={styles.label}>DATE DE NAISSANCE</Text>
            <Text style={styles.value}>{birthdateFormatted}</Text>
          </View>
        </View>

        {/* Titre de section : PROGRESSION */}
        <GradientText colors={SECTION_TITLE_GRADIENT} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 0 }} style={styles.sectionTitle}>
          PROGRESSION
        </GradientText>
        <View style={styles.block}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>MÉTIER CHOISI</Text>
            <Text style={styles.value}>{getMetierDisplayName(progress)}</Text>
          </View>
        </View>

        {/* Titre de section : LÉGAL */}
        <GradientText colors={SECTION_TITLE_GRADIENT} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 0 }} style={styles.sectionTitle}>
          LÉGAL
        </GradientText>
        <View style={styles.block}>
          <TouchableOpacity style={styles.legalItem} onPress={handlePrivacyPolicy} activeOpacity={0.8}>
            <HoverableText style={styles.legalText} hoverColor="#FF7B2B">
              Politique de confidentialité
            </HoverableText>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.legalItem} onPress={handleAbout} activeOpacity={0.8}>
            <HoverableText style={styles.legalText} hoverColor="#FF7B2B">
              À propos
            </HoverableText>
          </TouchableOpacity>
        </View>

        {/* Bouton SE DÉCONNECTER — .hover-lift via className ; transition longhands pour durée 420ms. */}
        <TouchableOpacity
          ref={logoutRef}
          style={[
            styles.logoutButton,
            Platform.OS === 'web' && {
              transitionProperty: 'transform, box-shadow',
              transitionDuration: '520ms',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            },
          ]}
          onPress={handleLogout}
          {...(Platform.OS === 'web' ? { className: 'hover-lift' } : {})}
          activeOpacity={0.85}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.logoutButtonText}>SE DÉCONNECTER</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNavBar />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  sectionTitleSpacer: {
    height: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.title,
    marginBottom: 12,
    marginLeft: 32,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  block: {
    marginBottom: 28,
    paddingVertical: 20,
    paddingLeft: 40,
    paddingRight: 20,
    backgroundColor: BLOCK_BG,
    borderRadius: BLOCK_RADIUS,
  },
  infoItem: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.button,
    color: LABEL_COLOR,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  separator: {
    height: 1,
    backgroundColor: LABEL_COLOR,
    marginVertical: 14,
    opacity: 0.6,
  },
  legalItem: {
    paddingVertical: 12,
  },
  legalText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  logoutButton: {
    alignSelf: 'stretch',
    backgroundColor: LOGOUT_RED,
    borderRadius: BLOCK_RADIUS,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  logoutButtonText: {
    fontSize: 18,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
