/**
 * Écran d'affinage variant Droit : 5 questions fixes pour choisir entre
 * "droit pur" (default) et "Défense & Sécurité civile" (defense_track).
 * Affiché uniquement quand top1 = droit_justice_securite et top2 = defense_securite_civile.
 * À la fin : navigation vers QuizMetier avec variantOverride.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { computeDroitVariantFromRefinement } from '../../domain/refineDroitTrack';

/** 5 questions fixes : { id, question, optionA, optionB, optionC (optionnel) } */
const REFINE_QUESTIONS = [
  {
    id: 'refine_1',
    question: 'Tu préfères travailler surtout sur…',
    optionA: 'Textes, procédures, arguments',
    optionB: 'Interventions terrain, sécurité, urgence',
    optionC: 'Ça dépend',
  },
  {
    id: 'refine_2',
    question: 'Ton quotidien idéal ressemble plus à…',
    optionA: 'Analyser des dossiers, préparer des décisions, conseiller juridiquement',
    optionB: 'Patrouiller, protéger, intervenir, gérer une crise',
    optionC: 'Ça dépend',
  },
  {
    id: 'refine_3',
    question: 'Ce qui te motive le plus…',
    optionA: 'Faire respecter la règle / la justice',
    optionB: 'Protéger concrètement des personnes sur le terrain',
    optionC: 'Ça dépend',
  },
  {
    id: 'refine_4',
    question: 'Tu te vois davantage…',
    optionA: 'En cabinet / tribunal / conformité / administration',
    optionB: 'En uniforme / caserne / unité / protection civile',
    optionC: 'Ça dépend',
  },
  {
    id: 'refine_5',
    question: 'Tu acceptes…',
    optionA: 'Faible risque physique, forte rigueur procédurale',
    optionB: 'Plus de risque/urgence, décisions rapides',
    optionC: 'Ça dépend',
  },
];

export default function RefineDroitTrackScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const sectorId = route.params?.sectorId ?? '';
  const sectorRanked = Array.isArray(route.params?.sectorRanked) ? route.params.sectorRanked : [];

  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = REFINE_QUESTIONS[currentIndex];
  const selectedValue = answers[currentQuestion?.id];
  const isLast = currentIndex === REFINE_QUESTIONS.length - 1;
  const canNext = selectedValue != null && (selectedValue === 'A' || selectedValue === 'B' || selectedValue === 'C');

  const handleSelect = (value) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (!canNext) return;
    if (isLast) {
      const allAnswers = { ...answers, [currentQuestion.id]: selectedValue };
      const variantOverride = computeDroitVariantFromRefinement(allAnswers);
      navigation.replace('QuizMetier', { sectorId, sectorRanked, variantOverride });
      return;
    }
    setCurrentIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      navigation.goBack();
    }
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Math.min(32, width * 0.04) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepText}>
          {currentIndex + 1} / {REFINE_QUESTIONS.length}
        </Text>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        <View style={styles.options}>
          <HoverableTouchableOpacity
            style={[styles.optionCard, selectedValue === 'A' && styles.optionCardSelected]}
            onPress={() => handleSelect('A')}
            activeOpacity={0.85}
            variant="button"
          >
            <Text style={styles.optionLabel}>A</Text>
            <Text style={styles.optionText}>{currentQuestion.optionA}</Text>
          </HoverableTouchableOpacity>

          <HoverableTouchableOpacity
            style={[styles.optionCard, selectedValue === 'B' && styles.optionCardSelected]}
            onPress={() => handleSelect('B')}
            activeOpacity={0.85}
            variant="button"
          >
            <Text style={styles.optionLabel}>B</Text>
            <Text style={styles.optionText}>{currentQuestion.optionB}</Text>
          </HoverableTouchableOpacity>

          <HoverableTouchableOpacity
            style={[styles.optionCard, styles.optionCardSmall, selectedValue === 'C' && styles.optionCardSelected]}
            onPress={() => handleSelect('C')}
            activeOpacity={0.85}
            variant="button"
          >
            <Text style={styles.optionText}>{currentQuestion.optionC}</Text>
          </HoverableTouchableOpacity>
        </View>

        <HoverableTouchableOpacity
          style={[styles.nextButton, !canNext && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canNext}
          activeOpacity={0.85}
          variant="button"
        >
          <LinearGradient
            colors={canNext ? ['#FF6000', '#FFC005'] : ['#4A4D5A', '#4A4D5A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <Text style={[styles.nextButtonText, !canNext && styles.nextButtonTextDisabled]}>
              {isLast ? "C'EST PARTI !" : 'Suivant'}
            </Text>
          </LinearGradient>
        </HoverableTouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    zIndex: 10,
    padding: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 100,
    paddingBottom: 48,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  stepText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  questionText: {
    fontFamily: theme.fonts.title,
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 28,
  },
  options: {
    gap: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3241',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSmall: {
    paddingVertical: 14,
  },
  optionCardSelected: {
    borderColor: '#FF7B2B',
  },
  optionLabel: {
    fontFamily: theme.fonts.button,
    fontSize: 16,
    color: '#FF7B2B',
    width: 28,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  nextButton: {
    marginTop: 32,
    borderRadius: 999,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontFamily: theme.fonts.button,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  nextButtonTextDisabled: {
    color: 'rgba(255,255,255,0.7)',
  },
});
