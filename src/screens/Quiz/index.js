import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import QuestionHeader from '../../components/Quiz/QuestionHeader';
import AnswerCard from '../../components/AnswerCard';
import Header from '../../components/Header';
import { useQuiz } from '../../context/QuizContext';
import { QUIZ_PHASES } from '../../context/QuizContext';
import { questions, TOTAL_QUESTIONS } from '../../data/questions';
import { theme } from '../../styles/theme';
import { analyzeSector } from '../../services/analyzeSector';
import * as AuthContext from '../../context/AuthContext';

const CONFIDENCE_THRESHOLD = 0.60;

/**
 * Écran Quiz Secteur : 46 questions + mode affinement (micro-questions) si confidence faible.
 * Barre de progression : 1/46 → 46/46 puis 46/(46+N) → (46+N)/(46+N) pendant les micro-questions.
 */
export default function QuizScreen() {
  const navigation = useNavigation();
  AuthContext.useAuth(); // ensure AuthContext in scope for navigator
  const {
    currentQuestionIndex,
    setCurrentQuestionIndex,
    saveAnswer,
    getAnswer,
    quizPhase,
    enterRefinementMode,
    startRefinementQuiz,
    microQuestions,
    microAnswers,
    sectorRanked,
    saveMicroAnswer,
    getMicroAnswer,
    currentMicroIndex,
    setCurrentMicroIndex,
    answers,
    refinementRoundCount,
    incrementRefinementRoundCount,
  } = useQuiz();

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingRefinement, setAnalyzingRefinement] = useState(false);
  const [showRefinementRetry, setShowRefinementRetry] = useState(false);
  const lastMicroAnswersRef = useRef(null);

  const totalWithMicro = TOTAL_QUESTIONS + (microQuestions?.length || 0);
  const isMainPhase = quizPhase === QUIZ_PHASES.MAIN;
  const isRefinementIntro = quizPhase === QUIZ_PHASES.REFINEMENT_INTRO;
  const isRefinementQuiz = quizPhase === QUIZ_PHASES.REFINEMENT_QUIZ;

  const currentMainQuestion = questions?.[currentQuestionIndex];
  const currentMicroQuestion = isRefinementQuiz && microQuestions?.length > 0 ? microQuestions[currentMicroIndex] : null;
  const displayQuestion = isMainPhase ? currentMainQuestion : currentMicroQuestion;
  const questionNumber = isMainPhase ? currentQuestionIndex + 1 : TOTAL_QUESTIONS + currentMicroIndex + 1;
  const totalQuestions = isMainPhase ? TOTAL_QUESTIONS : totalWithMicro;
  const isLastMainQuestion = isMainPhase && currentQuestionIndex === TOTAL_QUESTIONS - 1;
  const isLastMicroQuestion = isRefinementQuiz && currentMicroIndex === microQuestions.length - 1;
  const savedAnswer = displayQuestion ? (isMainPhase ? getAnswer(displayQuestion.id) : getMicroAnswer(displayQuestion?.id)) : null;

  useEffect(() => {
    if (savedAnswer) setSelectedAnswer(savedAnswer);
    else setSelectedAnswer(null);
  }, [isMainPhase ? currentQuestionIndex : currentMicroIndex, savedAnswer]);

  const runFirstAnalyze = async (lastQuestionId = null, lastAnswer = null) => {
    setAnalyzing(true);
    try {
      const mergedAnswers = lastQuestionId != null && lastAnswer != null
        ? { ...answers, [lastQuestionId]: lastAnswer }
        : answers;
      const result = await analyzeSector(mergedAnswers, questions);
      const needsRefine = result.refinementRequired === true || result.needsRefinement === true;
      const ranked = result.sectorRanked ?? result.top2 ?? [];
      const micro = Array.isArray(result.microQuestions) ? result.microQuestions : [];
      const top1Id = ranked[0] && (typeof ranked[0] === 'object' ? ranked[0].id : ranked[0]);
      const top2Id = ranked[1] && (typeof ranked[1] === 'object' ? ranked[1].id : ranked[1]);
      console.log('[IA_SECTOR_APP] initial', {
        needsRefinement: needsRefine,
        microQuestionsLength: micro.length,
        top1Id,
        top2Id,
        requestId: result?.debug?.requestId ?? result?.requestId,
      });
      if (needsRefine && ranked.length >= 1 && micro.length > 0) {
        enterRefinementMode(ranked, micro);
      } else {
        if (needsRefine && micro.length === 0 && top1Id) {
          console.log('[IA_SECTOR_APP] initial: no microQuestions from API, going to result with top1');
        }
        navigation.replace('ResultatSecteur', { sectorResult: result });
      }
    } catch (err) {
      console.error('[Quiz] analyzeSector error:', err);
      const msg = err?.message ?? 'L\'analyse a échoué. Réessaie.';
      const isNetwork = /connexion|réseau|network|fetch|cors|access control/i.test(msg);
      Alert.alert(
        isNetwork ? 'Problème de connexion' : 'Erreur',
        isNetwork ? 'Vérifie ta connexion internet et réessaie en appuyant à nouveau sur « Analyser ».' : msg,
        [{ text: 'OK' }]
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const runRefinementAnalyze = async (finalMicroAnswers) => {
    setShowRefinementRetry(false);
    setAnalyzingRefinement(true);
    lastMicroAnswersRef.current = finalMicroAnswers;
    const candidates = (sectorRanked || []).slice(0, 2).map((s) => (typeof s === 'object' && s?.id != null ? s.id : s));
    const microAnswersForApi = {};
    (microQuestions || []).forEach((q) => {
      const a = finalMicroAnswers[q.id];
      const val = a != null && typeof a === 'object' && a.value != null
        ? String(a.value).trim().toUpperCase()
        : (typeof a === 'string' && /^[ABC]$/i.test(a) ? a.toUpperCase() : null);
      if (val) microAnswersForApi[q.id] = val;
    });
    console.log('[IA_SECTOR_APP] refinement_submit', {
      topCandidates: candidates,
      refinementAnswersKeys: Object.keys(microAnswersForApi),
    });
    if (candidates.length < 2) {
      const id = candidates[0];
      setAnalyzingRefinement(false);
      navigation.replace('ResultatSecteur', {
        sectorResult: {
          pickedSectorId: id,
          secteurId: id,
          secteurName: id,
          description: `Ton profil est polyvalent, mais le secteur le plus cohérent reste : ${id}.`,
          forcedPolyvalent: true,
        },
      });
      return;
    }
    try {
      const result = await analyzeSector(answers, questions, {
        microAnswers: microAnswersForApi,
        candidateSectors: candidates,
        refinementCount: refinementRoundCount + 1,
      });
      console.log('[IA_SECTOR_APP] refinement_result', {
        pickedSectorId: result.pickedSectorId,
        confidence: result.confidence,
        needsRefinement: result.needsRefinement ?? result.refinementRequired,
      });
      const finalResult = result.forcedDecision === true
        ? { ...result, forcedPolyvalent: true }
        : result;
      navigation.replace('ResultatSecteur', { sectorResult: finalResult });
    } catch (err) {
      console.error('[Quiz] refinement analyzeSector error:', err);
      const msg = err?.message ?? '';
      const isNetwork = /connexion|réseau|network|fetch|cors|access control|temps/i.test(msg);
      if (isNetwork) {
        setShowRefinementRetry(true);
        Alert.alert('Problème de connexion', 'Vérifie ta connexion internet. Tu peux réessayer avec le bouton ci-dessous.', [{ text: 'OK' }]);
        return;
      }
      if (sectorRanked?.length > 0) {
        const top1 = sectorRanked[0];
        const id = typeof top1 === 'object' ? top1.id : top1;
        navigation.replace('ResultatSecteur', {
          sectorResult: {
            pickedSectorId: id,
            secteurId: id,
            secteurName: id,
            description: `Ton profil est polyvalent, mais le secteur le plus cohérent reste : ${id}.`,
            forcedPolyvalent: true,
          },
        });
      } else {
        Alert.alert('Erreur', err?.message ?? 'L\'analyse a échoué. Réessaie.');
      }
    } finally {
      setAnalyzingRefinement(false);
    }
  };

  const handleSelectAnswer = (answer) => {
    if (isMainPhase) {
      setSelectedAnswer(answer);
      saveAnswer(currentMainQuestion.id, answer);
      setTimeout(() => {
        if (isLastMainQuestion) {
          runFirstAnalyze(currentMainQuestion.id, answer);
        } else {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer(null);
        }
      }, 300);
    } else if (isRefinementQuiz && currentMicroQuestion) {
      const option = typeof answer === 'object' && (answer?.label != null || answer?.value != null)
        ? answer
        : { label: answer, value: answer };
      setSelectedAnswer(option);
      saveMicroAnswer(currentMicroQuestion.id, option);
      setTimeout(() => {
        if (isLastMicroQuestion) {
          const allMicro = { ...(microAnswers || {}), [currentMicroQuestion.id]: option };
          runRefinementAnalyze(allMicro);
        } else {
          setCurrentMicroIndex(currentMicroIndex + 1);
          setSelectedAnswer(null);
        }
      }, 300);
    }
  };

  const handlePrevious = () => {
    if (isMainPhase && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (isRefinementQuiz && currentMicroIndex > 0) {
      setCurrentMicroIndex(currentMicroIndex - 1);
    }
  };

  const handleSkip = () => {
    if (isMainPhase) {
      saveAnswer(currentMainQuestion?.id, null);
      if (isLastMainQuestion) runFirstAnalyze(currentMainQuestion?.id, null);
      else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
      }
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur de chargement des questions</Text>
        </View>
      </LinearGradient>
    );
  }

  if (isMainPhase && !currentMainQuestion) {
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Question non trouvée</Text>
        </View>
      </LinearGradient>
    );
  }

  if (isRefinementQuiz && !currentMicroQuestion) {
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color="#FF7B2B" />
          <Text style={styles.errorText}>Chargement...</Text>
        </View>
      </LinearGradient>
    );
  }

  const questionText = isMainPhase ? (currentMainQuestion?.texte ?? '') : (currentMicroQuestion?.question ?? '');
  const options = isMainPhase ? (currentMainQuestion?.options ?? []) : (currentMicroQuestion?.options ?? []).map((o) => (typeof o === 'object' && o?.label != null ? o : { label: String(o), value: String(o) }));

  return (
    <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Header />
        <QuestionHeader questionNumber={questionNumber} totalQuestions={totalQuestions} />
        <Text style={styles.questionText}>{questionText}</Text>
        <View style={styles.optionsContainer}>
          {options.map((option, index) => {
            const optLabel = typeof option === 'object' && option?.label != null ? option.label : option;
            const isSelectedOption = selectedAnswer === option || selectedAnswer === optLabel || (typeof selectedAnswer === 'object' && selectedAnswer?.label === optLabel);
            return (
              <AnswerCard
                key={index}
                label={typeof option === 'object' && option?.label != null ? option : optLabel}
                index={index + 1}
                onClick={() => handleSelectAnswer(option)}
                isSelected={isSelectedOption}
              />
            );
          })}
        </View>
        {(isMainPhase && currentQuestionIndex > 0) || (isRefinementQuiz && currentMicroIndex > 0) ? (
          <View style={styles.previousContainer}>
            <TouchableOpacity onPress={handlePrevious} style={styles.previousButton}>
              <Text style={styles.previousButtonText}>← Question précédente</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Overlay "On affine ton profil" (mode affinement intro) */}
      <Modal visible={isRefinementIntro} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>On affine ton profil</Text>
            <Text style={styles.overlayText}>
              Tes réponses touchent plusieurs secteurs proches. Réponds à quelques questions rapides pour préciser.
            </Text>
            <TouchableOpacity style={styles.overlayButton} onPress={startRefinementQuiz} activeOpacity={0.8}>
              <LinearGradient colors={['#FF7B2B', '#FFD93F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.overlayButtonGradient}>
                <Text style={styles.overlayButtonText}>Continuer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading après submit des 46 réponses */}
      {(analyzing || analyzingRefinement) && (
        <View style={[styles.loadingOverlay, { pointerEvents: 'box-only' }]}>
          <ActivityIndicator size="large" color="#FF7B2B" />
          <Text style={styles.loadingText}>{analyzingRefinement ? 'On affine...' : 'Analyse de tes réponses...'}</Text>
        </View>
      )}

      {/* Erreur réseau affinage : message + bouton Réessayer */}
      {showRefinementRetry && !analyzingRefinement && (
        <View style={styles.retryBanner}>
          <Text style={styles.retryBannerText}>Problème de connexion. Vérifie ton réseau.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => lastMicroAnswersRef.current && runRefinementAnalyze(lastMicroAnswersRef.current)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
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
  optionsContainer: { paddingHorizontal: 24, marginBottom: 24 },
  previousContainer: { paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },
  previousButton: { paddingVertical: 12, paddingHorizontal: 24 },
  previousButtonText: { fontSize: 16, color: '#FFFFFF', opacity: 0.7, fontFamily: theme.fonts.body },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 18, color: '#FFFFFF', textAlign: 'center', fontFamily: theme.fonts.body },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayCard: {
    backgroundColor: '#1A1B23',
    borderRadius: 24,
    padding: 28,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,123,43,0.3)',
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: theme.fonts.button,
  },
  overlayText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: theme.fonts.body,
  },
  overlayButton: { borderRadius: 20, overflow: 'hidden' },
  overlayButtonGradient: { paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  overlayButtonText: { fontSize: 18, fontWeight: 'bold', color: '#1A1B23', fontFamily: theme.fonts.button },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#FFFFFF', fontFamily: theme.fonts.body },
  retryBanner: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(26,27,35,0.98)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,123,43,0.4)',
    alignItems: 'center',
  },
  retryBannerText: { fontSize: 15, color: '#FFFFFF', marginBottom: 12, textAlign: 'center', fontFamily: theme.fonts.body },
  retryButton: { backgroundColor: '#FF7B2B', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  retryButtonText: { fontSize: 16, fontWeight: 'bold', color: '#1A1B23', fontFamily: theme.fonts.button },
});
