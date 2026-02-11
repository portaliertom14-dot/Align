import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../styles/theme';

/**
 * Composant AnswerOption
 * Option de réponse avec numéro dégradé et fond bleu clair
 */
export default function AnswerOption({ 
  option, 
  number, 
  isSelected, 
  onPress 
}) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.containerSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Cercle avec numéro dégradé */}
      <LinearGradient
        colors={['#FF7B2B', '#FF852D', '#FFD93F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.numberCircle}
      >
        <Text style={styles.numberText}>{number}</Text>
      </LinearGradient>

      {/* Texte de l'option (label si format { label, value }, sinon chaîne) */}
      <Text style={styles.optionText}>{typeof option === 'object' && option?.label != null ? option.label : option}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    minHeight: 64,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  containerSelected: {
    borderColor: '#FFD93F',
    backgroundColor: 'rgba(255, 123, 43, 0.2)',
    shadowColor: '#FFD93F',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  numberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 22,
    textAlign: 'left',
  },
});













