/**
 * Écran Module - Affiche un module avec ses items (10-15 items)
 * Format simple et rapide, style Duolingo premium
 * Avec correction d'erreurs et messages courts
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import { theme } from '../../styles/theme';

/**
 * Mélange un tableau de manière aléatoire (Fisher-Yates)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Messages courts pour les bonnes réponses
 */
const POSITIVE_MESSAGES = [
  'Félicitations !',
  'Bien joué !',
  'Bravo !',
  'Excellent !',
  'Parfait !',
  'Correct !',
  'Super !',
  'Magnifique !',
  'Impressionnant !',
  'Génial !',
  'Incroyable !',
  'Trop fort !',
];

/**
 * Messages d'encouragement pour les erreurs
 */
const ENCOURAGEMENT_MESSAGES = [
  'Presque..',
  'Pas tout à fait',
  'Oups…',
  'Dommage',
  'Ce n\'est pas grave',
  'Tu apprends !',
  'Les erreurs font partie du processus',
  'Continue, tu y es presque',
  'Ne lâche rien',
  'Encore un effort',
];

/**
 * Retourne un message aléatoire depuis un tableau
 */
function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

export default function ModuleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { module, moduleIndex, chapterId, isFirstModuleAfterOnboarding } = route.params || {};

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { itemIndex: selectedOptionId }
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(!module);
  const [autoNavigateTimer, setAutoNavigateTimer] = useState(null);
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState({}); // { itemIndex: { shuffledOptions, correctId } }
  const [isCorrectingErrors, setIsCorrectingErrors] = useState(false); // Indique si on est en phase de correction
  const [wrongItemIndices, setWrongItemIndices] = useState([]); // Indices des questions ratées à reposer
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0); // Index dans wrongItemIndices pour la question actuelle en correction
  const [totalErrorsCount, setTotalErrorsCount] = useState(0); // Nombre total d'erreurs à corriger (dynamique)
  const [errorAttemptCount, setErrorAttemptCount] = useState(0); // Compteur de tentatives dans la phase correction (s'incrémente toujours)
  const [moduleStartTime, setModuleStartTime] = useState(null); // Temps de début du module pour tracking
  const [showQuitModal, setShowQuitModal] = useState(false);

  const showQuitButton = !isFirstModuleAfterOnboarding;

  // CRITICAL: Démarrer le tracking du temps quand le module commence
  useEffect(() => {
    if (module) {
      const startTime = Date.now();
      setModuleStartTime(startTime);
    }
  }, [module]);

  // CRITICAL: Nettoyer le timer quand on quitte l'écran
  useEffect(() => {
    return () => {
      if (autoNavigateTimer) {
        clearTimeout(autoNavigateTimer);
      }
    };
  }, [autoNavigateTimer]);

  useEffect(() => {
    if (!module) {
      // Si pas de module, retourner à l'accueil
      navigation.navigate('Main', { screen: 'Feed' });
    }
  }, [module, navigation]);

  if (!module || !module.items || module.items.length === 0) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7B2B" />
          <Text style={styles.loadingText}>Chargement du module...</Text>
        </View>
      </LinearGradient>
    );
  }

  const currentItem = module.items[currentItemIndex];
  const selectedAnswer = answers[currentItemIndex];
  const isLastItem = currentItemIndex === module.items.length - 1;
  const isFirstItem = currentItemIndex === 0;

  // Mélanger les options à chaque changement de question
  useEffect(() => {
    if (!currentItem || !currentItem.options) return;
    
    // Créer un tableau avec les options et leurs IDs originaux
    const optionsWithIds = currentItem.options.map((option, originalIndex) => ({
      text: option,
      originalIndex,
      id: `option_${originalIndex}`,
    }));
    
    // Mélanger les options
    const shuffled = shuffleArray(optionsWithIds);
    
    // Trouver l'ID de la bonne réponse après mélange
    const correctAnswerOriginalIndex = typeof currentItem.reponse_correcte === 'number' 
      ? currentItem.reponse_correcte 
      : currentItem.reponse_correcte === 'A' ? 0 
      : currentItem.reponse_correcte === 'B' ? 1 
      : 2;
    
    const correctOption = shuffled.find(opt => opt.originalIndex === correctAnswerOriginalIndex);
    const correctId = correctOption ? correctOption.id : shuffled[0].id;
    
    // Sauvegarder le mapping pour cette question
    setShuffledOptionsMap(prev => ({
      ...prev,
      [currentItemIndex]: {
        shuffledOptions: shuffled,
        correctId,
      },
    }));
    
    // Réinitialiser la réponse sélectionnée lors du changement de question
    if (answers[currentItemIndex] !== undefined) {
      // Garder la réponse si elle existe déjà
    } else {
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[currentItemIndex];
        return newAnswers;
      });
    }
    setShowExplanation(false);
  }, [currentItemIndex, currentItem]);

  // Fonction helper pour identifier les erreurs
  const identifyErrors = (allAnswers) => {
    const wrongIndices = [];
    module.items.forEach((item, index) => {
      const userAnswerId = allAnswers[index];
      if (userAnswerId) {
        const shuffledData = shuffledOptionsMap[index];
        if (shuffledData && userAnswerId !== shuffledData.correctId) {
          wrongIndices.push(index);
        }
      } else {
        // Question non répondue = considérée comme ratée
        wrongIndices.push(index);
      }
    });
    return wrongIndices;
  };

  const handleSelectAnswer = (optionId) => {
    // Annuler le timer précédent si existe
    if (autoNavigateTimer) {
      clearTimeout(autoNavigateTimer);
    }
    
    const newAnswers = { ...answers, [currentItemIndex]: optionId };
    setAnswers(newAnswers);
    setShowExplanation(true);
    
    // Navigation automatique après 2 secondes
    const timer = setTimeout(() => {
      if (isCorrectingErrors) {
        // MODE CORRECTION : Vérifier si toutes les erreurs sont corrigées
        const remainingErrors = identifyErrors(newAnswers);
        
        // Détecter si on a fait de nouvelles erreurs
        const previousErrorCount = wrongItemIndices.length;
        const currentRemainingCount = remainingErrors.length;
        const hasNewErrors = currentRemainingCount >= previousErrorCount;
        
        // Incrémenter le compteur de tentatives
        const newAttemptCount = errorAttemptCount + 1;
        setErrorAttemptCount(newAttemptCount);
        
        // Si on a fait de nouvelles erreurs, augmenter le total
        let newTotalErrorsCount = totalErrorsCount;
        if (hasNewErrors) {
          const additionalErrors = currentRemainingCount - previousErrorCount + 1;
          newTotalErrorsCount = totalErrorsCount + additionalErrors;
          setTotalErrorsCount(newTotalErrorsCount);
        }
        
        if (remainingErrors.length === 0) {
          // Toutes les erreurs sont corrigées → redirection vers récompense
          const score = calculateScore(newAnswers, module.items);
          const timeSpentMinutes = moduleStartTime 
            ? Math.max(1, Math.round((Date.now() - moduleStartTime) / 1000 / 60))
            : 1;
          navigation.replace('ModuleCompletion', {
            module,
            score,
            totalItems: module.items.length,
            answers: newAnswers,
            moduleIndex: typeof moduleIndex === 'number' ? moduleIndex : null,
            timeSpentMinutes,
          });
        } else {
          // Il reste des erreurs → passer à la suivante
          setWrongItemIndices(remainingErrors);
          const nextErrorIndex = currentErrorIndex < remainingErrors.length - 1 
            ? currentErrorIndex + 1 
            : 0;
          setCurrentErrorIndex(nextErrorIndex);
          setCurrentItemIndex(remainingErrors[nextErrorIndex]);
          setShowExplanation(false);
        }
      } else {
        // MODE NORMAL : Continuer normalement
        if (currentItemIndex < module.items.length - 1) {
          setCurrentItemIndex(prev => prev + 1);
          setShowExplanation(false);
        } else {
          // FIN DU MODULE : Identifier les erreurs
          const wrongIndices = identifyErrors(newAnswers);
          
          if (wrongIndices.length === 0) {
            // CAS A : 0 erreur → redirection immédiate vers récompense
            const score = calculateScore(newAnswers, module.items);
            const timeSpentMinutes = moduleStartTime 
              ? Math.max(1, Math.round((Date.now() - moduleStartTime) / 1000 / 60))
              : 1;
            navigation.replace('ModuleCompletion', {
              module,
              score,
              totalItems: module.items.length,
              answers: newAnswers,
              moduleIndex: typeof moduleIndex === 'number' ? moduleIndex : null,
              timeSpentMinutes,
            });
          } else {
            // CAS B : ≥1 erreur → passer en mode correction
            setWrongItemIndices(wrongIndices);
            setTotalErrorsCount(wrongIndices.length); // Stocker le nombre total d'erreurs initial
            setErrorAttemptCount(0); // Réinitialiser le compteur de tentatives
            setIsCorrectingErrors(true);
            setCurrentErrorIndex(0);
            setCurrentItemIndex(wrongIndices[0]);
            setShowExplanation(false);
          }
        }
      }
    }, 2000);
    
    setAutoNavigateTimer(timer);
  };
  
  // Nettoyer le timer au démontage
  useEffect(() => {
    return () => {
      if (autoNavigateTimer) {
        clearTimeout(autoNavigateTimer);
      }
    };
  }, [autoNavigateTimer]);

  const handleNext = () => {
    if (isLastItem) {
      // Calculer le score et naviguer vers l'écran de completion
      const score = calculateScore(answers, module.items);
      navigation.replace('ModuleCompletion', {
        module,
        score,
        totalItems: module.items.length,
        answers,
      });
    } else {
      setCurrentItemIndex(prev => prev + 1);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (!isFirstItem && !isCorrectingErrors) {
      setCurrentItemIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  };

  const calculateScore = (userAnswers, items) => {
    let correct = 0;
    items.forEach((item, index) => {
      const userAnswerId = userAnswers[index];
      const shuffledData = shuffledOptionsMap[index];
      
      if (!shuffledData) {
        return;
      }
      
      if (userAnswerId === shuffledData.correctId) {
        correct++;
      }
    });
    return { correct, total: items.length, percentage: Math.round((correct / items.length) * 100) };
  };

  const handleQuitConfirm = () => {
    setShowQuitModal(false);
    navigation.navigate('Main', { screen: 'Feed' });
  };

  const quitButtonAction = showQuitButton ? (
    <TouchableOpacity onPress={() => setShowQuitModal(true)} style={styles.quitButton} activeOpacity={0.8}>
      <Text style={styles.quitButtonText}>×</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Header leftAction={quitButtonAction} />
      <XPBar />

      <Modal visible={showQuitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalMessage}>Quitter le module ?</Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={styles.modalButtonContinue} onPress={() => setShowQuitModal(false)} activeOpacity={0.8}>
                <Text style={styles.modalButtonContinueText}>Continuer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonQuit} onPress={handleQuitConfirm} activeOpacity={0.8}>
                <Text style={styles.modalButtonQuitText}>Quitter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge "Ancienne erreur" si on est en mode correction */}
        {isCorrectingErrors && (
          <View style={styles.errorBadgeContainer}>
            <LinearGradient
              colors={['#FF7B2B', '#EC3912']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.errorBadge}
            >
              <Text style={styles.errorBadgeText}>Ancienne erreur</Text>
            </LinearGradient>
          </View>
        )}

        {/* Barre de progression avec AnimatedProgressBar */}
        <View style={styles.progressContainer}>
          <AnimatedProgressBar
            progress={
              isCorrectingErrors
                ? ((errorAttemptCount) / totalErrorsCount) * 100 // Mode correction : basé sur errorAttemptCount
                : ((currentItemIndex + 1) / module.items.length) * 100 // Mode normal : progression normale
            }
            colors={['#FF7B2B', '#FF852D', '#FFD93F']}
          />
          <Text style={styles.progressText}>
            {isCorrectingErrors 
              ? `${errorAttemptCount} / ${totalErrorsCount}` 
              : `${currentItemIndex + 1} / ${module.items.length}`}
          </Text>
        </View>

        {/* Titre du module */}
        <View style={styles.titleContainer}>
          <Text style={styles.moduleTitle}>{module.titre}</Text>
          <Text style={styles.objective}>{module.objectif}</Text>
        </View>

        {/* Item actuel */}
        <View style={styles.itemContainer}>
          <Text style={styles.itemQuestion}>{currentItem.question}</Text>

          {/* Options de réponse - mélangées */}
          {shuffledOptionsMap[currentItemIndex]?.shuffledOptions?.map((optionData) => {
            const optionId = optionData.id;
            const optionText = optionData.text;
            const isSelected = selectedAnswer === optionId;
            const shuffledData = shuffledOptionsMap[currentItemIndex];
            const isCorrect = shuffledData && shuffledData.correctId === optionId;
            const showResult = showExplanation;

            return (
              <TouchableOpacity
                key={optionId}
                style={[
                  styles.optionButton,
                  isSelected && !showResult && styles.optionButtonSelected,
                  showResult && isCorrect && isSelected && styles.optionButtonCorrect,
                  showResult && isSelected && !isCorrect && styles.optionButtonIncorrect,
                  showResult && !isSelected && styles.optionButtonDisabled,
                ]}
                onPress={() => !showExplanation && handleSelectAnswer(optionId)}
                disabled={showExplanation}
              >
                <Text style={[
                  styles.optionText,
                  isSelected && !showResult && styles.optionTextSelected,
                  showResult && isCorrect && isSelected && styles.optionTextCorrect,
                  showResult && isSelected && !isCorrect && styles.optionTextIncorrect,
                ]}>
                  {optionText}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Message court après sélection */}
          {showExplanation && (
            <View style={styles.messageContainer}>
              {(() => {
                const shuffledData = shuffledOptionsMap[currentItemIndex];
                const isCorrect = shuffledData && shuffledData.correctId === selectedAnswer;
                return (
                  <Text style={[
                    styles.messageText,
                    isCorrect ? styles.messageTextCorrect : styles.messageTextIncorrect
                  ]}>
                    {isCorrect ? getRandomMessage(POSITIVE_MESSAGES) : getRandomMessage(ENCOURAGEMENT_MESSAGES)}
                  </Text>
                );
              })()}
            </View>
          )}
        </View>

        {/* Bouton précédent uniquement (navigation automatique pour suivant) */}
        <View style={styles.navigationContainer}>
          {!isFirstItem && !isCorrectingErrors && (
            <TouchableOpacity
              style={styles.previousButton}
              onPress={handlePrevious}
            >
              <Text style={styles.previousButtonText}>← Précédent</Text>
            </TouchableOpacity>
          )}
        </View>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontFamily: theme.fonts.body,
  },
  errorBadgeContainer: {
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 16,
  },
  errorBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  errorBadgeText: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  progressContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: theme.fonts.body,
    textAlign: 'right',
    marginTop: 8,
  },
  titleContainer: {
    marginBottom: 32,
  },
  moduleTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  objective: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  itemContainer: {
    marginBottom: 32,
  },
  itemQuestion: {
    fontSize: 20,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    marginBottom: 24,
    lineHeight: 28,
    fontWeight: '600',
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: '#FF7B2B',
    backgroundColor: 'rgba(255, 123, 43, 0.2)',
  },
  optionButtonCorrect: {
    borderColor: 'transparent',
    backgroundColor: '#34C659',
  },
  optionButtonIncorrect: {
    borderColor: 'transparent',
    backgroundColor: '#EC3912',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  optionTextCorrect: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 18,
    fontFamily: theme.fonts.title,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  messageTextCorrect: {
    color: '#34C659',
  },
  messageTextIncorrect: {
    color: '#EC3912',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 24,
  },
  previousButton: {
    padding: 12,
  },
  previousButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  quitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2026',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  quitButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    lineHeight: 28,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#1A1B23',
    borderRadius: 24,
    padding: 32,
    width: '90%',
    maxWidth: 400,
  },
  modalMessage: {
    fontSize: 20,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
  },
  modalButtonsContainer: {
    gap: 16,
  },
  modalButtonContinue: {
    backgroundColor: '#00AAFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalButtonContinueText: {
    fontSize: 18,
    fontFamily: theme.fonts.button, // Nunito Black
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  modalButtonQuit: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalButtonQuitText: {
    fontSize: 18,
    fontFamily: theme.fonts.button, // Nunito Black
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
