/**
 * Écran affichant les 3 modules d'un chapitre
 * Permet de sélectionner et démarrer un module
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import { theme } from '../../styles/theme';
import { 
  getModulesByChapter, 
  getModuleUnlockStatus,
} from '../../lib/chapters/chapterSystem';
import { guardModuleAccess } from '../../lib/chapters/chapterGuards';
import { generatePersonalizedModule } from '../../lib/questionGenerator';
import { getUserProgress } from '../../lib/userProgressSupabase';
import { fetchDynamicModules, buildModuleFromDynamicPayload } from '../../services/dynamicModules';

export default function ChapterModulesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { chapter } = route.params || {};
  
  const [modules, setModules] = useState([]);
  const [unlockStatus, setUnlockStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [startingModule, setStartingModule] = useState(null);

  useEffect(() => {
    if (chapter) {
      loadModules();
    }
  }, [chapter]);

  const loadModules = async () => {
    try {
      setLoading(true);
      
      const modulesData = await getModulesByChapter(chapter.id);
      const status = await getModuleUnlockStatus(chapter.id);
      
      setModules(modulesData);
      
      // Créer un map pour accès rapide
      const statusMap = {};
      status.forEach(s => {
        statusMap[s.order] = s;
      });
      setUnlockStatus(statusMap);
    } catch (error) {
      console.error('[ChapterModules] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = async (module) => {
    try {
      // Vérifier l'accès
      const canAccess = await guardModuleAccess(navigation, chapter.id, module.order);
      if (!canAccess) {
        return;
      }

      setStartingModule(module.order);

      const progress = await getUserProgress();
      const secteurId = progress.activeDirection || 'tech';
      const metierId = progress.activeMetier || null;

      let personalizedModule = null;
      // Modules dynamiques (simulation + test secteur) : essayer le cache IA d’abord (dépend du profil personaCluster)
      if (module.order === 2 || module.order === 3) {
        const dynamic = await fetchDynamicModules(
          secteurId,
          metierId || '',
          'v1',
          progress.personaCluster
        );
        personalizedModule = buildModuleFromDynamicPayload(
          dynamic,
          chapter.index,
          module.order,
          { title: chapter.title }
        );
      }
      if (!personalizedModule) {
        personalizedModule = await generatePersonalizedModule(
          chapter.index,
          module.order - 1,
          secteurId,
          metierId,
          true
        );
      }

      navigation.navigate('Module', {
        module: personalizedModule,
        chapterId: chapter.id,
        moduleIndex: module.order - 1,
      });
    } catch (error) {
      console.error('[ChapterModules] Erreur démarrage module:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setStartingModule(null);
    }
  };

  const getModuleTypeLabel = (type) => {
    const labels = {
      'apprentissage': 'APPRENTISSAGE',
      'test_secteur': 'TEST SECTEUR',
      'mini_simulation': 'SIMULATION',
    };
    return labels[type] || type.toUpperCase();
  };

  const getModuleIcon = (type) => {
    const icons = {
      'apprentissage': '📚',
      'test_secteur': '🧭',
      'mini_simulation': '💼',
    };
    return icons[type] || '📖';
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        style={styles.container}
      >
        <Header />
        <XPBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7B2B" />
          <Text style={styles.loadingText}>Chargement des modules...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      style={styles.container}
    >
      <Header />
      <XPBar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Titre du chapitre */}
        <View style={styles.header}>
          <Text style={styles.chapterTitle}>CHAPITRE {chapter.index}</Text>
          <Text style={styles.chapterSubtitle}>{chapter.title}</Text>
        </View>

        {/* Liste des modules */}
        <View style={styles.modulesContainer}>
          {modules.map((module) => {
            const status = unlockStatus[module.order] || {};
            const isLocked = !status.isAccessible;
            const isCompleted = status.isCompleted;
            const isLoading = startingModule === module.order;

            return (
              <TouchableOpacity
                key={module.id}
                style={[
                  styles.moduleCard,
                  isLocked && styles.moduleCardLocked,
                  isCompleted && styles.moduleCardCompleted,
                ]}
                onPress={() => handleStartModule(module)}
                disabled={isLocked || isLoading}
                activeOpacity={0.8}
              >
                <View style={styles.moduleHeader}>
                  <Text style={styles.moduleIcon}>
                    {getModuleIcon(module.type)}
                  </Text>
                  <View style={styles.moduleInfo}>
                    <Text style={[
                      styles.moduleNumber,
                      isLocked && styles.moduleNumberLocked,
                    ]}>
                      MODULE {module.order}
                    </Text>
                    <Text style={[
                      styles.moduleType,
                      isLocked && styles.moduleTypeLocked,
                    ]}>
                      {getModuleTypeLabel(module.type)}
                    </Text>
                  </View>
                  {isLocked && (
                    <Text style={styles.lockIcon}>🔒</Text>
                  )}
                  {isCompleted && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                  {isLoading && (
                    <ActivityIndicator size="small" color="#FF7B2B" />
                  )}
                </View>

                {!isLocked && (
                  <Text style={styles.moduleDescription}>
                    {module.order === 1 && 'Apprends les bases de ce chapitre'}
                    {module.order === 2 && 'Teste tes connaissances'}
                    {module.order === 3 && 'Mets en pratique tes compétences'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
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
    padding: 24,
    paddingBottom: 100,
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  chapterTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 2,
  },
  chapterSubtitle: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  modulesContainer: {
    gap: 16,
  },
  moduleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 123, 43, 0.3)',
  },
  moduleCardLocked: {
    opacity: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  moduleCardCompleted: {
    borderColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleNumber: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FF7B2B',
    marginBottom: 4,
  },
  moduleNumberLocked: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  moduleType: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
  },
  moduleTypeLocked: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  lockIcon: {
    fontSize: 24,
    marginLeft: 12,
  },
  checkIcon: {
    fontSize: 24,
    color: '#34C759',
    marginLeft: 12,
  },
  moduleDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },
});
