import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Title from '../../Title';
import OptionButton from '../OptionButton';
import { theme } from '../../../styles/theme';

/**
 * Composant QuestionCard
 * Affiche une question avec ses options
 */
export default function QuestionCard({ 
  question, 
  selectedAnswer, 
  onSelectAnswer 
}) {
  return (
    <View style={styles.container}>
      <View style={styles.questionContainer}>
        <Title variant="h1" style={styles.title}>
          {question.texte}
        </Title>
      </View>

      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => (
          <OptionButton
            key={index}
            option={option}
            isSelected={selectedAnswer === option}
            onPress={() => onSelectAnswer(option)}
            index={index}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  questionContainer: {
    marginBottom: theme.spacing.xxl,
  },
  title: {
    color: theme.colors.primaryDark,
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});













