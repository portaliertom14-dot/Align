import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Title from '../Title';
import { theme } from '../../styles/theme';

/**
 * Composant OnboardingSlide
 * Écran individuel de l'onboarding avec gradient
 */
export default function OnboardingSlide({ 
  title, 
  subtitle, 
  description,
  icon 
}) {
  return (
    <LinearGradient
      colors={theme.colors.gradient.align}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {icon && (
          <View style={styles.iconContainer}>
            {icon}
          </View>
        )}
        
        <View style={styles.textContainer}>
          <Title variant="h1" style={styles.title}>
            {title}
          </Title>
          
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
          
          {description && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    maxWidth: 320,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontSize: 36,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    opacity: 0.95,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    marginTop: theme.spacing.sm,
  },
});

