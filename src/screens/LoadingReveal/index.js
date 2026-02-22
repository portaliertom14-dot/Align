/**
 * Écran de chargement entre fin du quiz et écran résultat (secteur ou métier).
 * Progress : 0→70% en ~1.5s, puis 70→92% en boucle jusqu'à fin du travail, puis 100% et navigation après 600ms.
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
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { theme } from '../../styles/theme';
import { analyzeSector } from '../../services/analyzeSector';
import { analyzeJobResult } from '../../services/analyzeJobResult';
import { getJobDescription } from '../../services/getJobDescription';
import { getSectorDescription } from '../../services/getSectorDescription';
import { refineJobPick } from '../../services/refineJobPick';
import { recommendJobsByAxes } from '../../services/recommendJobsByAxes';
import { guardJobTitle, getFirstWhitelistTitle, getFirstWhitelistTitleDifferentFrom } from '../../domain/jobTitleGuard';
import { getSectorDisplayName } from '../../data/jobDescriptions';
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

const PROGRESS_CAP = 0.92; // 92%
const PHASE1_TARGET = 0.70; // 70% en ~1.5s
const PHASE1_DURATION_MS = 1500;
const PHASE2_DURATION_MS = 6000; // 70→92% en montée continue smooth
const PHASE3_DURATION_MS = 450; // 92→100%
const NAV_DELAY_MS = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Secteur valide : pas vide, pas 'undetermined'. */
function isValidSectorId(id) {
  return typeof id === 'string' && id.length > 0 && id !== 'undetermined';
}

/** Payload secteur navigable : secteurId valide et ranked cohérent (pas d'undetermined en tête). */
function isValidSectorResult(payload) {
  if (!payload?.sectorResult) return false;
  const sr = payload.sectorResult;
  const id = sr.secteurId ?? sr.sectorId;
  if (!isValidSectorId(id)) return false;
  const ranked = sr.sectorRanked ?? sr.top2 ?? [];
  const arr = Array.isArray(ranked) ? ranked : [];
  if (arr.length > 0) {
    const first = arr[0];
    const firstId = typeof first === 'object' ? (first?.id ?? first?.secteurId) : first;
    if (!isValidSectorId(firstId)) return false;
  }
  return true;
}

/** Timeout global : rejette après ms si la promesse ne termine pas. */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[TIMEOUT] ${label} ${ms}ms`)), ms)
    ),
  ]);
}

const TITLES = {
  sector: 'ON CALCULE LE SECTEUR QUI TE CORRESPOND VRAIMENT',
  job: 'ON TROUVE LE MÉTIER QUI TE CORRESPOND VRAIMENT',
};

/** "Résultat prêt ✅" uniquement quand percent >= 100 (jamais avant). */
function getSubtitleForProgress(progress, done) {
  if (progress >= 100) return 'Résultat prêt ✅';
  if (progress <= 35) return 'Analyse de tes réponses…';
  if (progress <= 70) return 'On affine ton profil…';
  return 'On finalise les détails…';
}

function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getDescriptionFallback(sectorId) {
  const name = getSectorDisplayName(sectorId || '');
  return `Un métier du secteur ${name}.`;
}

/** Fallback court (2 phrases) si IA down pour le métier — toujours log [JOB_DESC] FAIL. */
const JOB_DESC_FALLBACK_SHORT = "Ce métier te permet de t'épanouir dans ton secteur. Découvre les formations et parcours qui y mènent.";

/** Fallback court pour description secteur si edge échoue. */
const SECTOR_DESC_FALLBACK = "Ce secteur offre des opportunités variées. Découvre les métiers qui te correspondent.";

const MAX_DESC_CHARS = 520;

/**
 * Post-traitement : uniquement des phrases complètes, jamais de coupe.
 * Split sur [.!?], ajoute les phrases une par une tant que total <= 520.
 */
function descriptionBySentences(text) {
  if (!text || typeof text !== 'string') return '';
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t.length) return '';
  const sentences = (t.match(/[^.!?]+[.!?]/g) || []).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return t.length <= MAX_DESC_CHARS ? t : '';
  let result = '';
  for (const phrase of sentences) {
    const withSpace = result ? result + ' ' + phrase : phrase;
    if (withSpace.length <= MAX_DESC_CHARS) result = withSpace;
    else break;
  }
  return result.trim();
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
  const [requestError, setRequestError] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const subtitleOpacity = useRef(new RNAnimated.Value(1)).current;
  const resultRef = useRef({ type: null, payload: null });
  const progressAnimated = useRef(new RNAnimated.Value(0)).current;
  const progressValueRef = useRef(0);
  const lastSentPercentRef = useRef(0);
  const navigatedRef = useRef(false);
  const startedRef = useRef(false);
  const phase1AnimRef = useRef(null);
  const phase2AnimRef = useRef(null);
  const startTimeRef = useRef(0);
  const requestIdRef = useRef('');
  const doneRef = useRef(false);
  const runRequestRef = useRef(null);

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

  // Après erreur secteur : afficher "Réessayer" au bout de 3s
  useEffect(() => {
    if (!requestError) return;
    const t = setTimeout(() => setShowRetryButton(true), 3000);
    return () => clearTimeout(t);
  }, [requestError]);

  // Démarrage UNE SEULE FOIS : Phase 1 → Phase 2 + runRequest (StrictMode-safe, pas de reset)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    requestIdRef.current = generateRequestId();
    startTimeRef.current = Date.now();
    if (typeof console !== 'undefined' && console.log) {
      console.log('[LOADING_REVEAL] START', { mode, requestId: requestIdRef.current });
    }

    let mounted = true;
    const phase1 = RNAnimated.timing(progressAnimated, {
      toValue: PHASE1_TARGET,
      duration: PHASE1_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    const phase2 = RNAnimated.timing(progressAnimated, {
      toValue: PROGRESS_CAP,
      duration: PHASE2_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    phase1AnimRef.current = phase1;
    phase2AnimRef.current = phase2;
    phase1.start(() => {
      if (!mounted || doneRef.current) return;
      progressValueRef.current = PHASE1_TARGET;
      lastSentPercentRef.current = 70;
      setProgress(70);
      phase2.start(() => {
        if (!mounted || doneRef.current) return;
        progressValueRef.current = PROGRESS_CAP;
        lastSentPercentRef.current = 92;
        setProgress(92);
      });
    });

    const MIN_DURATION_SECTOR_MS = 3500;
    async function fetchDescriptionForJob(sectorId, mainJobTitle) {
      if (!mainJobTitle) {
        if (typeof console !== 'undefined' && console.log) console.log('[JOB_DESC] FAIL', { reason: 'no_job_title' });
        return JOB_DESC_FALLBACK_SHORT;
      }
      const res = await getJobDescription({ sectorId, jobTitle: mainJobTitle });
      const raw = (res && res.text) ? res.text.trim() : null;
      if (!raw) {
        if (typeof console !== 'undefined' && console.log) console.log('[JOB_DESC] FAIL', { reason: 'fetch_null_after_retry' });
        return JOB_DESC_FALLBACK_SHORT;
      }
      return descriptionBySentences(raw);
    }
    function applyGuardAndForceDifferent(sid, varKey, rawList, prevTop1) {
      const fallbackTitle = getFirstWhitelistTitle(sid, varKey);
      let topJobs = (rawList || []).slice(0, 3).map((t) => {
        const rawTitle = t?.title ?? '';
        const guarded = guardJobTitle({ stage: 'JOB_REGEN_ENGINE_OUT', sectorId: sid, variant: varKey, jobTitle: rawTitle });
        return { title: guarded ?? fallbackTitle ?? (rawTitle || 'Métier'), score: t?.score ?? 0.9 };
      });
      const currentTop1 = topJobs[0]?.title ?? null;
      if (prevTop1 && currentTop1 && currentTop1 === prevTop1) {
        const firstDifferent = topJobs.slice(1).find((j) => j?.title && j.title !== prevTop1);
        if (firstDifferent?.title) {
          topJobs = [{ title: firstDifferent.title, score: firstDifferent.score }, ...topJobs.filter((j) => j.title !== firstDifferent.title)].slice(0, 3);
        } else {
          const altTitle = getFirstWhitelistTitleDifferentFrom(sid, varKey, prevTop1);
          if (altTitle && altTitle !== prevTop1) {
            topJobs = [{ title: altTitle, score: 0.9 }, ...topJobs.filter((j) => j.title !== altTitle)].slice(0, 3);
          }
        }
      }
      return topJobs;
    }
    const REQUEST_TIMEOUT_MS = mode === 'sector' ? 25000 : 12000;

    async function runRequest() {
      const reqId = requestIdRef.current;
      if (typeof console !== 'undefined' && console.log) {
        console.log('[LOADING_REVEAL] REQUEST_START', { mode, requestId: reqId });
      }

      const run = async () => {
        const startTime = Date.now();
        if (mode === 'sector') {
          const { sectorResult: precomputed, answers, questions: qList, microAnswers, candidateSectors, refinementCount } = payload;
          if (precomputed != null) {
            if (!isValidSectorResult({ sectorResult: precomputed })) {
              if (mounted) setRequestError(true);
              return;
            }
            let sectorDescriptionText = precomputed.sectorDescriptionText;
            if (!sectorDescriptionText && precomputed.secteurId) {
              const descRes = await getSectorDescription({ sectorId: precomputed.secteurId });
              sectorDescriptionText = (descRes && descRes.text) ? descRes.text.trim() : SECTOR_DESC_FALLBACK;
            } else if (!sectorDescriptionText) {
              sectorDescriptionText = SECTOR_DESC_FALLBACK;
            }
            const elapsed = Date.now() - startTime;
            if (elapsed < MIN_DURATION_SECTOR_MS) await sleep(MIN_DURATION_SECTOR_MS - elapsed);
            if (!mounted) return;
            resultRef.current = { type: 'sector', payload: { sectorResult: precomputed, sectorDescriptionText } };
            setDone(true);
            return;
          }
          try {
            const apiResult = await analyzeSector(answers ?? {}, qList ?? questions, { microAnswers, candidateSectors, refinementCount });
            const needsRefine = apiResult.refinementRequired === true || apiResult.needsRefinement === true;
            const ranked = apiResult.sectorRanked ?? apiResult.top2 ?? [];
            const micro = Array.isArray(apiResult.microQuestions) ? apiResult.microQuestions : [];
            if (needsRefine && ranked.length >= 1 && micro.length > 0) {
              if (!mounted) return;
              navigation.replace('Quiz', { refinementFromLoadingReveal: true, sectorRanked: ranked, microQuestions: micro });
              return;
            }
            const sectorContext = apiResult?.debug?.extractedAI ?? apiResult?.debug?.extracted ?? null;
            await updateUserProgress({ activeSectorContext: sectorContext }).catch(() => {});
            if (apiResult?.secteurId && apiResult.secteurId !== 'undetermined') {
              await setActiveDirection(apiResult.secteurId).catch(() => {});
              await setActiveDirectionSupabase(apiResult.secteurId).catch(() => {});
            }
            let sectorDescriptionText = typeof apiResult.sectorDescriptionText === 'string' ? apiResult.sectorDescriptionText.trim() : '';
            if (!sectorDescriptionText && apiResult.secteurId) {
              const descRes = await getSectorDescription({ sectorId: apiResult.secteurId });
              sectorDescriptionText = (descRes && descRes.text) ? descRes.text.trim() : SECTOR_DESC_FALLBACK;
            } else if (!sectorDescriptionText) {
              sectorDescriptionText = SECTOR_DESC_FALLBACK;
            }
            const elapsed = Date.now() - startTime;
            if (elapsed < MIN_DURATION_SECTOR_MS) await sleep(MIN_DURATION_SECTOR_MS - elapsed);
            if (!mounted) return;
            if (!isValidSectorResult({ sectorResult: apiResult })) {
              if (typeof console !== 'undefined' && console.log) {
                console.log('[LOADING_REVEAL] INVALID_SECTOR', { secteurId: apiResult?.secteurId, payloadSummary: { hasTop2: !!(apiResult?.top2?.length), hasSectorRanked: !!(apiResult?.sectorRanked?.length) } });
              }
              if (mounted) setRequestError(true);
              return;
            }
            resultRef.current = { type: 'sector', payload: { sectorResult: apiResult, sectorDescriptionText } };
            setDone(true);
          } catch (err) {
            console.error('[LoadingReveal] sector error', err);
            const elapsed = Date.now() - startTime;
            if (elapsed < MIN_DURATION_SECTOR_MS) await sleep(MIN_DURATION_SECTOR_MS - elapsed);
            if (!mounted) return;
            if (mounted) setRequestError(true);
          }
          return;
        }
        if (mode === 'job') {
          let sid = (payload.sectorId ?? '').trim();
          let sectorContext = payload.sectorContext;
          let sectorSummary = payload.sectorSummary;
          if (!sid || sectorContext === undefined) {
            const progress = await getUserProgress().catch(() => null);
            if (!sid) sid = (progress?.activeDirection && String(progress.activeDirection).trim()) || '';
            if (sectorContext === undefined) sectorContext = progress?.activeSectorContext;
            if (sectorSummary === undefined) sectorSummary = progress?.sectorSummary;
          }
          const varKey = payload.variant ?? 'default';
          const rawAnswers30 = payload.rawAnswers30 ?? {};
          if (payload.refineRegen === true) {
            const prevTop1 = Array.isArray(payload.previousTopJobs) && payload.previousTopJobs[0]?.title ? String(payload.previousTopJobs[0].title).trim() : null;
            const refineAnswers5 = payload.refineAnswers5 ?? {};
            try {
              const edgeResult = await refineJobPick({ sectorId: sid, variant: varKey, rawAnswers30: payload.rawAnswers30 ?? {}, refineAnswers5, excludeJobTitles: prevTop1 ? [prevTop1] : [] });
              const fallbackResult = recommendJobsByAxes({ sectorId: sid, answers: payload.rawAnswers30 ?? {}, variant: varKey, sectorContext: null });
              let topJobs = edgeResult?.topJobs?.length > 0 ? applyGuardAndForceDifferent(sid, varKey, edgeResult.topJobs, prevTop1) : applyGuardAndForceDifferent(sid, varKey, fallbackResult?.topJobs ?? [], prevTop1);
              const mainJobTitle = topJobs[0]?.title;
              const descriptionText = await fetchDescriptionForJob(sid, mainJobTitle);
              if (!mounted) return;
              resultRef.current = { type: 'job', payload: { sectorId: sid, topJobs, isFallback: false, variant: varKey, rawAnswers30, descriptionText } };
              setDone(true);
            } catch (err) {
              console.error('[LoadingReveal] refineRegen error', err);
              const fallbackTitle = getFirstWhitelistTitle(sid, varKey);
              const topJobs = [{ title: fallbackTitle ?? 'Métier', score: 0.85 }];
              const descriptionText = await fetchDescriptionForJob(sid, topJobs[0]?.title);
              if (!mounted) return;
              resultRef.current = { type: 'job', payload: { sectorId: sid, topJobs, isFallback: true, variant: varKey, rawAnswers30, descriptionText } };
              setDone(true);
            }
            return;
          }
          const precomputedTopJobs = payload.topJobs;
          if (Array.isArray(precomputedTopJobs) && precomputedTopJobs.length > 0) {
            const mainJobTitle = precomputedTopJobs[0]?.title;
            const descriptionText = await fetchDescriptionForJob(sid, mainJobTitle);
            if (!mounted) return;
            resultRef.current = { type: 'job', payload: { sectorId: sid, topJobs: precomputedTopJobs, isFallback: payload.isFallback === true, variant: varKey, rawAnswers30, descriptionText } };
            setDone(true);
            return;
          }
          try {
            const out = await analyzeJobResult({ sectorId: sid, variant: varKey, rawAnswers30, sectorSummary, sectorContext, refinementAnswers: payload.refinementAnswers ?? undefined });
            if (out.needsRefinement && Array.isArray(out.refinementQuestions) && out.refinementQuestions.length > 0) {
              if (!mounted) return;
              navigation.replace('QuizMetier', {
                refinementFromLoadingReveal: true,
                refinementQuestions: out.refinementQuestions,
                sectorId: sid,
                variant: varKey,
                rawAnswers30,
                sectorSummary,
                sectorContext,
                sectorRanked: payload.sectorRanked,
                needsDroitRefinement: route.params?.needsDroitRefinement === true,
              });
              return;
            }
            const topJobs = (out.top3 ?? []).map((t) => ({ title: t.title, score: t.score ?? 0.9 }));
            const mainJobTitle = topJobs[0]?.title;
            const descriptionText = await fetchDescriptionForJob(sid, mainJobTitle);
            if (!mounted) return;
            resultRef.current = { type: 'job', payload: { sectorId: sid, topJobs, isFallback: false, variant: varKey, rawAnswers30, descriptionText } };
            setDone(true);
          } catch (err) {
            console.error('[LoadingReveal] job error', err);
            const fallbackTitle = getFirstWhitelistTitle(sid, varKey);
            const topJobs = [{ title: fallbackTitle ?? 'Métier', score: 0.85 }];
            const descriptionText = await fetchDescriptionForJob(sid, topJobs[0]?.title);
            if (!mounted) return;
            resultRef.current = { type: 'job', payload: { sectorId: sid, topJobs, isFallback: true, variant: varKey, rawAnswers30, descriptionText } };
            setDone(true);
          }
        }
      };

      try {
        await withTimeout(run(), REQUEST_TIMEOUT_MS, `LoadingReveal:${mode}`);
      } catch (err) {
        if (!mounted) return;
        if (typeof console !== 'undefined' && console.error) {
          console.error('[LoadingReveal] timeout or error', err);
        }
        if (resultRef.current.type == null) {
          if (mode === 'sector') {
            if (typeof console !== 'undefined' && console.log) {
              console.log('[LOADING_REVEAL] INVALID_SECTOR', { secteurId: 'undetermined', payloadSummary: 'timeout_or_error' });
            }
            if (mounted) setRequestError(true);
          } else if (mode === 'job') {
            const sid = payload.sectorId ?? '';
            const varKey = payload.variant ?? 'default';
            const rawAnswers30 = payload.rawAnswers30 ?? {};
            const prevTitle = Array.isArray(payload.previousTopJobs) && payload.previousTopJobs[0]?.title ? String(payload.previousTopJobs[0].title).trim() : null;
            const fallbackTitle = prevTitle ?? getFirstWhitelistTitle(sid, varKey);
            resultRef.current = {
              type: 'job',
              payload: {
                sectorId: sid,
                topJobs: [{ title: fallbackTitle ?? 'Métier', score: 0.85 }],
                isFallback: true,
                variant: varKey,
                rawAnswers30: rawAnswers30 ?? {},
                descriptionText: JOB_DESC_FALLBACK_SHORT,
              },
            };
          }
        }
      } finally {
        if (typeof console !== 'undefined' && console.log) {
          console.log('[LOADING_REVEAL] REQUEST_FINALLY -> done=true', { mode, requestId: reqId });
        }
        if (mode === 'sector') {
          if (resultRef.current.type === 'sector' && isValidSectorResult(resultRef.current.payload)) {
            doneRef.current = true;
            if (mounted) setDone(true);
          }
          return;
        }
        doneRef.current = true;
        if (mounted) setDone(true);
      }
    }
    runRequestRef.current = runRequest;
    runRequest();

    return () => {
      mounted = false;
      phase1AnimRef.current?.stop();
      phase2AnimRef.current?.stop();
      phase1AnimRef.current = null;
      phase2AnimRef.current = null;
    };
  }, []);

  // Phase 3 : quand done, 92→100% puis sous-titre "Résultat prêt ✅" (affiché seulement à 100%)
  useEffect(() => {
    if (!done) return;
    phase2AnimRef.current?.stop();
    phase2AnimRef.current = null;
    const from = Math.min(progressValueRef.current, PROGRESS_CAP);
    progressAnimated.setValue(from);
    const phase3 = RNAnimated.timing(progressAnimated, {
      toValue: 1,
      duration: PHASE3_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    phase3.start(() => {
      lastSentPercentRef.current = 100;
      setProgress(100);
    });
    return () => phase3.stop();
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

  // Update subtitle from progress buckets (Résultat prêt ✅ uniquement quand progress >= 100)
  useEffect(() => {
    const next = getSubtitleForProgress(progress, done);
    if (next !== subtitle) setSubtitle(next);
  }, [progress, done]);

  // Navigation : une seule fois quand progress >= 100, après 600ms (secteur : uniquement si résultat valide)
  useEffect(() => {
    if (progress < 100 || navigatedRef.current) return;
    const navTimer = setTimeout(() => {
      if (navigatedRef.current) return;
      const { type, payload: resPayload } = resultRef.current;
      if (type === 'sector' && !isValidSectorResult(resPayload)) {
        if (typeof console !== 'undefined' && console.log) {
          console.log('[LOADING_REVEAL] INVALID_SECTOR', { secteurId: resPayload?.sectorResult?.secteurId, payloadSummary: 'block_nav' });
        }
        return;
      }
      navigatedRef.current = true;
      const durationMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      if (typeof console !== 'undefined' && console.log) {
        console.log('[LOADING_REVEAL] DONE', { mode, durationMs, percentFinal: 100 });
      }
      const screen = type === 'sector' ? 'ResultatSecteur' : 'ResultJob';
      if (typeof console !== 'undefined' && console.log) {
        console.log('[LOADING_REVEAL] NAVIGATE', { screen });
      }
      if (type === 'sector') {
        navigation.replace('ResultatSecteur', {
          sectorResult: resPayload.sectorResult,
          sectorDescriptionText: resPayload.sectorDescriptionText ?? '',
        });
      } else if (type === 'job') {
        navigation.replace('ResultJob', resPayload);
      }
    }, NAV_DELAY_MS);
    return () => clearTimeout(navTimer);
  }, [progress, navigation]);

  const strokeDashoffset = progressAnimated.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const displayPercent = Math.round(progress);
  const displaySubtitle = requestError
    ? "On finalise... (ça peut prendre quelques secondes)"
    : subtitle;

  const handleRetry = () => {
    setRequestError(false);
    setShowRetryButton(false);
    runRequestRef.current?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.entranceContent}>
        <View style={styles.contentWrap}>
          <View style={styles.textBlock}>
            <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text>
            <RNAnimated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>{displaySubtitle}</RNAnimated.Text>
          </View>
          {showRetryButton && (
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          )}
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
  /** Wrapper unique : titre + sous-titre + bouton Réessayer + cercle. Offset vertical pour centrage visuel. */
  contentWrap: {
    alignItems: 'center',
    width: '100%',
    transform: [{ translateY: -100 }],
  },
  textBlock: {
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
    fontWeight: '900',
  },
  donutWrapper: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
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
  retryButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(255,123,43,0.9)',
    borderRadius: 24,
  },
  retryButtonText: {
    fontFamily: theme.fonts.button,
    fontSize: 16,
    color: '#1A1B23',
    fontWeight: '900',
  },
});
