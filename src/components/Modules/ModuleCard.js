import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import Card from '../Card';
import Button from '../Button';
import HoverableTouchableOpacity from '../HoverableTouchableOpacity';

const starIcon = require('../../../assets/icons/star.png');
const xpIcon = require('../../../assets/icons/xp.png');

/**
 * Composant pour afficher et compléter un module
 */
export default function ModuleCard({ module, onComplete, onStart }) {
  const [answer, setAnswer] = useState('');
  const [isStarted, setIsStarted] = useState(module.status === 'in_progress');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = () => {
    setIsStarted(true);
    if (onStart) {
      onStart(module.id);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      return; // Ne pas soumettre si vide
    }

    setIsSubmitting(true);
    if (onComplete) {
      await onComplete(module.id, answer.trim());
    }
    setIsSubmitting(false);
  };

  return (
    <Card style={styles.moduleCard}>
      {/* En-tête du module */}
      <View style={styles.moduleHeader}>
        <Text style={styles.moduleTitle}>{module.titre || module.title}</Text>
        <View style={styles.moduleMeta}>
          <Text style={styles.moduleDuration}>⏱️ {module.durée_estimée || module.duration || 15} min</Text>
          <View style={styles.moduleRewardRow}>
            <Image source={starIcon} style={styles.moduleRewardIcon} resizeMode="contain" />
            <Text style={styles.moduleReward}> {module.reward?.étoiles || module.reward?.stars || 0} </Text>
            <Text style={styles.moduleReward}>•</Text>
            <Image source={xpIcon} style={styles.moduleRewardIcon} resizeMode="contain" />
            <Text style={styles.moduleReward}> {module.reward?.xp || 0} XP</Text>
          </View>
        </View>
      </View>

      {/* Objectif */}
      <View style={styles.objectiveContainer}>
        <Text style={styles.objectiveLabel}>Objectif</Text>
        <Text style={styles.objectiveText}>{module.objective}</Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsLabel}>Instructions</Text>
        <Text style={styles.instructionsText}>{module.instructions}</Text>
      </View>

      {/* Zone de réponse (si module démarré) */}
      {isStarted ? (
        <View style={styles.answerContainer}>
          <Text style={styles.answerLabel}>Ta réponse</Text>
          <Text style={styles.deliverableHint}>{module.deliverable}</Text>
          <TextInput
            style={styles.answerInput}
            multiline
            numberOfLines={8}
            placeholder="Développe ta réponse ici..."
            placeholderTextColor="rgba(0, 0, 0, 0.4)"
            value={answer}
            onChangeText={setAnswer}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
          
          <HoverableTouchableOpacity
            onPress={handleSubmit}
            disabled={!answer.trim() || isSubmitting}
            style={[
              styles.submitButton,
              (!answer.trim() || isSubmitting) && styles.submitButtonDisabled,
            ]}
            variant="button"
          >
            <LinearGradient
              colors={theme.colors.gradient.buttonOrange}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Validation...' : 'Soumettre ma réponse'}
              </Text>
            </LinearGradient>
          </HoverableTouchableOpacity>
        </View>
      ) : (
        <HoverableTouchableOpacity onPress={handleStart} style={styles.startButton} variant="button">
          <LinearGradient
            colors={theme.colors.gradient.buttonOrange}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            <Text style={styles.startButtonText}>Commencer ce module</Text>
          </LinearGradient>
        </HoverableTouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  moduleCard: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  moduleHeader: {
    marginBottom: 20,
  },
  moduleTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.title,
    color: '#000000',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  moduleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleDuration: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#666666',
  },
  moduleRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moduleRewardIcon: {
    width: 18,
    height: 18,
  },
  moduleReward: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  objectiveContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  objectiveLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  objectiveText: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#000000',
    lineHeight: 24,
  },
  instructionsContainer: {
    marginBottom: 24,
  },
  instructionsLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 15,
    fontFamily: theme.fonts.body,
    color: '#333333',
    lineHeight: 22,
  },
  answerContainer: {
    marginTop: 8,
  },
  answerLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#000000',
    marginBottom: 8,
    fontWeight: '600',
  },
  deliverableHint: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 20,
  },
  answerInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: theme.fonts.body,
    color: '#000000',
    minHeight: 150,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  submitButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  startButton: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  startButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});







