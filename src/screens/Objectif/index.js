import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Container from '../../components/Container';
import Title from '../../components/Title';
import Card from '../../components/Card';
import { theme } from '../../styles/theme';

/**
 * Écran Objectif Align
 * Gestion des objectifs utilisateur
 */
export default function ObjectifScreen() {
  return (
    <Container>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Title variant="h1">Objectif Align</Title>
        </View>
        
        <Card style={styles.card}>
          <Title variant="h2" style={styles.cardTitle}>Mes Objectifs</Title>
        </Card>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 100, // Espace pour la navbar
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    marginBottom: theme.spacing.sm,
  },
});















