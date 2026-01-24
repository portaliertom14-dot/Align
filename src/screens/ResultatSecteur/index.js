import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useQuiz } from '../../context/QuizContext';
import { calculateSectorFromAnswers } from '../../lib/sectorAlgorithm';
import { questions } from '../../data/questions';
import { setActiveDirection, updateUserProgress } from '../../lib/userProgress';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { theme } from '../../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Assets
const starIcon = require('../../../assets/icons/star.png');
const compassIcon = require('../../../assets/images/modules/compass.png');

/**
 * Écran Résultat Secteur - Design identique à PropositionMetier
 * Affiche le secteur dominant avec la même esthétique "RÉSULTAT DÉBLOQUÉ"
 */
export default function ResultatSecteurScreen() {
  const navigation = useNavigation();
  const { answers } = useQuiz();
  const [sectorResult, setSectorResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateSector = async () => {
      try {
        await updateUserProgress({ quizAnswers: answers });
        const result = await calculateSectorFromAnswers(answers, questions);
        setSectorResult(result);
        await setActiveDirection(result.secteurId || result.secteurName);
      } catch (error) {
        console.error('Erreur lors du calcul du secteur:', error);
        alert(`Erreur lors du calcul du secteur: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (answers && Object.keys(answers).length > 0) {
      calculateSector();
    } else {
      setLoading(false);
    }
  }, [answers]);

  const handleRegenerateSector = async () => {
    try {
      setLoading(true);
      
      const secteurs = [
        { id: 'tech', name: 'Tech', description: 'Tu aimes résoudre des problèmes complexes et créer des solutions technologiques innovantes.' },
        { id: 'business', name: 'Business', description: 'Tu as un esprit entrepreneurial et tu aimes créer de la valeur dans le monde des affaires.' },
        { id: 'creation', name: 'Création', description: 'Tu as un esprit créatif et tu aimes exprimer tes idées à travers l\'art et le design.' },
        { id: 'droit', name: 'Droit', description: 'Tu as un esprit analytique et tu aimes défendre la justice et les droits.' },
        { id: 'sante', name: 'Santé', description: 'Tu as un esprit empathique et tu aimes aider les autres et améliorer leur bien-être.' },
      ];
      
      const currentSecteurId = sectorResult?.secteurId;
      const availableSecteurs = secteurs.filter(s => s.id !== currentSecteurId);
      const randomSecteur = availableSecteurs[Math.floor(Math.random() * availableSecteurs.length)] || secteurs[0];
      
      await setActiveDirection(randomSecteur.id);
      
      const result = {
        secteurId: randomSecteur.id,
        secteurName: randomSecteur.name,
        justification: randomSecteur.description,
        confiance: 0.75 + Math.random() * 0.2,
      };
      
      setSectorResult(result);
    } catch (error) {
      console.error('Erreur lors de la régénération:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !sectorResult) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Calcul de ton secteur...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Titre ALIGN blanc en haut */}
        <Text style={styles.alignTitle}>ALIGN</Text>

        {/* Image étoile dorée */}
        <View style={styles.starContainer}>
          <Image source={starIcon} style={styles.starImage} resizeMode="contain" />
        </View>

        {/* Badge RÉSULTAT DÉBLOQUÉ */}
        <View style={styles.badgeContainer}>
          <LinearGradient
            colors={['#FFD93F', '#FF7B2B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>RÉSULTAT DÉBLOQUÉ</Text>
          </LinearGradient>
        </View>

        {/* Card avec le secteur */}
        <View style={styles.sectorCard}>
          <Text style={styles.cardTitle}>TON SECTEUR RECOMMANDÉ</Text>
          
          <View style={styles.sectorHeader}>
            <Text style={styles.sectorIconEmoji}>🧭</Text>
          </View>

          <Text style={styles.sectorName}>
            {sectorResult.secteurName ? 
              sectorResult.secteurName.toUpperCase() 
              : 'TECH'}
          </Text>

          <Text style={styles.description}>
            {sectorResult.justification || sectorResult.explanation || 'Tu aimes résoudre des problèmes, comprendre comment les choses fonctionnent et créer des solutions concrètes grâce à la technologie.'}
          </Text>

          <View style={styles.separator} />

          {/* Bouton CONTINUER */}
          <HoverableTouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.replace('QuizMetier')}
            variant="button"
          >
            <Text style={styles.continueButtonText}>CONTINUER</Text>
          </HoverableTouchableOpacity>

          {/* Bouton RÉGÉNÉRER */}
          <HoverableTouchableOpacity
            style={styles.regenerateButton}
            onPress={handleRegenerateSector}
            variant="button"
          >
            <Text style={styles.regenerateButtonText}>RÉGÉNÉRER</Text>
          </HoverableTouchableOpacity>
        </View>
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
    minHeight: SCREEN_HEIGHT - 60, // Réduit de 60px pour remonter le bord inférieur
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center', // Centre verticalement tout le contenu
    paddingBottom: 20, // Padding réduit en bas
  },
  alignTitle: {
    fontSize: 42,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 3,
    fontWeight: '900',
    position: 'absolute', // Position absolue pour le fixer en haut
    top: 60, // Même position que le header sur les autres écrans (paddingTop: 60)
    left: 0,
    right: 0,
    zIndex: 20, // Au-dessus de tous les autres éléments
  },
  starContainer: {
    marginBottom: -120, // Chevauchement pour cacher la moitié inférieure de l'étoile (240px/2 = 120px)
    marginTop: 0, // Pas de décalage vertical, centré par justifyContent
    alignItems: 'center',
    zIndex: 0, // Dernier plan (le plus bas)
  },
  starImage: {
    width: 240,
    height: 240,
  },
  badgeContainer: {
    marginBottom: -25, // Superposition sur la carte
    zIndex: 10, // Augmenté pour passer devant l'étoile
  },
  badge: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: '#FFD93F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 18,
    fontFamily: theme.fonts.button, // Nunito Black
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectorCard: {
    backgroundColor: '#373D4B', // Couleur de fond demandée
    borderRadius: 32,
    padding: 48,
    paddingTop: 35, // Réduit de 25px (60 - 25 = 35) pour compenser la réduction verticale
    paddingBottom: 35, // Maintenu pour la cohérence
    marginBottom: 75, // Remonter le bord inférieur de 75px
    width: SCREEN_WIDTH * 0.7 + 200, // Largeur augmentée de 200px
    maxWidth: 1200, // MaxWidth augmenté de 200px (1000 + 200)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 20, // Augmenté légèrement
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  sectorHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectorIconImage: {
    width: 100,
    height: 100,
  },
  sectorIconEmoji: {
    fontSize: 65, // Taille réduite de 55px (120 - 55 = 65)
    textAlign: 'center',
  },
  sectorName: {
    fontSize: 32,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 40,
  },
  separator: {
    height: 2,
    backgroundColor: '#8E8E8E', // Couleur grise
    marginVertical: 32,
    width: '60%',
    alignSelf: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 28,
    fontFamily: theme.fonts.body,
    textAlign: 'center',
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: '#FF782D',
    borderRadius: 999,
    paddingVertical: 16, // Même padding que le badge
    paddingHorizontal: 150, // Augmenté de 75px (75 + 75 = 150)
    alignItems: 'center',
    alignSelf: 'center', // Centré horizontalement
    marginBottom: 20,
    shadowColor: '#FF782D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  regenerateButton: {
    backgroundColor: '#2895F3',
    borderRadius: 999,
    paddingVertical: 16, // Même padding que le badge
    paddingHorizontal: 150, // Augmenté de 75px (75 + 75 = 150)
    alignItems: 'center',
    alignSelf: 'center', // Centré horizontalement
    shadowColor: '#2895F3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  regenerateButtonText: {
    fontSize: 18,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
