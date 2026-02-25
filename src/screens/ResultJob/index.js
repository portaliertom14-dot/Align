/**
 * Résultat métier — design identique à ResultatSecteur (carte centrée, badge, gros titre, 2 CTA).
 * Source unique affichée : route.params.topJobs (déjà filtrée par applyTrackFilter en amont).
 * Si params manquants : reconstruction via applyTrackFilter(sectorId, config, schoolLevel) avant affichage.
 */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import GradientText from '../../components/GradientText';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { setActiveMetier, getUserProgress } from '../../lib/userProgressSupabase';
import { ensureSeedModules } from '../../services/userModulesService';
import { getCurrentUser } from '../../services/auth';
import { guardJobTitle, getFirstWhitelistTitle } from '../../domain/jobTitleGuard';
import { getSectorDisplayName } from '../../data/jobDescriptions';
import { applyTrackFilter, getSectorJobsFromConfig } from '../../lib/jobTrackFilter';
import { getCurrentUserProfile } from '../../services/userProfileService';
import { theme } from '../../styles/theme';

const starIcon = require('../../../assets/icons/star.png');

function getCardWidth(width) {
  if (width <= 600) return Math.min(width * 0.92, 520);
  if (width <= 900) return 640;
  return Math.min(820, width * 0.75);
}

function clampSize(min, preferred, max) {
  return Math.min(max, Math.max(min, preferred));
}

const TAGLINE_JOB = 'DÉCOUVRIR, APPRENDRE, RÉUSSIR';

function getDescriptionFallback(sectorId, jobTitle = null) {
  const name = getSectorDisplayName(sectorId || '');
  if (jobTitle && String(jobTitle).trim()) {
    return `Le métier ${String(jobTitle).trim()} s'inscrit dans le secteur ${name}. Découvre les formations et parcours qui y mènent.`;
  }
  return `Un métier du secteur ${name}. Découvre les formations et parcours qui y mènent.`;
}

export default function ResultJobScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute();
  const { sectorId, topJobs: paramTopJobs = [], isFallback = false, variant = 'default', descriptionText: paramDescription } = route.params || {};
  const paramList = Array.isArray(paramTopJobs) ? paramTopJobs : [];
  const [fallbackTopJobs, setFallbackTopJobs] = useState([]);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const lastFallbackSectorRef = useRef(null);

  useEffect(() => {
    const sid = (sectorId || '').trim();
    if (sid && typeof __DEV__ !== 'undefined' && __DEV__) {
      getUserProgress().then((p) => {
        console.log('[SECTOR_CONSISTENCY]', { ui: sid, progressActiveDirection: p?.activeDirection ?? null, jobAnalyzeSectorId: sid });
      }).catch(() => {});
    }
  }, [sectorId]);

  useEffect(() => {
    if (paramList.length > 0) return;
    const sid = (sectorId || '').trim();
    if (!sid) return;
    if (lastFallbackSectorRef.current === sid) return;
    lastFallbackSectorRef.current = sid;
    getCurrentUserProfile()
      .then((profile) => {
        const list = applyTrackFilter(sid, getSectorJobsFromConfig(sid), profile?.school_level ?? null, { fallbackCount: 3 });
        if (list.length > 0) setFallbackTopJobs(list);
      })
      .catch(() => {});
  }, [sectorId, paramList.length]);

  const sid = (sectorId || '').trim();
  const configJobs = useMemo(() => getSectorJobsFromConfig(sid), [sid]);
  const rawTopOne = configJobs[0] ? [{ title: configJobs[0].title ?? configJobs[0], score: configJobs[0].score ?? 0.9 }] : [];
  const topJobsFromParamsOrFallback = paramList.length > 0 ? paramList : fallbackTopJobs;
  const topJobs = topJobsFromParamsOrFallback.length > 0 ? topJobsFromParamsOrFallback : rawTopOne;
  const topJobsSafe = topJobs.length > 0 ? topJobs : [{ title: 'Métier', score: 0.9 }];
  if (topJobs.length === 0 && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error('[ResultJob] topJobsLength=0 — fallback to generic métier', { sectorId: sid });
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (paramList.length > 0) console.log('[FAST_PATH] ResultJob from params');
    console.log('[JOB_UI] props/route params', { sectorId: route.params?.sectorId, topJobsLength: topJobsSafe?.length, firstTitle: topJobsSafe?.[0]?.title ?? topJobsSafe?.[0], hasTopJobs: !!topJobsSafe?.length });
  }

  const mainJob = topJobsSafe[0];
  const varKey = variant || 'default';
  const fallbackTitle = useMemo(() => getFirstWhitelistTitle(sid, varKey), [sid, varKey]);

  const mainJobDisplay = useMemo(() => {
    if (!mainJob?.title) return fallbackTitle || 'Métier';
    const guarded = guardJobTitle({ stage: 'UI_RENDER', sectorId: sid, variant: varKey, jobTitle: mainJob.title });
    if (guarded !== null) return guarded;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[JOB_GUARD] FALLBACK_TO_FIRST_WHITELIST', { sectorId: sid, variant: varKey, context: 'ResultJob main' });
    }
    return fallbackTitle || mainJob.title || 'Métier';
  }, [mainJob?.title, sid, varKey, fallbackTitle]);

  /** Fallback quand l’API n’a pas renvoyé de description valide. */
  const descriptionText = (paramDescription && typeof paramDescription === 'string') && paramDescription.trim()
    ? paramDescription.trim()
    : (() => {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[JOB_DESC] FAIL', { reason: 'missing_param', sectorId: sid });
        }
        return getDescriptionFallback(sid, mainJobDisplay);
      })();

  useEffect(() => {
    if (mainJob) {
      cardAnim.setValue(0);
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [mainJob, cardAnim]);

  const cardWidth = getCardWidth(width);
  const titleSize = clampSize(14, width * 0.038, 20);
  const jobNameSize = clampSize(22, width * 0.06, 32);
  const taglineSize = clampSize(14, width * 0.038, 19);
  const descSize = clampSize(13, width * 0.035, 16);
  const buttonTextSize = clampSize(16, width * 0.042, 19);

  const handleContinue = async () => {
    const toPersist = mainJobDisplay;
    if (toPersist) {
      const canonical = guardJobTitle({
        stage: 'PERSIST_ACTIVE_METIER',
        sectorId: sid,
        variant: varKey,
        jobTitle: toPersist,
      });
      if (canonical !== null) {
        try {
          await setActiveMetier(canonical);
          getCurrentUser().then((u) => u?.id && ensureSeedModules(u.id).catch(() => {}));
        } catch (_) {}
      } else {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[JOB_GUARD] SKIP_PERSIST_INVALID_JOB', { sectorId: sid, variant: varKey, jobTitle: toPersist });
        }
      }
    }
    navigation.replace('TonMetierDefini', { metierName: toPersist || 'Métier' });
  };

  const handleRegenerateJob = () => {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[JOB_REGEN] START', { sectorId: sid, variant: varKey });
    }
    navigation.push('RefineJob', {
      sectorId: sid,
      variant: varKey,
      previousTopJobs: topJobs,
      rawAnswers30: route.params?.rawAnswers30 ?? {},
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isFallback && (
          <View style={styles.polyvalentBanner}>
            <Text style={styles.polyvalentBannerText}>
              Bêta : recommandations en cours d'affinage pour ce secteur.
            </Text>
          </View>
        )}

        {variant === 'defense_track' && (
          <View style={styles.variantBadge}>
            <Text style={styles.variantBadgeText}>Défense & Sécurité civile</Text>
          </View>
        )}

        <View style={styles.starBadgeGroup}>
          <View style={styles.starContainer}>
            <Image source={starIcon} style={styles.starImage} resizeMode="contain" />
          </View>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>RÉSULTAT DÉBLOQUÉ</Text>
            </View>
          </View>
        </View>

        <View style={[styles.cardOuter, { width: cardWidth }]}>
          <View style={[styles.cardGlow, { width: cardWidth }]} />
          <Animated.View
            style={[
              styles.cardWrapper,
              {
                opacity: cardAnim,
                transform: [
                  { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
                ],
              },
            ]}
          >
            <View style={styles.sectorCard}>
              <Text style={[styles.cardTitle, { fontSize: titleSize }]}>CE MÉTIER TE CORRESPOND</Text>

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
                  {mainJobDisplay.toUpperCase()}
                </GradientText>
              </View>

              <View style={styles.taglineWrap}>
                {Platform.OS === 'web' ? (
                  <Text
                    style={[
                      styles.tagline,
                      {
                        fontSize: taglineSize,
                        backgroundImage: 'linear-gradient(90deg, #FFE479 0%, #FF9758 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: 'transparent',
                      },
                    ]}
                  >
                    {TAGLINE_JOB}
                  </Text>
                ) : (
                  <MaskedView
                    maskElement={<Text style={[styles.tagline, { fontSize: taglineSize }]}>{TAGLINE_JOB}</Text>}
                  >
                    <LinearGradient colors={['#FFE479', '#FF9758']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.taglineGradient}>
                      <Text style={[styles.tagline, styles.taglineTransparent, { fontSize: taglineSize }]}>{TAGLINE_JOB}</Text>
                    </LinearGradient>
                  </MaskedView>
                )}
              </View>

              <View style={styles.barUnderTagline}>
                <LinearGradient colors={['#FF6000', '#FFBB00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.barUnderTaglineGradient} />
              </View>

              <Text style={[styles.description, { fontSize: descSize }]}>{descriptionText}</Text>

              <View style={styles.separatorUnderDescription} />

              <HoverableTouchableOpacity style={styles.continueButton} onPress={handleContinue} variant="button">
                <LinearGradient colors={['#FF6000', '#FFC005']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
                  <Text style={[styles.continueButtonText, { fontSize: buttonTextSize }]}>CONTINUER MON PARCOURS</Text>
                </LinearGradient>
              </HoverableTouchableOpacity>

              <HoverableTouchableOpacity style={styles.regenerateButton} onPress={handleRegenerateJob} variant="button">
                <Text style={[styles.regenerateButtonText, { fontSize: buttonTextSize }]}>RÉGÉNÉRER</Text>
              </HoverableTouchableOpacity>

              <Text style={styles.regenerateHint}>(5 questions pour affiner et découvrir un autre métier du même secteur)</Text>
            </View>
          </Animated.View>
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
  polyvalentBanner: {
    alignSelf: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 172, 48, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 172, 48, 0.4)',
  },
  polyvalentBannerText: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFAC30',
    fontWeight: '600',
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
  starBadgeGroup: {
    alignItems: 'center',
    marginBottom: -28,
    zIndex: 100,
  },
  starContainer: { marginBottom: -70, zIndex: 0 },
  starImage: { width: 140, height: 140 },
  badgeContainer: { zIndex: 101 },
  badge: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 40, paddingHorizontal: 20, alignItems: 'center', paddingBottom: 24 },
  cardOuter: { position: 'relative', alignSelf: 'center', marginBottom: 16, zIndex: 1 },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    pointerEvents: 'none',
  },
  cardWrapper: { width: '100%' },
  sectorCard: {
    backgroundColor: '#2D3241',
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web' && { boxShadow: '0 0 200px rgba(255, 172, 48, 0.35)' }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#FFAC30',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 200,
      shadowOpacity: 0.35,
      elevation: 0,
    }),
  },
  cardTitle: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  barresEmojiZone: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 3,
  },
  barLeft: { flex: 1, height: 3 },
  barRight: { flex: 1, height: 3 },
  barresEmojiBar: { height: 3, borderRadius: 5, flex: 1 },
  sectorIconEmoji: { fontSize: 50, marginHorizontal: 12, textAlign: 'center' },
  sectorNameWrap: { marginTop: 3, marginBottom: 3 },
  sectorName: { fontFamily: theme.fonts.title, textAlign: 'center', textTransform: 'uppercase' },
  taglineWrap: { marginBottom: 6, alignSelf: 'center' },
  tagline: { fontFamily: theme.fonts.button, textAlign: 'center', textTransform: 'uppercase' },
  taglineTransparent: { opacity: 0 },
  taglineGradient: { paddingHorizontal: 4, minWidth: 200 },
  barUnderTagline: {
    width: '85%',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 12,
    height: 3,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barUnderTaglineGradient: { height: 3, borderRadius: 5, flex: 1 },
  description: {
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 12,
    maxWidth: '65%',
    alignSelf: 'center',
  },
  bulletsWrap: {
    marginBottom: 12,
    maxWidth: '65%',
    alignSelf: 'center',
  },
  bulletItem: {
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 22,
    marginBottom: 6,
  },
  separatorUnderDescription: {
    height: 3,
    backgroundColor: '#DADADA',
    borderRadius: 5,
    width: '65%',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  continueButton: {
    borderRadius: 999,
    marginBottom: 10,
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
  regenerateButton: {
    backgroundColor: '#019AEB',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    marginBottom: 8,
    ...(Platform.OS === 'web' && { boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }),
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.35, elevation: 8 }),
  },
  regenerateButtonText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  regenerateHint: {
    fontSize: 13,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    opacity: 0.85,
    textAlign: 'center',
  },
});
