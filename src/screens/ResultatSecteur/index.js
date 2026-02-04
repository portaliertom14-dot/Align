import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useQuiz } from '../../context/QuizContext';
import { calculateSectorFromAnswers } from '../../lib/sectorAlgorithm';
import { questions } from '../../data/questions';
import { setActiveDirection, updateUserProgress } from '../../lib/userProgress';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import StandardHeader from '../../components/StandardHeader';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from '../Onboarding/onboardingConstants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();

// Assets
const starIcon = require('../../../assets/icons/star.png');

/**
 * Mapping secteur → emoji — icône cohérente par secteur/métier
 * Point d'entrée IA : si sectorResult.icon est fourni (ex. réponse IA), il prime sur ce mapping
 */
const SECTOR_ICONS = {
  tech: '💻',
  business: '💼',
  creation: '🎨',
  création: '🎨',
  droit: '⚖️',
  sante: '🏥',
  santé: '🏥',
  finance: '💰',
  ingénierie: '🔧',
  recherche: '🔬',
  design: '✏️',
  communication: '📢',
  architecture: '🏛️',
  enseignement: '📚',
  sciences_humaines: '🧠',
  sciences_technologies: '🔬',
  droit_argumentation: '⚖️',
  arts_communication: '🎭',
  commerce_entrepreneuriat: '💼',
  sciences_humaines_sociales: '🤝',
};

function getIconForSector(sectorResult) {
  // IA fournit une icône → on l'utilise directement
  if (sectorResult?.icon) return sectorResult.icon;
  const id = (sectorResult?.secteurId || '').toLowerCase();
  const name = (sectorResult?.secteurName || '').toLowerCase();
  return SECTOR_ICONS[id] ?? SECTOR_ICONS[name] ?? '💼';
}

/**
 * Structure resultData — point d'entrée pour future IA
 * sectorName, sectorDescription, icon peuvent être remplacés par une réponse IA
 */
function buildResultData(sectorResult) {
  if (!sectorResult) return null;
  return {
    sectorName: sectorResult.secteurName || 'Tech',
    sectorDescription:
      sectorResult.justification ||
      sectorResult.explanation ||
      'Tu aimes résoudre des problèmes, comprendre comment les choses fonctionnent et créer des solutions concrètes grâce à la technologie.',
    icon: getIconForSector(sectorResult),
  };
}

/**
 * Écran Résultat Secteur - Design "RÉSULTAT DÉBLOQUÉ"
 * Affiche le secteur dominant — resultData préparé pour future IA
 */
export default function ResultatSecteurScreen() {
  const navigation = useNavigation();
  const { answers } = useQuiz();
  const [sectorResult, setSectorResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const resultData = useMemo(() => buildResultData(sectorResult), [sectorResult]);

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
        { id: 'finance', name: 'Finance', description: 'Tu aimes les chiffres, gérer les finances et créer des solutions concrètes grâce à ton expertise. Le secteur de la finance te correspond donc à merveille!' },
      ];

      const currentSecteurId = sectorResult?.secteurId;
      const availableSecteurs = secteurs.filter((s) => s.id !== currentSecteurId);
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

  if (loading || !sectorResult || !resultData) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <StandardHeader title="ALIGN" />
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
      <StandardHeader title="ALIGN" />
      <View style={styles.scrollContent}>
        {/* Image étoile dorée */}
        <View style={styles.starContainer}>
          <Image source={starIcon} style={styles.starImage} resizeMode="contain" />
        </View>

        {/* Badge RÉSULTAT DÉBLOQUÉ (pas un bouton, dégradé exact) */}
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

        {/* Card avec le secteur — resultData pour future IA */}
        <View style={styles.sectorCard}>
          <Text style={styles.cardTitle}>CE SECTEUR TE CORRESPOND VRAIMENT</Text>

          <View style={styles.sectorHeader}>
            <Text style={styles.sectorIconEmoji}>{resultData.icon}</Text>
          </View>

          <Text style={styles.sectorName}>{resultData.sectorName}</Text>

          <Text style={styles.description}>{resultData.sectorDescription}</Text>

          <View style={styles.separator} />

          {/* Bouton CONTINUER — vers Quiz Métier (même style que onboarding) */}
          <HoverableTouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.replace('InterludeSecteur', { sectorName: resultData.sectorName || 'Tech' })}
            variant="button"
          >
            <Text style={styles.continueButtonText}>CONTINUER</Text>
          </HoverableTouchableOpacity>

          {/* Bouton RÉGÉNÉRER — flat, même dimensions */}
          <HoverableTouchableOpacity
            style={styles.regenerateButton}
            onPress={handleRegenerateSector}
            variant="button"
          >
            <Text style={styles.regenerateButtonText}>RÉGÉNÉRER</Text>
          </HoverableTouchableOpacity>

          {/* Texte sous RÉGÉNÉRER */}
          <Text style={styles.regenerateHint}>
            (Tu peux ajuster si tu ne te reconnais pas totalement)
          </Text>
        </View>
      </View>
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
  scrollContent: {
    flex: 1,
    paddingTop: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingBottom: 16,
  },
  starContainer: {
    marginBottom: -56,
    marginTop: 0,
    alignItems: 'center',
    zIndex: 0,
  },
  starImage: {
    width: 140,
    height: 140,
  },
  badgeContainer: {
    marginBottom: -12,
    zIndex: 10,
  },
  badge: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectorCard: {
    backgroundColor: '#373D4B',
    borderRadius: 24,
    padding: 28,
    paddingTop: 37,
    paddingBottom: 37,
    marginBottom: 16,
    width: SCREEN_WIDTH * 0.7 + 160,
    maxWidth: 1100,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectorHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectorIconImage: {
    width: 100,
    height: 100,
  },
  sectorIconEmoji: {
    fontSize: 44,
    textAlign: 'center',
  },
  sectorName: {
    fontSize: 25,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '900',
    marginBottom: 24,
  },
  separator: {
    height: 2,
    backgroundColor: '#8E8E8E',
    marginVertical: 20,
    width: '60%',
    alignSelf: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    opacity: 0.85,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#FF7B2B',
    width: Math.min(BTN_WIDTH * 0.88, 360),
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
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
    width: Math.min(BTN_WIDTH * 0.88, 360),
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 8,
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
