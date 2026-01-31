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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

        {/* Card avec le métier */}
        <View style={styles.metierCard}>
          <Text style={styles.cardTitle}>TON MÉTIER RECOMMANDÉ</Text>
          
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

          {/* Bouton ACCUEIL */}
          <HoverableTouchableOpacity
            style={styles.homeButton}
            onPress={async () => {
              // BUG FIX: Marquer l'onboarding comme complété après tous les quiz
              try {
                const user = await getCurrentUser();
                if (user?.id) {
                  await upsertUser(user.id, {
                    onboarding_completed: true,
                    onboarding_step: 999, // FINAL_STEP: tous les quiz sont finis
                  });
                  console.log('[PropositionMetier] ✅ Onboarding marqué comme complété');
                }
              } catch (error) {
                console.error('[PropositionMetier] Erreur marquage onboarding:', error);
                // Continuer quand même la redirection
              }
              navigation.replace('Main');
            }}
            variant="button"
          >
            <Text style={styles.homeButtonText}>ACCUEIL</Text>
          </HoverableTouchableOpacity>

          {/* Bouton RÉGÉNÉRER */}
          <HoverableTouchableOpacity
            style={styles.regenerateButton}
            onPress={handleRegenerateMetier}
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
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center', // Centre verticalement tout le contenu
    paddingBottom: 20, // Padding réduit en bas
  },
  alignTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
    position: 'absolute', // Position absolue pour le fixer en haut
    top: 60, // Même position que le header sur les autres écrans (paddingTop: 60)
    left: 0,
    right: 0,
    zIndex: 20, // Au-dessus de tous les autres éléments
  },
  starContainer: {
    marginBottom: -100, // Chevauchement pour cacher la moitié inférieure de l'étoile (200px/2 = 100px)
    marginTop: 0, // Pas de décalage vertical, centré par justifyContent
    alignItems: 'center',
    zIndex: 0, // Dernier plan (le plus bas)
  },
  starImage: {
    width: 200,
    height: 200,
  },
  badgeContainer: {
    marginBottom: -25, // Superposition sur la carte
    zIndex: 10, // Augmenté pour passer devant l'étoile
  },
  badge: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
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
  metierCard: {
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
  metierHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  metierIconImage: {
    width: 100,
    height: 100,
  },
  metierIconEmoji: {
    fontSize: 65, // Taille réduite de 55px (120 - 55 = 65)
    textAlign: 'center',
  },
  metierName: {
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
  homeButton: {
    backgroundColor: '#FF782D',
    borderRadius: 999,
    paddingVertical: 12, // Même padding que le badge
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
  homeButtonText: {
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
    paddingVertical: 12, // Même padding que le badge
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
