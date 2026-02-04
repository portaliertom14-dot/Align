import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Container from '../../components/Container';
import Title from '../../components/Title';
import Card from '../../components/Card';
import StandardHeader from '../../components/StandardHeader';
import { theme } from '../../styles/theme';

/**
 * Écran Series Align
 * Visualisation des séries
 */
export default function SeriesScreen() {
  return (
    <Container>
      <StandardHeader title="ALIGN" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.sectionTitle}>
          <Title variant="h1">Series Align</Title>
        </View>
        
        <Card style={styles.card}>
          <Title variant="h2" style={styles.cardTitle}>Mes Séries</Title>
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
  sectionTitle: {
    marginBottom: theme.spacing.xl,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    marginBottom: theme.spacing.sm,
  },
});















