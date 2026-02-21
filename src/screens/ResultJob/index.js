/**
 * Résultat métier — moteur axes (top 3).
 * Reçoit en params : sectorId, topJobs: [{ title, score }], isFallback.
 * Affiche métier recommandé + 2 alternatives ; bandeau bêta si isFallback.
 */
import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import GradientText from '../../components/GradientText';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { setActiveMetier } from '../../lib/userProgressSupabase';
import { assertJobInWhitelist } from '../../domain/assertJobInWhitelist';
import { theme } from '../../styles/theme';

function getCardWidth(width) {
  if (width <= 600) return Math.min(width * 0.92, 520);
  return Math.min(640, width * 0.9);
}

function clampSize(min, preferred, max) {
  return Math.min(max, Math.max(min, preferred));
}

export default function ResultJobScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute();
  const { sectorId, topJobs = [], isFallback = false, variant = 'default' } = route.params || {};

  const mainJob = topJobs[0];
  const alternatives = topJobs.slice(1, 3);

  const cardWidth = getCardWidth(width);
  const titleSize = clampSize(14, width * 0.038, 20);
  const jobNameSize = clampSize(22, width * 0.06, 32);
  const buttonTextSize = clampSize(16, width * 0.042, 19);

  const handleContinue = async () => {
    if (mainJob?.title) {
      assertJobInWhitelist(sectorId || '', variant || 'default', mainJob.title);
      try {
        await setActiveMetier(mainJob.title);
      } catch (_) {}
    }
    navigation.replace('TonMetierDefini', { metierName: mainJob?.title || 'Métier' });
  };

  if (mainJob?.title && sectorId) {
    assertJobInWhitelist(sectorId, variant || 'default', mainJob.title);
    alternatives.forEach((job) => {
      if (job?.title) assertJobInWhitelist(sectorId, variant || 'default', job.title);
    });
  }

  if (!mainJob) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Aucun résultat. Recommence le quiz métier.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.replace('QuizMetier')}>
            <Text style={styles.backButtonText}>RETOUR AU QUIZ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isFallback && (
          <View style={styles.fallbackBanner}>
            <Text style={styles.fallbackBannerText}>
              Bêta : recommandations en cours d'affinage pour ce secteur.
            </Text>
          </View>
        )}

        {variant === 'defense_track' && (
          <View style={styles.variantBadge}>
            <Text style={styles.variantBadgeText}>Track : Défense & Sécurité civile</Text>
          </View>
        )}

        <View style={[styles.cardOuter, { width: cardWidth }]}>
          <View style={styles.sectorCard}>
            <Text style={[styles.cardTitle, { fontSize: titleSize }]}>MÉTIER RECOMMANDÉ</Text>
            <View style={styles.barresEmojiZone}>
              <View style={styles.barLeft}>
                <LinearGradient colors={['#FF6000', '#FFBB00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.barresEmojiBar} />
              </View>
              <Text style={styles.sectorIconEmoji}>💼</Text>
              <View style={styles.barRight}>
                <LinearGradient colors={['#FF6000', '#FFBB00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.barresEmojiBar} />
              </View>
            </View>
            <View style={styles.sectorNameWrap}>
              <GradientText colors={['#FFBB00', '#FF7B2B']} style={[styles.sectorName, { fontSize: jobNameSize }]}>
                {mainJob.title.toUpperCase()}
              </GradientText>
            </View>

            {alternatives.length > 0 && (
              <>
                <View style={styles.separator} />
                <Text style={styles.alternativesTitle}>Autres pistes</Text>
                {alternatives.map((job, i) => (
                  <Text key={i} style={styles.alternativeItem}>
                    • {job.title}
                  </Text>
                ))}
              </>
            )}

            <View style={styles.separatorUnderDescription} />
            <HoverableTouchableOpacity style={styles.continueButton} onPress={handleContinue} variant="button">
              <LinearGradient colors={['#FF6000', '#FFC005']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
                <Text style={[styles.continueButtonText, { fontSize: buttonTextSize }]}>CONTINUER MON PARCOURS</Text>
              </LinearGradient>
            </HoverableTouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#14161D' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#FF7B2B',
    borderRadius: 999,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  fallbackBanner: {
    backgroundColor: 'rgba(255, 172, 48, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 172, 48, 0.5)',
  },
  fallbackBannerText: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFE479',
    textAlign: 'center',
  },
  variantBadge: {
    backgroundColor: 'rgba(255, 123, 43, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 43, 0.5)',
    alignSelf: 'center',
  },
  variantBadgeText: {
    fontSize: 13,
    fontFamily: theme.fonts.button,
    color: '#FFB366',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 48, paddingHorizontal: 20, alignItems: 'center', paddingBottom: 24 },
  cardOuter: { alignSelf: 'center', marginBottom: 16 },
  sectorCard: {
    backgroundColor: '#2D3241',
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web' && { boxShadow: '0 0 200px rgba(255, 172, 48, 0.25)' }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#FFAC30',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 120,
      shadowOpacity: 0.25,
      elevation: 8,
    }),
  },
  cardTitle: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  barresEmojiZone: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    alignSelf: 'center',
    marginBottom: 8,
  },
  barLeft: { flex: 1, height: 3 },
  barRight: { flex: 1, height: 3 },
  barresEmojiBar: { height: 3, borderRadius: 5, flex: 1 },
  sectorIconEmoji: { fontSize: 48, marginHorizontal: 12 },
  sectorNameWrap: { marginBottom: 8 },
  sectorName: { fontFamily: theme.fonts.title, textAlign: 'center', textTransform: 'uppercase' },
  separator: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: '80%',
    alignSelf: 'center',
    marginVertical: 16,
    borderRadius: 2,
  },
  alternativesTitle: {
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    opacity: 0.9,
    fontSize: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  alternativeItem: {
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.85,
    fontSize: 15,
    marginBottom: 4,
  },
  separatorUnderDescription: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 5,
    width: '65%',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  continueButton: {
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    ...(Platform.OS === 'web' && { boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }),
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.35, elevation: 8 }),
  },
  continueButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  continueButtonText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
