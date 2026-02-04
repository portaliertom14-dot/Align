import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getUserProgress } from '../../../lib/userProgress';
import { getSerieById } from '../../../data/serieData';
import { getTestQuestionsForSerie } from '../../../data/sectorTestQuestions';
import { completeLevel, addXP } from '../../../lib/userProgress';
import { canAccessSerieLevel, redirectToAppropriateScreen } from '../../../lib/navigationGuards';
import Button from '../../../components/Button';
import Title from '../../../components/Title';
import Card from '../../../components/Card';
import StandardHeader from '../../../components/StandardHeader';
import { theme } from '../../../styles/theme';

/**
 * Module 3 - Test de connaissances sur le secteur actif
 * Ne sert PAS à choisir un secteur, mais à tester les connaissances
 * sur le secteur déjà déterminé par le quiz
 */
export default function SeriesModule3Screen() {
  const navigation = useNavigation();
  const [serie, setSerie] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
    loadData();
  }, []);

  const checkAccess = async () => {
    const canAccess = await canAccessSerieLevel(3);
    if (!canAccess) {
      await redirectToAppropriateScreen(navigation);
    }
  };

  const loadData = async () => {
    try {
      const progress = await getUserProgress();
      
      // Vérifier que l'utilisateur peut accéder à cette page
      const canAccess = await canAccessSerieLevel(3);
      if (!canAccess) {
        await redirectToAppropriateScreen(navigation);
        return;
      }

      // Récupérer la série active
      if (!progress.activeSerie) {
        console.warn('Aucune série active trouvée');
        await redirectToAppropriateScreen(navigation);
        return;
      }

      const activeSerie = getSerieById(progress.activeSerie);
      if (!activeSerie) {
        console.warn('Série non trouvée');
        navigation.replace('SeriesStart');
        return;
      }

      setSerie(activeSerie);
      
      // Récupérer les questions de test pour ce secteur
      const testQuestions = getTestQuestionsForSerie(progress.activeSerie);
      setQuestions(testQuestions);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId, answerIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: answerIndex,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculer le score
      let correctAnswers = 0;
      questions.forEach((question) => {
        if (selectedAnswers[question.id] === question.correctAnswer) {
          correctAnswers++;
        }
      });

      const finalScore = Math.round((correctAnswers / questions.length) * 100);
      setScore(finalScore);
      setShowResults(true);
    }
  };

  const handleComplete = async () => {
    // Ajouter de l'XP (100 XP pour compléter le niveau 3)
    await addXP(100);
    
    // Marquer le niveau comme complété
    await completeLevel(3);
    
    // Naviguer vers l'écran de complétion
    navigation.replace('SeriesComplete');
  };

  if (loading || !serie) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <StandardHeader title="ALIGN" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </LinearGradient>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const hasAnswer = selectedAnswers[currentQuestion?.id] !== undefined;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Écran de résultats
  if (showResults) {
    const familiarityLevel = score >= 75 ? 'Élevé' : score >= 50 ? 'Moyen' : 'À découvrir';
    const familiarityColor = score >= 75 ? '#34C759' : score >= 50 ? '#FF9500' : '#FF7B2B';
    const familiarityMessage = score >= 75 
      ? 'Tu connais bien ce secteur !'
      : score >= 50 
      ? 'Tu as des bases, continue à explorer.'
      : 'C\'est normal, tu vas découvrir ce secteur.';

    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <StandardHeader title="ALIGN" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Titre */}
          <View style={styles.sectionHeader}>
            <Title variant="h1" style={styles.title}>
              Ton niveau de familiarité
            </Title>
          </View>

          {/* Card de résultats */}
          <Card style={styles.resultCard}>
            {/* Score */}
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>{score}%</Text>
              <Text style={[styles.familiarityLevel, { color: familiarityColor }]}>
                {familiarityLevel}
              </Text>
            </View>

            {/* Message */}
            <Text style={styles.familiarityMessage}>
              {familiarityMessage}
            </Text>

            {/* Explication */}
            <View style={styles.explanationBox}>
              <Text style={styles.explanationText}>
                Ce test mesure ta connaissance actuelle du secteur <Text style={styles.boldText}>{serie.title}</Text>.
                {'\n\n'}
                Peu importe ton score, l'important c'est d'avancer et de découvrir ce qui te correspond vraiment.
              </Text>
            </View>
          </Card>

          {/* Bouton pour continuer */}
          <View style={styles.buttonContainer}>
            <Button
              title="Continuer"
              onPress={handleComplete}
              style={styles.continueButton}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Écran de questions
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
      <StandardHeader title="ALIGN" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section titre */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectorLabel}>Test de connaissances</Text>
          <Title variant="h2" style={styles.sectorTitle}>
            {serie.title}
          </Title>
          <Text style={styles.introText}>
            Voici le secteur qui correspond le plus à ton profil.
            {'\n'}
            Voyons maintenant si tu le connais vraiment.
          </Text>
        </View>

        {/* Barre de progression */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={theme.colors.gradient.buttonOrange}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} / {questions.length}
          </Text>
        </View>

        {/* Question */}
        {currentQuestion && (
          <Card style={styles.questionCard}>
            <Text style={styles.questionText}>
              {currentQuestion.question}
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswers[currentQuestion.id] === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleSelectAnswer(currentQuestion.id, index)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bouton Continuer */}
            <View style={styles.nextButtonContainer}>
              <Button
                title={currentQuestionIndex < questions.length - 1 ? "Suivant" : "Voir les résultats"}
                onPress={handleNext}
                disabled={!hasAnswer}
                style={styles.nextButton}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: theme.fonts.body,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  sectorLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
    fontFamily: theme.fonts.body,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectorTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 28,
  },
  introText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: theme.fonts.body,
    opacity: 0.9,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: theme.fonts.body,
    opacity: 0.8,
  },
  questionCard: {
    marginHorizontal: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  questionText: {
    fontSize: 20,
    color: '#000000',
    marginBottom: 24,
    fontFamily: theme.fonts.body,
    fontWeight: '600',
    lineHeight: 28,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#00AAFF',
  },
  optionText: {
    fontSize: 16,
    color: '#333333',
    fontFamily: theme.fonts.body,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#0055FF',
    fontWeight: '600',
  },
  nextButtonContainer: {
    marginTop: 8,
  },
  nextButton: {
    width: '100%',
  },
  // Styles pour l'écran de résultats
  title: {
    textAlign: 'center',
    fontSize: 32,
  },
  resultCard: {
    marginHorizontal: 24,
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 64,
    fontFamily: theme.fonts.button,
    color: '#000000',
    marginBottom: 8,
  },
  familiarityLevel: {
    fontSize: 24,
    fontFamily: theme.fonts.title,
    fontWeight: 'bold',
  },
  familiarityMessage: {
    fontSize: 18,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: theme.fonts.body,
    fontWeight: '500',
  },
  explanationBox: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00AAFF',
  },
  explanationText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
    fontFamily: theme.fonts.body,
  },
  boldText: {
    fontWeight: '600',
    color: '#000000',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  continueButton: {
    width: '100%',
  },
});
