/**
 * Résultat Métier — MÊME écran que Résultat Secteur.
 * Même structure, mêmes styles, mêmes espacements, couleurs, typographies, ombres.
 * Seuls changent : titre (nom du métier), emoji, textes générés.
 */
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  ScrollView,
  useWindowDimensions,
  Platform,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import { useMetierQuiz } from '../../context/MetierQuizContext';
import { analyzeJob } from '../../services/analyzeJob';
import { quizMetierQuestions } from '../../data/quizMetierQuestions';
import { getUserProgress, setActiveMetier, updateUserProgress } from '../../lib/userProgressSupabase';
import { prefetchDynamicModulesSafe } from '../../services/prefetchDynamicModulesSafe';
import { ensureSeedModules } from '../../services/userModulesService';
import { getCurrentUser } from '../../services/auth';
import { guardJobTitle } from '../../domain/jobTitleGuard';
// Secteur verrouillé : UNIQUEMENT progress.activeDirection (quiz secteur), pas de dérivation.
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import GradientText from '../../components/GradientText';
import AlignLoading from '../../components/AlignLoading';
import { theme } from '../../styles/theme';

const starIcon = require('../../../assets/icons/star.png');

const JOB_ICONS = {
  developpeur: '💻',
  data_scientist: '🔬',
  entrepreneur: '💼',
  designer: '🎨',
  avocat: '⚖️',
  medecin: '🏥',
};
const DEFAULT_TAGLINE = 'EXPLORER, APPRENDRE, RÉUSSIR';
const JOB_TIMEOUT_MS = 20000; // Timeout de sécurité (était 15s)

function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getCardWidth(width) {
  if (width <= 600) return Math.min(width * 0.92, 520);
  if (width <= 900) return 640;
  return Math.min(820, width * 0.75);
}

function clampSize(min, preferred, max) {
  return Math.min(max, Math.max(min, preferred));
}

function getIconForJob(jobId) {
  if (!jobId) return '💼';
  const id = String(jobId).toLowerCase().replace(/\s+/g, '_');
  return JOB_ICONS[id] ?? '💼';
}

export default function PropositionMetierScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { answers, quizQuestions } = useMetierQuiz();
  const [metierResult, setMetierResult] = useState(null);
  const [secteurId, setSecteurId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const lastRunRetryKeyRef = useRef(-1);
  const prefetchTriggeredRef = useRef(false);

  const resultData = useMemo(() => {
    if (!metierResult) return null;
    const name = (metierResult.metierName || 'Métier').toUpperCase();
    return {
      sectorName: name,
      sectorDescription: metierResult.reasonShort || metierResult.why || metierResult.description || 'Ce métier correspond à ton profil.',
      icon: getIconForJob(metierResult.metierId),
      tagline: DEFAULT_TAGLINE,
    };
  }, [metierResult]);

  const run = useCallback(() => setRetryKey((k) => k + 1), []);

  useEffect(() => {
    if (!answers || Object.keys(answers).length === 0) {
      setLoading(false);
      return;
    }
    if (lastRunRetryKeyRef.current === retryKey) return;
    lastRunRetryKeyRef.current = retryKey;

    let cancelled = false;
    let safetyTimer = null;
    setError(null);
    setLoading(true);
    const requestId = generateRequestId();
    console.log('[JOB_RES] START', requestId);

    // Timeout de sécurité : si loading > 20s, forcer stop
    safetyTimer = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        console.warn('[JOB_RES] SAFETY_TIMEOUT', requestId);
        setError('Réseau lent ou bug. Réessaie.');
        setLoading(false);
      }
    }, JOB_TIMEOUT_MS);

    (async () => {
      try {
        const progressRaw = await getUserProgress();
        const progress = progressRaw && typeof progressRaw === 'object' ? progressRaw : {};
        if (cancelled) return;

        const lockedSectorId =
          typeof progress.activeDirection === 'string' && progress.activeDirection.trim()
            ? progress.activeDirection.trim()
            : null;
        setSecteurId(lockedSectorId);

        if (!lockedSectorId) {
          clearTimeout(safetyTimer);
          console.error('[FRONT_LOCKED_SECTOR] ERREUR: activeDirection manquant, impossible de verrouiller le secteur');
          setError('Secteur manquant. Complète d’abord le quiz secteur.');
          setLoading(false);
          return;
        }

        const questions = quizQuestions ?? quizMetierQuestions;
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error('JOB_RESULT_INVALID: pas de questions');
        }

        console.log('[FRONT_LOCKED_SECTOR_SENT] –', lockedSectorId);
        const result = await analyzeJob(answers, questions, {
          sectorId: lockedSectorId,
        });

        if (cancelled) return;
        if (!result || typeof result.jobId !== 'string') {
          throw new Error('JOB_RESULT_INVALID: réponse sans jobId');
        }

        if (result.sectorIdLocked && result.sectorIdLocked.trim() !== lockedSectorId) {
          console.error('[FRONT_LOCKED_SECTOR] ERREUR: secteur verrouillé différent entre quiz secteur et quiz métier', {
            envoyé: lockedSectorId,
            reçu: result.sectorIdLocked,
          });
        }

        console.log('[JOB_RES] SUCCESS', requestId, result.jobId);

        setMetierResult({
          metierId: result.jobId,
          metierName: result.jobName ?? result.jobId,
          why: result.description ?? '',
          description: result.description ?? '',
          reasonShort: result.reasonShort,
          clusterId: result.clusterId,
          secteurId: lockedSectorId,
        });

        if (result.jobId && lockedSectorId) {
          const canonical = guardJobTitle({
            stage: 'PERSIST_ACTIVE_METIER',
            sectorId: lockedSectorId,
            variant: 'default',
            jobTitle: result.jobId,
            meta: { requestId, sourceFn: 'analyzeJob' },
          });
          if (canonical !== null) {
            if (__DEV__) console.log('[JOB_RES] activeMetier saved, secteur verrouillé (non réécrit)', lockedSectorId);
            await setActiveMetier(canonical);
            if (cancelled) return;
            getCurrentUser().then((u) => u?.id && ensureSeedModules(u.id).catch(() => {}));
            if (!prefetchTriggeredRef.current) {
              prefetchTriggeredRef.current = true;
              void prefetchDynamicModulesSafe(lockedSectorId, canonical, 'v1').catch(() => {});
            }
          } else {
            if (typeof console !== 'undefined' && console.warn) {
              console.warn('[JOB_GUARD] SKIP_PERSIST_INVALID_JOB', { sectorId: lockedSectorId, jobTitle: result.jobId, requestId });
            }
          }
        }
        console.log('[JOB_RES] END', requestId);
      } catch (err) {
        if (cancelled) return;
        console.error('[JOB_RES] ERROR', requestId, err?.message ?? err);
        const msg = err?.message === 'JOB_TIMEOUT'
          ? 'Réseau instable : résultat métier trop long. Réessaie.'
          : err?.message?.includes('JOB_RESULT_INVALID')
            ? 'Impossible de générer ton métier. Réessaie.'
            : 'Erreur lors du résultat métier. Réessaie.';
        setError(msg);
      } finally {
        clearTimeout(safetyTimer);
        console.log('[JOB_RES] FINALLY', requestId, 'loading=false');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [answers, quizQuestions, retryKey]);

  useEffect(() => {
    if (!resultData) return;
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [resultData]);

  const handleRegenerateMetier = async () => {
    setError(null);
    setLoading(true);
    try {
      const progressRaw = await getUserProgress();
      const progress = progressRaw && typeof progressRaw === 'object' ? progressRaw : {};
      const activeSecteurId =
        typeof progress.activeDirection === 'string' && progress.activeDirection.trim()
          ? progress.activeDirection.trim()
          : secteurId;
      if (!activeSecteurId) {
        setError('Secteur manquant. Complète d’abord le quiz secteur.');
        setLoading(false);
        return;
      }
      const metiersParSecteur = {
        ingenierie_tech: [{ id: 'developpeur', nom: 'Développeur logiciel', justification: 'Tu as un profil technique et créatif.' }, { id: 'data_scientist', nom: 'Data Scientist', justification: 'Ton profil analytique correspond à la science des données.' }],
        data_ia: [{ id: 'data_scientist', nom: 'Data Scientist', justification: 'Ton profil analytique correspond à la data.' }],
        creation_design: [{ id: 'designer', nom: 'Designer', justification: 'Ton profil créatif correspond au design.' }],
        communication_media: [{ id: 'redacteur', nom: 'Rédacteur', justification: 'Ton profil correspond à la communication.' }],
        business_entrepreneuriat: [{ id: 'entrepreneur', nom: 'Entrepreneur', justification: 'Ton profil dynamique correspond à l\'entrepreneuriat.' }],
        finance_assurance: [{ id: 'commercial', nom: 'Commercial', justification: 'Ton profil correspond à la finance.' }],
        droit_justice_securite: [{ id: 'avocat', nom: 'Avocat', justification: 'Ton profil argumentatif correspond au droit.' }],
        defense_securite_civile: [{ id: 'cybersecurity', nom: 'Expert Cybersécurité', justification: 'Ton profil correspond à la sécurité.' }],
        sante_bien_etre: [{ id: 'medecin', nom: 'Médecin', justification: 'Ton profil empathique correspond à la santé.' }],
        sciences_recherche: [{ id: 'data_scientist', nom: 'Data Scientist', justification: 'Ton profil correspond à la recherche.' }],
        education_formation: [{ id: 'enseignant', nom: 'Enseignant', justification: 'Ton profil correspond à l\'éducation.' }],
        culture_patrimoine: [{ id: 'designer', nom: 'Designer', justification: 'Ton profil créatif correspond à la culture.' }],
        industrie_artisanat: [{ id: 'ingenieur', nom: 'Ingénieur', justification: 'Ton profil correspond à l\'industrie.' }],
        sport_evenementiel: [{ id: 'coach', nom: 'Coach', justification: 'Ton profil correspond au sport.' }],
        social_humain: [{ id: 'psychologue', nom: 'Psychologue', justification: 'Ton profil correspond à l\'accompagnement.' }],
        environnement_agri: [{ id: 'ingenieur', nom: 'Ingénieur', justification: 'Ton profil correspond à l\'environnement.' }],
      };
      const metiersDisponibles = metiersParSecteur[activeSecteurId] || metiersParSecteur.ingenierie_tech;
      const currentMetierId = metierResult?.metierId;
      const availableMetiers = metiersDisponibles.filter((m) => m.id !== currentMetierId);
      const randomMetier = availableMetiers[Math.floor(Math.random() * availableMetiers.length)] || metiersDisponibles[0];
      const result = {
        metierId: randomMetier.id,
        metierName: randomMetier.nom,
        description: randomMetier.justification,
        why: randomMetier.justification,
        secteurId: activeSecteurId,
      };
      setMetierResult(result);
      if (result.metierId && activeSecteurId) {
        const canonical = guardJobTitle({
          stage: 'PERSIST_ACTIVE_METIER',
          sectorId: activeSecteurId,
          variant: 'default',
          jobTitle: result.metierId,
          meta: { sourceFn: 'handleRegenerateMetier' },
        });
        if (canonical !== null) {
          await setActiveMetier(canonical);
          getCurrentUser().then((u) => u?.id && ensureSeedModules(u.id).catch(() => {}));
          if (!prefetchTriggeredRef.current) {
            prefetchTriggeredRef.current = true;
            void prefetchDynamicModulesSafe(activeSecteurId, canonical, 'v1').catch(() => {});
          }
        } else {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[JOB_GUARD] SKIP_PERSIST_INVALID_JOB', { sectorId: activeSecteurId, jobTitle: result.metierId, sourceFn: 'handleRegenerateMetier' });
          }
        }
      }
    } catch (error) {
      console.error('[JOB_RES] REGENERATE ERROR', error?.message ?? error);
      setError('Impossible de régénérer. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={run} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>RÉESSAYER</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading || !resultData) {
    return <AlignLoading />;
  }

  const cardWidth = getCardWidth(width);
  const titleSize = clampSize(14, width * 0.038, 20);
  const sectorNameSize = clampSize(22, width * 0.06, 32);
  const taglineSize = clampSize(14, width * 0.038, 19);
  const descSize = clampSize(13, width * 0.035, 16);
  const buttonTextSize = clampSize(16, width * 0.042, 19);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }],
              },
            ]}
          >
            <View style={styles.sectorCard}>
              <Text style={[styles.cardTitle, { fontSize: titleSize }]}>CE MÉTIER TE CORRESPOND VRAIMENT</Text>

              <View style={styles.barresEmojiZone}>
                <View style={styles.barLeft}>
                  <LinearGradient colors={['#FF6000', '#FFBB00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.barresEmojiBar} />
                </View>
                <Text style={styles.sectorIconEmoji}>{resultData.icon}</Text>
                <View style={styles.barRight}>
                  <LinearGradient colors={['#FF6000', '#FFBB00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.barresEmojiBar} />
                </View>
              </View>

              <View style={styles.sectorNameWrap}>
                <GradientText colors={['#FFBB00', '#FF7B2B']} style={[styles.sectorName, { fontSize: sectorNameSize }]}>
                  {resultData.sectorName}
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
                    {resultData.tagline}
                  </Text>
                ) : (
                  <MaskedView maskElement={<Text style={[styles.tagline, { fontSize: taglineSize }]}>{resultData.tagline}</Text>}>
                    <LinearGradient colors={['#FFE479', '#FF9758']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.taglineGradient}>
                      <Text style={[styles.tagline, styles.taglineTransparent, { fontSize: taglineSize }]}>{resultData.tagline}</Text>
                    </LinearGradient>
                  </MaskedView>
                )}
              </View>

              <View style={styles.barUnderTagline}>
                <LinearGradient colors={['#FF6000', '#FFBB00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.barUnderTaglineGradient} />
              </View>

              <Text style={[styles.description, { fontSize: descSize }]}>{resultData.sectorDescription}</Text>

              <View style={styles.separatorUnderDescription} />

              <HoverableTouchableOpacity
                style={styles.continueButton}
                onPress={() => navigation.replace('TonMetierDefini', { metierName: metierResult?.metierName || 'Métier' })}
                variant="button"
              >
                <LinearGradient colors={['#FF6000', '#FFC005']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
                  <Text style={[styles.continueButtonText, { fontSize: buttonTextSize }]}>CONTINUER MON PARCOURS</Text>
                </LinearGradient>
              </HoverableTouchableOpacity>

              <HoverableTouchableOpacity style={styles.regenerateButton} onPress={handleRegenerateMetier} variant="button">
                <Text style={[styles.regenerateButtonText, { fontSize: buttonTextSize }]}>RÉGÉNÉRER</Text>
              </HoverableTouchableOpacity>

              <Text style={styles.regenerateHint}>(Tu peux ajuster si tu ne te reconnais pas totalement)</Text>
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
    color: '#EC3912',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#FF7B2B',
    borderRadius: 999,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#FFFFFF', fontFamily: theme.fonts.body },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 40, paddingHorizontal: 20, alignItems: 'center', paddingBottom: 24 },

  starBadgeGroup: { alignItems: 'center', marginBottom: -28, zIndex: 100 },
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
    paddingTop: 28,
    paddingBottom: 28,
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
    ...(Platform.OS === 'web' && { transition: 'transform 0.25s ease, box-shadow 0.25s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }),
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.35, elevation: 8 }),
  },
  continueButtonGradient: { paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  continueButtonText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' && { whiteSpace: 'nowrap' }),
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
    ...(Platform.OS === 'web' && { transition: 'transform 0.25s ease, box-shadow 0.25s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }),
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.35, elevation: 8 }),
  },
  regenerateButtonText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' && { whiteSpace: 'nowrap' }),
  },
  regenerateHint: { fontSize: 13, fontFamily: theme.fonts.button, color: '#FFFFFF', opacity: 0.85, textAlign: 'center' },
});
