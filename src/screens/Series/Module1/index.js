import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getModulesForLevel, startModule, submitModuleAnswer, completeModule, generateNewModulesIfNeeded } from '../../../lib/modules/modules';
import { validateAnswerDetailed } from '../../../lib/modules/moduleValidation';
import { getUserProgress, getActiveDirection } from '../../../lib/userProgress';
import { canAccessSerieLevel, redirectToAppropriateScreen } from '../../../lib/navigationGuards';
import { completeLevel } from '../../../lib/userProgress';
import ModuleCard from '../../../components/Modules/ModuleCard';
import Header from '../../../components/Header';
import { theme } from '../../../styles/theme';

/**
 * Module 1 - Vrais modules personnalisés par ALINE
 * 3 modules adaptés au profil utilisateur
 */
export default function SeriesModule1Screen() {
  const navigation = useNavigation();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [secteur, setSecteur] = useState(null);

  useEffect(() => {
    checkAccess();
    loadModules();
  }, []);

  const checkAccess = async () => {
    const canAccess = await canAccessSerieLevel(1);
    if (!canAccess) {
      await redirectToAppropriateScreen(navigation);
    }
  };

  const loadModules = async () => {
    try {
      setLoading(true);
      const progress = await getUserProgress();
      // Récupérer le secteur déterminé par way
      const activeDirection = progress.activeDirection || await getActiveDirection();
      setSecteur(activeDirection);

      // Récupérer les modules pour le niveau 1
      let levelModules = await getModulesForLevel(1);

      // Si aucun module, en générer
      if (levelModules.length === 0) {
        await generateNewModulesIfNeeded(1);
        levelModules = await getModulesForLevel(1);
      }

      setModules(levelModules);
    } catch (error) {
      console.error('Erreur lors du chargement des modules:', error);
      Alert.alert('Erreur', 'Impossible de charger les modules. Réessaie plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = async (moduleId) => {
    try {
      await startModule(moduleId);
      // Recharger les modules pour mettre à jour le statut
      await loadModules();
    } catch (error) {
      console.error('Erreur lors du démarrage du module:', error);
    }
  };

  const handleCompleteModule = async (moduleId, answer) => {
    try {
      // Valider la réponse avec way (IA)
      const module = modules.find(m => m.id === moduleId);
      if (!module) return;

      const validation = await validateAnswerDetailed(answer, module, secteur);

      // Afficher le feedback
      Alert.alert(
        validation.isValid ? '✅ Réponse validée !' : '⚠️ Réponse incomplète',
        validation.feedback,
        [
          {
            text: 'OK',
            onPress: async () => {
              // Marquer le module comme complété
              await completeModule(moduleId, validation);

              // Recharger les modules
              await loadModules();

              // Si tous les modules sont complétés, débloquer le niveau suivant
              const updatedModules = await getModulesForLevel(1);
              const allCompleted = updatedModules.length === 0 || updatedModules.every(m => m.status === 'completed');

              if (allCompleted) {
                Alert.alert(
                  '🎉 Niveau 1 terminé !',
                  'Bravo ! Tu as complété tous les modules du niveau 1. Tu débloques le niveau 2 !',
                  [
                    {
                      text: 'Continuer',
                      onPress: async () => {
                        await completeLevel(1);
                        navigation.replace('SeriesModule2');
                      },
                    },
                  ]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la complétion du module:', error);
      Alert.alert('Erreur', 'Impossible de valider ta réponse. Réessaie.');
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={theme.colors.gradient.align}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des modules...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (modules.length === 0) {
    return (
      <LinearGradient
        colors={theme.colors.gradient.align}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <Header />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun module disponible pour le moment.</Text>
          <Text style={styles.emptySubtext}>Génération de nouveaux modules...</Text>
        </View>
      </LinearGradient>
    );
  }

  const completedCount = modules.filter(m => m.status === 'completed').length;
  const totalCount = modules.length;

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
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.levelTitle}>NIVEAU 1</Text>
          <Text style={styles.levelSubtitle}>Découverte</Text>
          <Text style={styles.progressText}>
            {completedCount} / {totalCount} modules complétés
          </Text>
        </View>

        {/* Liste des modules */}
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            onStart={handleStartModule}
            onComplete={handleCompleteModule}
          />
        ))}
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
    fontFamily: theme.fonts.body,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  levelTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  levelSubtitle: {
    fontSize: 18,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
