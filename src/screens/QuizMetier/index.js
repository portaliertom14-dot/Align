import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import QuestionHeader from '../../components/Quiz/QuestionHeader';
import AnswerOption from '../../components/Quiz/AnswerOption';
import Header from '../../components/Header';
import { useMetierQuiz } from '../../context/MetierQuizContext';
import { quizMetierQuestions } from '../../data/quizMetierQuestions';
import { fetchJobQuizQuestions } from '../../services/jobQuizQuestions';
import { getUserProgress } from '../../lib/userProgress';
import { theme } from '../../styles/theme';

/**
 * Écran Quiz Métier - 20 questions (cache par secteur/version, fallback local)
 * Avancement automatique au clic sur une option
 */
export default function QuizMetierScreen() {
  const navigation = useNavigation();
  const {
    currentQuestionIndex,
    setCurrentQuestionIndex,
    saveAnswer,
    getAnswer,
    setQuizQuestions,
  } = useMetierQuiz();

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [questionsList, setQuestionsList] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const progress = await getUserProgress();
        const sectorId = progress.activeDirection || '';
        const result = await fetchJobQuizQuestions(sectorId, 'v1');
        if (cancelled) return;
        const list = result?.questions?.length
          ? result.questions
          : quizMetierQuestions.map((q, i) => ({
              id: q.id,
              question: q.question,
              options: (q.options || []).map((o, j) => ({ label: typeof o === 'string' ? o : o?.label ?? '', value: ['A', 'B', 'C'][j] })),
            }));
        if (!cancelled) {
          setQuestionsList(list);
          setQuizQuestions(list);
        }
      } catch (_) {
        if (!cancelled) {
          const fallback = quizMetierQuestions.map((q) => ({
            id: q.id,
            question: q.question,
            options: (q.options || []).map((o, i) => ({ label: o, value: ['A', 'B', 'C'][i] })),
          }));
          setQuestionsList(fallback);
          setQuizQuestions(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  if (loading) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <Header />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Chargement des questions...</Text>
        </View>
      </LinearGradient>
    );
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
   * Gère la sélection d'une option avec avancement automatique
   */
  const handleSelectAnswer = (answer) => {
    setSelectedAnswer(answer);
    saveAnswer(currentQuestion.id, answer);

    // Avancement automatique après un court délai (pour feedback visuel)
    setTimeout(() => {
      if (isLastQuestion) {
        // Dernière question : rediriger vers la proposition de métier
        navigation.replace('PropositionMetier');
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
      }
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

        {/* Header avec QUESTION #X et barre de progression */}
        <QuestionHeader
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
        />

        {/* Sous-texte de question - Plus grande et responsive */}
        <Text style={styles.questionText}>{currentQuestion.texte}</Text>

        {/* Options de réponse */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <AnswerOption
              key={index}
              option={option}
              number={index + 1}
              isSelected={
                selectedAnswer != null &&
                (typeof option === 'object' && option?.value != null
                  ? selectedAnswer?.value === option.value
                  : selectedAnswer === option)
              }
              onPress={() => handleSelectAnswer(option)}
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








