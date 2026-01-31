import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import QuestionHeader from '../../components/Quiz/QuestionHeader';
import AnswerOption from '../../components/Quiz/AnswerOption';
import Header from '../../components/Header';
import { TouchableOpacity } from 'react-native';
import { useQuiz } from '../../context/QuizContext';
import { questions, TOTAL_QUESTIONS } from '../../data/questions';
import { theme } from '../../styles/theme';

/**
 * Écran Quiz Align avec design exact
 * Fond dégradé bleu, options arrondies, boutons dégradés
 */
export default function QuizScreen() {
  const navigation = useNavigation();
  const {
    currentQuestionIndex,
    setCurrentQuestionIndex,
    saveAnswer,
    getAnswer,
  } = useQuiz();

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  
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

  const currentQuestion = questions[currentQuestionIndex];
  
  // Vérification de sécurité supplémentaire
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

  const savedAnswer = currentQuestion ? getAnswer(currentQuestion.id) : null;
  const questionNumber = currentQuestionIndex + 1;
  const isLastQuestion = currentQuestionIndex === TOTAL_QUESTIONS - 1;

  // Initialiser la réponse sélectionnée si elle existe
  useEffect(() => {
    if (savedAnswer) {
      setSelectedAnswer(savedAnswer);
    } else {
      setSelectedAnswer(null);
    }
  }, [currentQuestionIndex, savedAnswer]);

  /**
   * Gère la sélection d'une option avec avancement automatique
   */
  const handleSelectAnswer = (answer) => {
    setSelectedAnswer(answer);
    saveAnswer(currentQuestion.id, answer);
    
    // Avancement automatique après un court délai (pour feedback visuel)
    setTimeout(() => {
      if (isLastQuestion) {
        // Dernière question : rediriger vers les résultats
        navigation.replace('ResultatSecteur');
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

  /**
   * Saute la question actuelle
   */
  const handleSkip = () => {
    // Enregistrer null comme réponse
    saveAnswer(currentQuestion.id, null);

    if (isLastQuestion) {
      navigation.replace('Resultat');
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
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
        <Header hideProgress={true} alignWithOnboarding={true} />

        {/* Header avec QUESTION #X et barre de progression */}
        <QuestionHeader
          questionNumber={questionNumber}
          totalQuestions={TOTAL_QUESTIONS}
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
              isSelected={selectedAnswer === option}
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
});
