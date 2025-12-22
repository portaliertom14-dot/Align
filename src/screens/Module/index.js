/**
 * Écran Module - Affiche un module avec ses items (10-15 items)
 * Format simple et rapide, style Duolingo premium
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../components/Header';
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

export default function ModuleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { module } = route.params || {};
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Module/index.js:13',message:'ModuleScreen ENTRY',data:{hasModule:!!module,moduleType:module?.type,moduleTitre:module?.titre,moduleSecteur:module?.secteur,moduleMetier:module?.métier,itemsCount:module?.items?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { itemIndex: selectedOptionId }
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(!module);
  const [autoNavigateTimer, setAutoNavigateTimer] = useState(null);
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState({}); // { itemIndex: { shuffledOptions, correctId } }

  useEffect(() => {
    if (!module) {
      // Si pas de module, retourner à l'accueil
      navigation.navigate('Main', { screen: 'Feed' });
    }
  }, [module, navigation]);

  if (!module || !module.items || module.items.length === 0) {
    return (
      <LinearGradient
        colors={theme.colors.gradient.align}
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

  const handleSelectAnswer = (optionId) => {
    // Annuler le timer précédent si existe
    if (autoNavigateTimer) {
      clearTimeout(autoNavigateTimer);
    }
    
    setAnswers(prev => ({ ...prev, [currentItemIndex]: optionId }));
    setShowExplanation(true);
    
    // Navigation automatique après 2 secondes
    const timer = setTimeout(() => {
      const finalAnswers = { ...answers, [currentItemIndex]: optionId };
      if (currentItemIndex < module.items.length - 1) {
        setCurrentItemIndex(prev => prev + 1);
        setShowExplanation(false);
      } else {
        // Dernier item : aller à la completion
        const score = calculateScore(finalAnswers, module.items);
        navigation.replace('ModuleCompletion', {
          module,
          score,
          totalItems: module.items.length,
          answers: finalAnswers,
        });
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
    if (!isFirstItem) {
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
        // Fallback si pas de données mélangées
        return;
      }
      
      // Vérifier si la réponse sélectionnée correspond à la bonne réponse (par ID)
      if (userAnswerId === shuffledData.correctId) {
        correct++;
      }
    });
    return { correct, total: items.length, percentage: Math.round((correct / items.length) * 100) };
  };

  return (
    <LinearGradient
      colors={theme.colors.gradient.align}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Header />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Barre de progression */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentItemIndex + 1) / module.items.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentItemIndex + 1} / {module.items.length}
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
                  isSelected && styles.optionButtonSelected,
                  showResult && isCorrect && styles.optionButtonCorrect,
                  showResult && isSelected && !isCorrect && styles.optionButtonIncorrect,
                  showResult && !isSelected && !isCorrect && styles.optionButtonDisabled,
                ]}
                onPress={() => !showExplanation && handleSelectAnswer(optionId)}
                disabled={showExplanation}
              >
                <Text style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                  showResult && isCorrect && styles.optionTextCorrect,
                ]}>
                  {optionText}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Explication (affichée après sélection) */}
          {showExplanation && currentItem.explication && (
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationLabel}>✓</Text>
              <Text style={styles.explanationText}>{currentItem.explication}</Text>
            </View>
          )}
        </View>

        {/* Bouton précédent uniquement (navigation automatique pour suivant) */}
        <View style={styles.navigationContainer}>
          {!isFirstItem && (
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
  progressContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF7B2B',
    borderRadius: 3,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: theme.fonts.body,
    textAlign: 'right',
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
    borderRadius: 16,
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
    borderColor: '#34C659',
    backgroundColor: 'rgba(52, 198, 89, 0.2)',
  },
  optionButtonIncorrect: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
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
    color: '#34C659',
    fontWeight: '600',
  },
  explanationContainer: {
    backgroundColor: 'rgba(52, 198, 89, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34C659',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  explanationLabel: {
    fontSize: 20,
    color: '#34C659',
    marginRight: 12,
    fontFamily: theme.fonts.body,
  },
  explanationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    lineHeight: 20,
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
});



