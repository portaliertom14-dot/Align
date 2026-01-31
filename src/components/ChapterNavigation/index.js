/**
 * Composant de navigation des chapitres
 * Affiche un rond central avec le chapitre actif
 * Menu déroulant pour naviguer entre chapitres
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllChapters, getUserChapterProgress } from '../../lib/chapters/chapterSystem';
import { theme } from '../../styles/theme';

export default function ChapterNavigation({ onChapterSelect, onModuleSelect }) {
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const allChapters = await getAllChapters();
      const progress = await getUserChapterProgress();
      
      setChapters(allChapters);
      
      // Trouver le chapitre actuel
      const current = allChapters.find(ch => ch.id === progress.currentChapterId) || allChapters[0];
      setCurrentChapter(current);
    } catch (error) {
      console.error('[ChapterNavigation] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChapterPress = (chapter) => {
    if (!chapter.isUnlocked) {
      // Afficher message : chapitre verrouillé
      // TODO: Afficher une alerte native si nécessaire
      console.log('[ChapterNavigation] Chapitre verrouillé:', chapter.index);
      return;
    }

    setCurrentChapter(chapter);
    setShowMenu(false);
    
    if (onChapterSelect) {
      onChapterSelect(chapter);
    }
  };

  if (loading || !currentChapter) {
    return (
      <View style={styles.container}>
        <View style={styles.circlePlaceholder}>
          <Text style={styles.placeholderText}>...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Rond central avec chapitre actif */}
      <TouchableOpacity
        style={styles.circleContainer}
        onPress={() => setShowMenu(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={theme.colors.gradient.buttonOrange}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.circle}
        >
          <Text style={styles.chapterNumber}>{currentChapter.index}</Text>
          <Text style={styles.chapterLabel}>CHAPITRE</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Bloc cliquable en dessous */}
      <TouchableOpacity
        style={styles.infoBlock}
        onPress={() => setShowMenu(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.infoTitle} numberOfLines={1}>
          {currentChapter.title.toUpperCase()}
        </Text>
        <Text style={styles.infoSubtitle} numberOfLines={2}>
          {currentChapter.description || 'Explorer ce chapitre'}
        </Text>
      </TouchableOpacity>

      {/* Menu déroulant modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SÉLECTIONNER UN CHAPITRE</Text>
              <TouchableOpacity
                onPress={() => setShowMenu(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.chaptersList}>
              {chapters.map((chapter) => (
                <TouchableOpacity
                  key={chapter.id}
                  style={[
                    styles.chapterItem,
                    chapter.id === currentChapter.id && styles.chapterItemActive,
                    !chapter.isUnlocked && styles.chapterItemLocked,
                  ]}
                  onPress={() => handleChapterPress(chapter)}
                  disabled={!chapter.isUnlocked}
                >
                  <View style={styles.chapterItemContent}>
                    <View style={styles.chapterItemLeft}>
                      <Text style={[
                        styles.chapterItemNumber,
                        !chapter.isUnlocked && styles.chapterItemNumberLocked,
                      ]}>
                        {chapter.index}
                      </Text>
                      <View style={styles.chapterItemText}>
                        <Text style={[
                          styles.chapterItemTitle,
                          !chapter.isUnlocked && styles.chapterItemTitleLocked,
                        ]}>
                          {chapter.title}
                        </Text>
                        {chapter.description && (
                          <Text style={[
                            styles.chapterItemDescription,
                            !chapter.isUnlocked && styles.chapterItemDescriptionLocked,
                          ]} numberOfLines={2}>
                            {chapter.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    {!chapter.isUnlocked && (
                      <Text style={styles.lockIcon}>🔒</Text>
                    )}
                    {chapter.id === currentChapter.id && (
                      <Text style={styles.activeIcon}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  circleContainer: {
    marginBottom: 16,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  chapterNumber: {
    fontSize: 48,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  chapterLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    letterSpacing: 1,
    marginTop: -8,
  },
  circlePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  infoBlock: {
    width: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1B23',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  chaptersList: {
    padding: 20,
  },
  chapterItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },
  chapterItemActive: {
    backgroundColor: 'rgba(255, 123, 43, 0.2)',
    borderWidth: 2,
    borderColor: '#FF7B2B',
  },
  chapterItemLocked: {
    opacity: 0.5,
  },
  chapterItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chapterItemNumber: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FF7B2B',
    marginRight: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  chapterItemNumberLocked: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  chapterItemText: {
    flex: 1,
  },
  chapterItemTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  chapterItemTitleLocked: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  chapterItemDescription: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
  chapterItemDescriptionLocked: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  lockIcon: {
    fontSize: 24,
    marginLeft: 12,
  },
  activeIcon: {
    fontSize: 24,
    color: '#34C759',
    marginLeft: 12,
  },
});
