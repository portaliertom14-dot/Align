/**
 * Régénération métier : 5 questions puis LoadingReveal → ResultJob.
 * 1 clic sur une réponse = enregistrement + passage à la question suivante (pas de bouton Suivant).
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import QuestionHeader from '../../components/Quiz/QuestionHeader';
import AnswerCard from '../../components/AnswerCard';
import Header from '../../components/Header';
import AlignLoading from '../../components/AlignLoading';
import { refineJobQuestions } from '../../services/refineJobQuestions';
import { theme } from '../../styles/theme';

const TOTAL = 5;

/** Fallback si edge refine-job-questions échoue. */
const REFINE_JOB_QUESTIONS_MOCK = [
  { id: 'refine_regen_1', title: 'Tu préfères travailler surtout…', choices: { A: 'En équipe, au contact', B: 'En autonomie, en profondeur', C: 'Les deux selon les missions' } },
  { id: 'refine_regen_2', title: 'Ton rythme idéal…', choices: { A: 'Cadré, récurrent', B: 'Varié, imprévisible', C: 'Entre les deux' } },
  { id: 'refine_regen_3', title: "Tu es plus à l'aise…", choices: { A: "À l'oral et en relation", B: "À l'écrit et en analyse", C: 'Les deux' } },
  { id: 'refine_regen_4', title: 'Ce qui te motive le plus…', choices: { A: 'Impact direct, terrain', B: 'Stratégie, vision long terme', C: 'Les deux' } },
  { id: 'refine_regen_5', title: 'Tu préfères…', choices: { A: 'Résoudre des problèmes concrets', B: 'Créer ou améliorer des processus', C: 'Les deux' } },
];

export default function RefineJobScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { sectorId = '', variant = 'default', previousTopJobs = [], rawAnswers30: initialRawAnswers30 = {} } = route.params || {};

  const [questions, setQuestions] = useState(REFINE_JOB_QUESTIONS_MOCK);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await refineJobQuestions({
        sectorId,
        variant,
        rawAnswers30: initialRawAnswers30,
        previousTopJobs,
      });
      if (!cancelled && Array.isArray(list) && list.length >= TOTAL) {
        setQuestions(list);
      }
      if (!cancelled) setQuestionsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sectorId, variant]);

  const currentQuestion = questions[step];

  const submit = (refineAnswers5) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[JOB_REGEN] SUBMIT', { sectorId, variant });
    }
    navigation.replace('LoadingReveal', {
      mode: 'job',
      payload: {
        refineRegen: true,
        sectorId,
        variant,
        rawAnswers30: initialRawAnswers30,
        refineAnswers5,
        previousTopJobs,
      },
    });
  };

  const handleSelectAnswer = (choice) => {
    if (isSubmitting) return;
    const nextAnswers = { ...answers, [currentQuestion.id]: choice };
    setAnswers(nextAnswers);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[JOB_REGEN] QUESTIONS_STEP', { step: step + 1, choice });
    }
    if (step >= TOTAL - 1) {
      submit(nextAnswers);
    } else {
      setStep((s) => s + 1);
    }
  };

  if (questionsLoading) {
    return <AlignLoading subtitle={questionsLoading ? 'Chargement des questions…' : 'On affîne ton métier…'} />;
  }

  if (!currentQuestion) {
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erreur</Text>
        </View>
      </LinearGradient>
    );
  }

  const choicesList = ['A', 'B', 'C'].map((key) => ({ value: key, label: currentQuestion.choices[key] ?? '' })).filter((c) => c.label);

  return (
    <LinearGradient colors={['#1A1B23', '#1A1B23']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.container}>
      <Header title="ALIGN" alignWithOnboarding />
      <QuestionHeader questionNumber={step + 1} totalQuestions={TOTAL} />
      <View style={styles.content}>
        <Text style={styles.questionText}>{currentQuestion.title}</Text>
        <View style={styles.optionsWrap}>
          {choicesList.map((opt, i) => (
            <AnswerCard
              key={opt.value}
              label={opt.label}
              index={i + 1}
              onClick={() => handleSelectAnswer(opt.value)}
              isSelected={answers[currentQuestion?.id] === opt.value}
            />
          ))}
        </View>
        {step > 0 && (
          <TouchableOpacity style={styles.previousButton} onPress={() => setStep((s) => s - 1)} activeOpacity={0.8}>
            <Text style={styles.previousButtonText}>← Question précédente</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  questionText: {
    fontFamily: theme.fonts.button,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 28,
  },
  optionsWrap: { marginBottom: 24 },
  previousButton: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  previousButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: theme.fonts.body,
  },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#FFFFFF', fontFamily: theme.fonts.button },
});
