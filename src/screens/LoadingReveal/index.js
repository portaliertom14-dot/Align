/**
 * Écran de chargement entre fin du quiz et écran résultat (secteur ou métier).
 * Progress monte continuellement vers 92% (jamais de freeze), puis 92→100 en ~700ms quand la requête est finie.
 * Durée minimale ~6.5s. Titre fixe + sous-phrases rotatives avec fade.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated as RNAnimated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { theme } from '../../styles/theme';
import { analyzeSector } from '../../services/analyzeSector';
import { analyzeJobResult } from '../../services/analyzeJobResult';
import { updateUserProgress } from '../../lib/userProgress';
import { setActiveDirection } from '../../lib/userProgress';
import { setActiveDirection as setActiveDirectionSupabase } from '../../lib/userProgressSupabase';
import { questions } from '../../data/questions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DONUT_SIZE = Math.min(SCREEN_WIDTH * 0.5, 220);
const STROKE_WIDTH = 14;
const RADIUS = (DONUT_SIZE - STROKE_WIDTH) / 2;
const CX = DONUT_SIZE / 2;
const CY = DONUT_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PROGRESS_CAP_PCT = 0.92; // 92% → 0.92 for 0-1 range
const PHASE1_DURATION_MS = 6000; // 0 → 92% with quad easing
const PHASE2_DURATION_MS = 700;  // 92 → 100% with cubic easing
const MIN_DURATION_SECTOR_MS = 6500;
const MIN_DURATION_JOB_MS = 6500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TITLES = {
  sector: 'On calcule le secteur qui te correspond vraiment',
  job: 'On trouve le métier qui colle le mieux à ton profil',
};

function getSubtitleForProgress(progress, done) {
  if (done) return 'Résultat prêt ✅';
  if (progress < 30) return 'On analyse tes réponses…';
  if (progress < 60) return 'On détecte tes préférences fortes…';
  if (progress < 85) return 'On compare avec des profils proches…';
  if (progress < 92) return 'On finalise ton résultat…';
  return 'On finalise ton résultat…';
}

const CircleSvgOnly = React.forwardRef((props, ref) => {
  const { collapsable, ...rest } = props;
  return <Circle ref={ref} {...rest} />;
});
CircleSvgOnly.displayName = 'CircleSvgOnly';
const AnimatedCircle = RNAnimated.createAnimatedComponent(CircleSvgOnly);

export default function LoadingRevealScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width: winWidth } = useWindowDimensions();
  const mode = route.params?.mode ?? 'sector';
  const payload = route.params?.payload ?? {};

  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [subtitle, setSubtitle] = useState(() => getSubtitleForProgress(0, false));
  const subtitleOpacity = useRef(new RNAnimated.Value(1)).current;
  const resultRef = useRef({ type: null, payload: null });
  const progressAnimated = useRef(new RNAnimated.Value(0)).current;
  const progressValueRef = useRef(0);
  const lastSentPercentRef = useRef(0);
  const hasNavigatedRef = useRef(false);

  const title = TITLES[mode === 'job' ? 'job' : 'sector'];
  const titleFontSize = Math.min(24, Math.max(16, winWidth * 0.055));

  // Sync progress state from animation (throttle: only when percent step changes)
  useEffect(() => {
    const listenerId = progressAnimated.addListener(({ value }) => {
      progressValueRef.current = value;
      const pct = Math.round(value * 100);
      if (pct !== lastSentPercentRef.current) {
        lastSentPercentRef.current = pct;
        setProgress(pct);
      }
    });
    return () => progressAnimated.removeListener(listenerId);
  }, [progressAnimated]);

  // Phase 1: 0 → 92% in 6s, quad easing (fluide 60fps)
  useEffect(() => {
    progressAnimated.setValue(0);
    progressValueRef.current = 0;
    lastSentPercentRef.current = 0;
    const anim = RNAnimated.timing(progressAnimated, {
      toValue: PROGRESS_CAP_PCT,
      duration: PHASE1_DURATION_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [progressAnimated]);

  // Phase 2: when done, current → 100% in 700ms, cubic easing
  useEffect(() => {
    if (!done) return;
    const from = progressValueRef.current;
    progressAnimated.setValue(from);
    const anim = RNAnimated.timing(progressAnimated, {
      toValue: 1,
      duration: PHASE2_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start(() => {
      lastSentPercentRef.current = 100;
      setProgress(100);
    });
    return () => anim.stop();
  }, [done, progressAnimated]);

  // Subtitle fade when text changes
  const prevSubtitleRef = useRef(subtitle);
  useEffect(() => {
    if (prevSubtitleRef.current === subtitle) return;
    prevSubtitleRef.current = subtitle;
    RNAnimated.sequence([
      RNAnimated.timing(subtitleOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      RNAnimated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [subtitle, subtitleOpacity]);

  useEffect(() => {
    let mounted = true;

    const runRequest = async () => {
      const startTime = Date.now();
      const minDuration = mode === 'job' ? MIN_DURATION_JOB_MS : MIN_DURATION_SECTOR_MS;

      if (mode === 'sector') {
        const { sectorResult: precomputed, answers, questions: qList, microAnswers, candidateSectors, refinementCount } = payload;
        if (precomputed != null) {
          const elapsed = Date.now() - startTime;
          if (elapsed < minDuration) await sleep(minDuration - elapsed);
          if (!mounted) return;
          resultRef.current = { type: 'sector', payload: { sectorResult: precomputed } };
          setSubtitle('Résultat prêt ✅');
          setDone(true);
          return;
        }
        try {
          const apiResult = await analyzeSector(answers ?? {}, qList ?? questions, {
            microAnswers,
            candidateSectors,
            refinementCount,
          });
          const sectorContext = apiResult?.debug?.extractedAI ?? apiResult?.debug?.extracted ?? null;
          await updateUserProgress({ activeSectorContext: sectorContext }).catch(() => {});
          if (apiResult?.secteurId && apiResult.secteurId !== 'undetermined') {
            await setActiveDirection(apiResult.secteurId).catch(() => {});
            await setActiveDirectionSupabase(apiResult.secteurId).catch(() => {});
          }
          const elapsed = Date.now() - startTime;
          if (elapsed < minDuration) await sleep(minDuration - elapsed);
          if (!mounted) return;
          const needsRefine = apiResult.refinementRequired === true || apiResult.needsRefinement === true;
          const ranked = apiResult.sectorRanked ?? apiResult.top2 ?? [];
          const micro = Array.isArray(apiResult.microQuestions) ? apiResult.microQuestions : [];
          const goToRefinement = needsRefine && ranked.length >= 1 && micro.length > 0;
          resultRef.current = goToRefinement
            ? { type: 'quiz_refinement', payload: { sectorRanked: ranked, microQuestions: micro } }
            : { type: 'sector', payload: { sectorResult: apiResult } };
          setSubtitle('Résultat prêt ✅');
          setDone(true);
        } catch (err) {
          console.error('[LoadingReveal] sector error', err);
          const elapsed = Date.now() - startTime;
          if (elapsed < minDuration) await sleep(minDuration - elapsed);
          if (!mounted) return;
          resultRef.current = {
            type: 'sector',
            payload: {
              sectorResult: {
                secteurId: 'undetermined',
                secteurName: 'Secteur',
                description: err?.message ?? 'Une erreur est survenue.',
              },
            },
          };
          setSubtitle('Résultat prêt ✅');
          setDone(true);
        }
        return;
      }

      if (mode === 'job') {
        const { sectorId, variant, rawAnswers30, sectorSummary, sectorContext, refinementAnswers, topJobs: precomputedTopJobs } = payload;
        if (Array.isArray(precomputedTopJobs)) {
          const elapsed = Date.now() - startTime;
          if (elapsed < minDuration) await sleep(minDuration - elapsed);
          if (!mounted) return;
          resultRef.current = {
            type: 'job',
            payload: { sectorId: sectorId ?? '', topJobs: precomputedTopJobs, isFallback: payload.isFallback === true, variant: variant ?? 'default' },
          };
          setSubtitle('Résultat prêt ✅');
          setDone(true);
          return;
        }
        try {
          const out = await analyzeJobResult({
            sectorId: sectorId ?? '',
            variant: variant ?? 'default',
            rawAnswers30: rawAnswers30 ?? {},
            sectorSummary: sectorSummary ?? undefined,
            sectorContext: sectorContext ?? undefined,
            refinementAnswers: refinementAnswers ?? undefined,
          });
          const topJobs = (out.top3 ?? []).map((t) => ({ title: t.title, score: t.score ?? 0.9 }));
          const elapsed = Date.now() - startTime;
          if (elapsed < minDuration) await sleep(minDuration - elapsed);
          if (!mounted) return;
          resultRef.current = { type: 'job', payload: { sectorId: sectorId ?? '', topJobs, isFallback: false, variant: variant ?? 'default' } };
          setSubtitle('Résultat prêt ✅');
          setDone(true);
        } catch (err) {
          console.error('[LoadingReveal] job error', err);
          const elapsed = Date.now() - startTime;
          if (elapsed < minDuration) await sleep(minDuration - elapsed);
          if (!mounted) return;
          resultRef.current = {
            type: 'job',
            payload: { sectorId: payload.sectorId ?? '', topJobs: [], isFallback: true, variant: payload.variant ?? 'default' },
          };
          setSubtitle('Résultat prêt ✅');
          setDone(true);
        }
      }
    };

    runRequest();
    return () => {
      mounted = false;
    };
  }, [mode, payload]);

  // Update subtitle from progress buckets
  useEffect(() => {
    const next = getSubtitleForProgress(progress, done);
    if (next !== subtitle) setSubtitle(next);
  }, [progress, done]);

  // Navigation: uniquement quand done et progress >= 100 (plus de navigation dans le fetch)
  useEffect(() => {
    if (!done || progress < 100 || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    const { type, payload: resPayload } = resultRef.current;
    if (type === 'sector') {
      navigation.replace('ResultatSecteur', { sectorResult: resPayload.sectorResult });
    } else if (type === 'quiz_refinement') {
      navigation.replace('Quiz', {
        refinementFromLoading: true,
        sectorRanked: resPayload.sectorRanked,
        microQuestions: resPayload.microQuestions,
      });
    } else if (type === 'job') {
      navigation.replace('ResultJob', resPayload);
    }
  }, [done, progress, navigation, mode]);

  const strokeDashoffset = progressAnimated.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const displayPercent = Math.round(progress);

  return (
    <View style={styles.container}>
      <View style={styles.entranceContent}>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text>
          <RNAnimated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>{subtitle}</RNAnimated.Text>
        </View>
        <View style={styles.donutWrapper}>
          <Svg width={DONUT_SIZE} height={DONUT_SIZE} style={styles.svg}>
            <Defs>
              <LinearGradient id="loadingRevealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0" stopColor="#FF7B2B" />
                <Stop offset="1" stopColor="#FFD93F" />
              </LinearGradient>
            </Defs>
            <G transform={`rotate(-90 ${CX} ${CY})`}>
              <Circle cx={CX} cy={CY} r={RADIUS} stroke="#3D4150" strokeWidth={STROKE_WIDTH} fill="transparent" />
              <AnimatedCircle
                cx={CX}
                cy={CY}
                r={RADIUS}
                stroke="url(#loadingRevealGrad)"
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </G>
          </Svg>
          <View style={[styles.percentOverlay, { pointerEvents: 'none' }]}>
            <Text style={styles.percentText}>{displayPercent}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  entranceContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    transform: [{ translateY: -50 }],
    alignItems: 'center',
    marginBottom: 0,
  },
  title: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 36,
  },
  donutWrapper: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: { position: 'absolute' },
  percentOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontFamily: theme.fonts.button,
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
