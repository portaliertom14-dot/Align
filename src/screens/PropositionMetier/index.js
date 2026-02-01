import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useMetierQuiz } from '../../context/MetierQuizContext';
import { calculateMetierFromAnswers } from '../../lib/metierAlgorithm';
import { wayProposeMetiers } from '../../services/wayMock';
import { quizMetierQuestions } from '../../data/quizMetierQuestions';
import { getUserProgress, setActiveMetier, updateUserProgress } from '../../lib/userProgress';
import { upsertUser } from '../../services/userService';
import { getCurrentUser } from '../../services/auth';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from '../Onboarding/onboardingConstants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();

// Assets
const starIcon = require('../../../assets/icons/star.png');
const briefcaseIcon = require('../../../assets/images/modules/briefcase.png');

/**
 * Écran Proposition Métier - Résultat débloqué
 * Affiche le métier proposé avec badge et description
 * Design basé sur l'image de référence
 */
export default function PropositionMetierScreen() {
  const navigation = useNavigation();
  const { answers } = useMetierQuiz();
  const [metierResult, setMetierResult] = useState(null);
  const [secteurId, setSecteurId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateMetier = async () => {
      try {
        const progress = await getUserProgress();
        const activeSecteurId = progress.activeSerie || progress.activeDirection || 'tech';
        setSecteurId(activeSecteurId);

        const result = await calculateMetierFromAnswers(answers, quizMetierQuestions, activeSecteurId);
        setMetierResult(result);
        
        if (result.metierId) {
          await setActiveMetier(result.metierId);
          await updateUserProgress({ activeDirection: activeSecteurId });
        }
      } catch (error) {
        console.error('Erreur lors du calcul du métier:', error);
        alert(`Erreur lors du calcul du métier: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (answers && Object.keys(answers).length > 0) {
      calculateMetier();
    } else {
      setLoading(false);
    }
  }, [answers]);

  const handleRegenerateMetier = async () => {
    try {
      setLoading(true);
      const progress = await getUserProgress();
      const activeSecteurId = progress.activeDirection || secteurId || 'tech';
      
      const metiersParSecteur = {
        tech: [
          { id: 'developpeur', nom: 'Développeur logiciel', justification: 'Tu as un profil technique et créatif, parfait pour le développement.' },
          { id: 'data_scientist', nom: 'Data Scientist', justification: 'Ton profil analytique correspond bien à la science des données.' },
        ],
        business: [
          { id: 'entrepreneur', nom: 'Entrepreneur', justification: 'Ton profil dynamique et autonome correspond à l\'entrepreneuriat.' },
        ],
        creation: [
          { id: 'designer', nom: 'Designer', justification: 'Ton profil créatif correspond parfaitement au design.' },
        ],
        droit: [
          { id: 'avocat', nom: 'Avocat', justification: 'Ton profil structuré et argumentatif correspond au métier d\'avocat.' },
        ],
        sante: [
          { id: 'medecin', nom: 'Médecin', justification: 'Ton profil empathique et rigoureux correspond à la médecine.' },
        ],
      };
      
      const metiersDisponibles = metiersParSecteur[activeSecteurId] || metiersParSecteur.tech;
      const currentMetierId = metierResult?.metierId;
      const availableMetiers = metiersDisponibles.filter(m => m.id !== currentMetierId);
      const randomMetier = availableMetiers[Math.floor(Math.random() * availableMetiers.length)] || metiersDisponibles[0];
      
      const result = {
        metierId: randomMetier.id,
        metierName: randomMetier.nom,
        description: `${randomMetier.nom} dans le secteur ${activeSecteurId}`,
        why: randomMetier.justification,
        secteurId: activeSecteurId,
      };
      
      setMetierResult(result);
      
      if (result.metierId) {
        await setActiveMetier(result.metierId);
        await updateUserProgress({ activeDirection: activeSecteurId });
      }
    } catch (error) {
      console.error('Erreur lors de la régénération:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metierResult) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Calcul de ton métier...</Text>
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

        {/* Badge RÉSULTAT DÉBLOQUÉ — même dégradé que Résultat Secteur */}
        <View style={styles.badgeContainer}>
          <LinearGradient
            colors={['#FFD200', '#FF8E0C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>RÉSULTAT DÉBLOQUÉ</Text>
          </LinearGradient>
        </View>

        {/* Card avec le métier — même structure que Résultat Secteur */}
        <View style={styles.metierCard}>
          <Text style={styles.cardTitle}>CE MÉTIER TE CORRESPOND VRAIMENT</Text>
          
          <View style={styles.metierHeader}>
            <Text style={styles.metierIconEmoji}>💼</Text>
          </View>

          <Text style={styles.metierName}>
            {metierResult.metierName ? 
              metierResult.metierName.toUpperCase().replace(/\s+/g, ' ').split(' ').map((word, i) => 
                i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ') 
              : 'DEVELOPPER Web'}
          </Text>

          <Text style={styles.description}>
            {metierResult.why || 'Tu aimes résoudre des problèmes, comprendre comment les choses fonctionnent et créer des solutions concrètes grâce à la technologie.'}
          </Text>

          <View style={styles.separator} />

          {/* Bouton CONTINUER — vers "Ton métier défini" puis Checkpoints */}
          <HoverableTouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              navigation.replace('TonMetierDefini', {
                metierName: metierResult.metierName || 'Trader',
              });
            }}
            variant="button"
          >
            <Text style={styles.continueButtonText}>CONTINUER</Text>
          </HoverableTouchableOpacity>

          {/* Bouton RÉGÉNÉRER */}
          <HoverableTouchableOpacity
            style={styles.regenerateButton}
            onPress={handleRegenerateMetier}
            variant="button"
          >
            <Text style={styles.regenerateButtonText}>RÉGÉNÉRER</Text>
          </HoverableTouchableOpacity>

          <Text style={styles.regenerateHint}>
            (Tu peux ajuster si tu ne te reconnais pas totalement)
          </Text>
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
    minHeight: SCREEN_HEIGHT - 60,
    paddingTop: 80,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  alignTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  starContainer: {
    marginBottom: -90,
    marginTop: 0,
    alignItems: 'center',
    zIndex: 0,
  },
  starImage: {
    width: 180,
    height: 180,
  },
  badgeContainer: {
    marginBottom: -20,
    zIndex: 10,
  },
  badge: {
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 999,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metierCard: {
    backgroundColor: '#373D4B',
    borderRadius: 28,
    padding: 40,
    paddingTop: 30,
    paddingBottom: 30,
    marginBottom: 60,
    width: SCREEN_WIDTH * 0.7 + 160,
    maxWidth: 1100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 28,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  metierHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  metierIconImage: {
    width: 100,
    height: 100,
  },
  metierIconEmoji: {
    fontSize: 52,
    textAlign: 'center',
  },
  metierName: {
    fontSize: 28,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '900',
    marginBottom: 32,
  },
  separator: {
    height: 2,
    backgroundColor: '#8E8E8E',
    marginVertical: 28,
    width: '60%',
    alignSelf: 'center',
  },
  description: {
    fontSize: 15,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    opacity: 0.85,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  continueButton: {
    backgroundColor: '#FF7B2B',
    width: BTN_WIDTH,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  regenerateButton: {
    backgroundColor: '#019AEB',
    width: BTN_WIDTH,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  regenerateButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  regenerateHint: {
    fontSize: 13,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
  },
});
