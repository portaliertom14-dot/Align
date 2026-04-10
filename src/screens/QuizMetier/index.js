import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import QuestionHeader from '../../components/Quiz/QuestionHeader';
import { resolveMetierEncouragement } from '../../lib/quizEncouragement';
import AnswerCard from '../../components/AnswerCard';
import Header from '../../components/Header';
import AlignLoading from '../../components/AlignLoading';
import { useMetierQuiz } from '../../context/MetierQuizContext';
import { quizMetierQuestionsV2 } from '../../data/quizMetierQuestionsV2';
import { getSectorVariant } from '../../domain/sectorVariant';
import { computeDroitVariantFromRefinement } from '../../domain/refineDroitTrack';
import { theme } from '../../styles/theme';
import { isPaywallEnabled } from '../../config/appConfig';
import { hasPremiumAccess, setPremiumAccessCacheTrue } from '../../services/stripeService';
import { supabase } from '../../services/supabase';

const CHECKOUT_SUCCESS_KEY = 'align_checkout_success';
const PAYWALL_RETURN_PAYLOAD_KEY = 'paywall_return_payload';

/** 5 questions d'affinage Droit vs Défense — même format que quizMetierQuestionsV2, affichées comme questions métier (sans écran séparé). */
const DROIT_REFINEMENT_QUESTIONS = [
  {
    id: 'refine_1',
    question: 'Tu préfères travailler surtout sur :',
    options: [
      { label: 'des textes, des règles, des arguments', value: 'A' },
      { label: 'des actions sur le terrain pour la sécurité', value: 'B' },
      { label: 'Ça dépend', value: 'C' },
    ],
  },
  {
    id: 'refine_2',
    question: 'Ta journée idéale ressemble plus à :',
    options: [
      { label: 'lire des dossiers, préparer des décisions, conseiller', value: 'A' },
      { label: 'patrouiller, protéger, intervenir en urgence', value: 'B' },
      { label: 'Ça dépend', value: 'C' },
    ],
  },
  {
    id: 'refine_3',
    question: 'Ce qui te motive le plus :',
    options: [
      { label: 'faire respecter la règle et la justice', value: 'A' },
      { label: 'protéger directement des personnes sur le terrain', value: 'B' },
      { label: 'Ça dépend', value: 'C' },
    ],
  },
  {
    id: 'refine_4',
    question: 'Tu te vois davantage :',
    options: [
      { label: 'en bureau, cabinet, tribunal ou administration', value: 'A' },
      { label: 'en uniforme, en caserne ou en unité de protection', value: 'B' },
      { label: 'Ça dépend', value: 'C' },
    ],
  },
  {
    id: 'refine_5',
    question: 'Tu acceptes plutôt :',
    options: [
      { label: 'peu de risque physique mais beaucoup de règles à suivre', value: 'A' },
      { label: 'plus de risque et d’urgence, décisions rapides', value: 'B' },
      { label: 'Ça dépend', value: 'C' },
    ],
  },
];

/**
 * Écran Quiz Métier V2 — 30 questions (metier_1..metier_30), ou 35 si needsDroitRefinement (5 affinage + 30 métier).
 * En fin de quiz : analyzeJobResult (cosine + rerank IA) → top3 ou 3 questions d'affinage (Q31–Q33) puis ResultJob.
 */
export default function QuizMetierScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const needsDroitRefinement = route.params?.needsDroitRefinement === true;
  const {
    currentQuestionIndex,
    setCurrentQuestionIndex,
    saveAnswer,
    getAnswer,
    setQuizQuestions,
    answers,
  } = useMetierQuiz();

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [encouragementMessage, setEncouragementMessage] = useState(null);
  const [encouragementKey, setEncouragementKey] = useState(0);
  const [questionsList, setQuestionsList] = useState(null);
  const [loading, setLoading] = useState(true);
  /** True après injection des 3 questions d'affinage ambiguïté (refine_ambig_1/2/3). */
  const [refinementQuestionsInjected, setRefinementQuestionsInjected] = useState(false);
  const [analyzingJob, setAnalyzingJob] = useState(false);

  const lastMetierQuestionIndex = (needsDroitRefinement ? 35 : 30) - 1;

  // Paywall après secteur : accès au quiz réservé aux premium ; après retour Stripe, ne pas renvoyer au paywall tant que la DB n’a pas le flag.
  useEffect(() => {
    if (!isPaywallEnabled()) return;
    if (route.params?.refinementFromLoadingReveal) return;

    let checkoutOk = route.params?.fromCheckoutSuccess === true;
    if (!checkoutOk && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        checkoutOk = window.sessionStorage.getItem(CHECKOUT_SUCCESS_KEY) === 'true';
      } catch (_) {}
    }

    let cancelled = false;
    (async () => {
      if (checkoutOk) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            await supabase.from('user_profiles').update({ is_premium: true }).eq('id', user.id);
          }
          await setPremiumAccessCacheTrue();
          if (typeof window !== 'undefined' && window.sessionStorage) {
            try {
              window.sessionStorage.removeItem(CHECKOUT_SUCCESS_KEY);
              window.sessionStorage.removeItem(PAYWALL_RETURN_PAYLOAD_KEY);
            } catch (_) {}
          }
        } catch (_) {}
        return;
      }

      const ok = await hasPremiumAccess();
      if (cancelled) return;
      if (ok) return;

      const sectorId = route.params?.sectorId;
      const sectorRanked = route.params?.sectorRanked;
      const needsDroit = route.params?.needsDroitRefinement === true;
      const variantOverride = route.params?.variantOverride;
      if (sectorId != null && String(sectorId).trim() !== '') {
        navigation.replace('Paywall', {
          sectorPaywallResume: {
            sectorId,
            sectorRanked: Array.isArray(sectorRanked) ? sectorRanked : [],
            needsDroitRefinement: needsDroit,
            ...(variantOverride != null ? { variantOverride } : {}),
          },
        });
      } else {
        navigation.replace('Paywall');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    navigation,
    route.params?.sectorId,
    route.params?.sectorRanked,
    route.params?.needsDroitRefinement,
    route.params?.refinementFromLoadingReveal,
    route.params?.fromCheckoutSuccess,
    route.params?.variantOverride,
  ]);

  useEffect(() => {
    const metierList = quizMetierQuestionsV2.map((q) => ({
      id: q.id,
      question: q.question,
      options: (q.options || []).map((o) => ({ label: o?.label ?? '', value: o?.value ?? 'B' })),
    }));
    const list = needsDroitRefinement
      ? [
          ...DROIT_REFINEMENT_QUESTIONS.map((q) => ({
            id: q.id,
            question: q.question,
            options: (q.options || []).map((o) => ({ label: o?.label ?? '', value: o?.value ?? 'B' })),
          })),
          ...metierList,
        ]
      : metierList;
    setQuestionsList(list);
    setQuizQuestions(list);
    setLoading(false);
  }, [setQuizQuestions, needsDroitRefinement]);

  const questions = (questionsList || []).map((q) => ({
    id: q.id,
    texte: q.question,
    options: q.options || [],
  }));
  const totalQuestions = questions.length;

  const currentQuestion = questions[currentQuestionIndex];
  const savedAnswer = getAnswer(currentQuestion?.id);
  const questionNumber = currentQuestionIndex + 1;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Initialiser la réponse sélectionnée si elle existe
  useEffect(() => {
    if (savedAnswer) {
      setSelectedAnswer(savedAnswer);
    } else {
      setSelectedAnswer(null);
    }
  }, [currentQuestionIndex, savedAnswer]);

  const encouragementClearRef = useRef(null);
  const lastEncouragementRef = useRef(null);

  const triggerEncouragement = (text) => {
    if (!text) return;
    if (encouragementClearRef.current) clearTimeout(encouragementClearRef.current);
    setEncouragementMessage(text);
    lastEncouragementRef.current = text;
    setEncouragementKey((k) => k + 1);
    encouragementClearRef.current = setTimeout(() => {
      setEncouragementMessage(null);
      encouragementClearRef.current = null;
    }, 1400);
  };

  if (loading) {
    return <AlignLoading />;
  }

  // Vérification de sécurité
  if (!questions || questions.length === 0) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur de chargement des questions</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!currentQuestion) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Question non trouvée</Text>
        </View>
      </LinearGradient>
    );
  }

  /**
   * Dernière question : navigation immédiate vers LoadingReveal (aucun loader orange, même logique que Quiz secteur).
   * Payload construit de façon synchrone pour éviter tout délai/overlay.
   */
  const goToLoadingRevealOnLastAnswer = (answer) => {
    const sectorIdFromParams = (route.params?.sectorId && String(route.params.sectorId).trim()) || '';
    const sectorRankedFromParams = Array.isArray(route.params?.sectorRanked) ? route.params.sectorRanked : [];
    const sectorId = sectorIdFromParams;
    const answersForService = { ...answers, [currentQuestion.id]: answer };
    let variantOverride = route.params?.variantOverride ?? null;
    if (needsDroitRefinement) {
      const droitRefinement = {
        refine_1: answersForService.refine_1,
        refine_2: answersForService.refine_2,
        refine_3: answersForService.refine_3,
        refine_4: answersForService.refine_4,
        refine_5: answersForService.refine_5,
      };
      variantOverride = computeDroitVariantFromRefinement(droitRefinement);
    }
    const variant =
      variantOverride === 'default' || variantOverride === 'defense_track'
        ? variantOverride
        : getSectorVariant({
            pickedSectorId: sectorId,
            ranked: sectorRankedFromParams.map((r) => ({ id: typeof r?.id === 'string' ? r.id : String(r?.id ?? ''), score: typeof r?.score === 'number' ? r.score : 0 })),
          });
    const rawAnswers30 = {};
    for (const [id, a] of Object.entries(answersForService)) {
      if (!id || !id.startsWith('metier_')) continue;
      const v = a && (a.value === 'A' || a.value === 'B' || a.value === 'C') ? a.value : null;
      if (v) rawAnswers30[id] = { value: v };
    }
    const sectorSummary = route.params?.sectorSummary ?? undefined;

    if (refinementQuestionsInjected && (currentQuestion.id === 'refine_ambig_3' || (currentQuestion.id && String(currentQuestion.id).startsWith('refine_ambig_')))) {
      const r1 = getAnswer('refine_ambig_1') ?? answersForService.refine_ambig_1;
      const r2 = getAnswer('refine_ambig_2') ?? answersForService.refine_ambig_2;
      const toVal = (o) => (o && (o.value === 'A' || o.value === 'B' || o.value === 'C') ? o.value : 'C');
      const refinementAnswers = {
        refine_ambig_1: { value: toVal(r1) },
        refine_ambig_2: { value: toVal(r2) },
        refine_ambig_3: { value: toVal(answer) },
      };
      navigation.replace('LoadingReveal', {
        mode: 'job',
        payload: { sectorId, variant, rawAnswers30, sectorSummary, refinementAnswers },
      });
      return;
    }

    navigation.replace('LoadingReveal', {
      mode: 'job',
      payload: { sectorId, variant, rawAnswers30, sectorSummary },
    });
  };

  const handleSelectAnswer = (answer) => {
    setSelectedAnswer(answer);
    saveAnswer(currentQuestion.id, answer);

    const completedNum = currentQuestionIndex + 1;
    triggerEncouragement(resolveMetierEncouragement(completedNum, lastEncouragementRef.current));

    if (isLastQuestion) {
      goToLoadingRevealOnLastAnswer(answer);
      return;
    }

    setTimeout(() => {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    }, 300);
  };

  /**
   * Passe à la question précédente
   */
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // La réponse sera restaurée via useEffect
    }
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header ALIGN - même hauteur et taille que les autres écrans (onboarding) */}
        <Header />

        <QuestionHeader
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
          encouragementMessage={encouragementMessage}
          encouragementKey={encouragementKey}
        />

        {/* Sous-texte de question - Plus grande et responsive */}
        <Text style={styles.questionText}>{currentQuestion.texte}</Text>

        {/* Options de réponse — AnswerCard (design aligné onboarding/secteur) */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <AnswerCard
              key={index}
              label={option}
              index={index + 1}
              onClick={() => handleSelectAnswer(option)}
              isSelected={
                selectedAnswer != null &&
                (typeof option === 'object' && option?.value != null
                  ? selectedAnswer?.value === option.value
                  : selectedAnswer === option)
              }
            />
          ))}
        </View>

        {/* Bouton pour revenir en arrière */}
        {currentQuestionIndex > 0 && (
          <View style={styles.previousContainer}>
            <TouchableOpacity
              onPress={handlePrevious}
              style={styles.previousButton}
            >
              <Text style={styles.previousButtonText}>← Question précédente</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: theme.fonts.body,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  questionText: {
    ...theme.typography.body,
    fontFamily: theme.fonts.button,
    fontSize: 24,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
    lineHeight: 34,
    fontWeight: '900',
  },
  optionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  previousContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  previousButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  previousButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
    fontFamily: theme.fonts.body,
  },
});








