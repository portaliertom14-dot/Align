import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useQuiz } from '../../context/QuizContext';
import { calculateAlignProfile, validateAnswers } from '../../lib/quizAlgorithm';
import { saveUserProfile } from '../../lib/userProfile';
import { setActiveDirection } from '../../lib/userProgress';
import Button from '../../components/Button';
import Title from '../../components/Title';
import Card from '../../components/Card';
import Header from '../../components/Header';
import { theme } from '../../styles/theme';

/**
 * Mapping des catégories vers des directions principales (orientées métier)
 */
const DIRECTION_MAPPING = {
  'Structuré': 'Droit & Argumentation',
  'Créatif': 'Arts & Communication',
  'Dynamique': 'Commerce & Entrepreneuriat',
  'Mixte': 'Sciences & Technologies',
  'Polyforme': 'Sciences Humaines & Sociales',
};

/**
 * Messages rassurants pour chaque direction
 */
const DIRECTION_MESSAGES = {
  'Structuré': 'Tu excelles dans la construction d\'arguments solides et la rigueur.',
  'Créatif': 'Tu as une sensibilité artistique et une capacité à communiquer différemment.',
  'Dynamique': 'Tu es fait pour créer, vendre et transformer des idées en réalité.',
  'Mixte': 'Tu combines analyse et innovation pour résoudre des problèmes complexes.',
  'Polyforme': 'Tu explores plusieurs domaines avec curiosité et adaptabilité.',
};

/**
 * Calcule le pourcentage de cohérence basé sur les scores du profil
 */
function calculateCoherencePercentage(profile) {
  if (!profile || !profile.scores) return 72; // Valeur par défaut
  
  const scores = profile.scores;
  const maxScore = Math.max(scores.structure || 0, scores.creatif || 0, scores.dynamique || 0, scores.mixte || 0);
  const totalScore = (scores.structure || 0) + (scores.creatif || 0) + (scores.dynamique || 0) + (scores.mixte || 0);
  
  if (totalScore === 0) return 72;
  
  // Pourcentage basé sur la dominance du score principal
  const dominance = (maxScore / totalScore) * 100;
  
  // Normaliser entre 65% et 85% pour éviter d'être trop précis ou trop vague
  return Math.min(Math.max(Math.round(dominance * 0.8 + 65), 65), 85);
}

/**
 * Écran Résultat Align - Émotionnellement fort et orienté action
 * Moment clé qui transforme la confusion en direction claire
 */
export default function ResultatScreen() {
  const navigation = useNavigation();
  const { answers } = useQuiz();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Calculer le profil au chargement
    const calculateProfile = async () => {
      try {
        // Valider les réponses
        const validation = validateAnswers(answers);
        
        if (!validation.isComplete) {
          console.warn('Quiz incomplet:', validation);
        }

        // Calculer le profil
        const calculatedProfile = calculateAlignProfile(answers);
        setProfile(calculatedProfile);

        // Sauvegarder le profil
        await saveUserProfile(calculatedProfile);

        // Définir la direction active et la série associée
        const directionPrincipale = DIRECTION_MAPPING[calculatedProfile.categorie] || calculatedProfile.categorie;
        await setActiveDirection(directionPrincipale);
      } catch (error) {
        console.error('Erreur lors du calcul du profil:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateProfile();
  }, [answers]);

  const handleStartSeries = () => {
    // Utiliser replace pour éviter de revenir en arrière
    navigation.navigate('Main', { screen: 'Feed' }); // Rediriger vers l'accueil où l'utilisateur peut choisir un module
  };

  if (loading || !profile) {
    return (
      <LinearGradient
        colors={theme.colors.gradient.align}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Calcul de votre profil...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Récupérer la direction principale
  const directionPrincipale = DIRECTION_MAPPING[profile.categorie] || profile.categorie;
  const messageDirection = DIRECTION_MESSAGES[profile.categorie] || 'Tu as un profil unique et intéressant.';
  const coherencePercentage = calculateCoherencePercentage(profile);

  return (
    <LinearGradient
      colors={theme.colors.gradient.align}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Titre principal - MESSAGE FORT */}
        <View style={styles.titleContainer}>
          <Title variant="h1" style={styles.mainTitle}>
            Tu y vois plus clair.
          </Title>
        </View>

        {/* 2. Bloc central - La Direction Principale */}
        <Card style={styles.directionCard}>
          {/* Icône gamifiée (placeholder) */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🧭</Text>
            </View>
          </View>

          {/* Titre de la section */}
          <Text style={styles.directionLabel}>Ta direction principale</Text>

          {/* Direction principale */}
          <Text style={styles.directionMain}>
            {directionPrincipale}
          </Text>

          {/* Sous-texte rassurant */}
          <Text style={styles.directionSubtext}>
            {messageDirection}
          </Text>

          <View style={styles.reassuranceBox}>
            <Text style={styles.reassuranceText}>
              Ce n'est pas une décision définitive, mais une direction pour avancer.
            </Text>
          </View>
        </Card>

        {/* 3. Barre de confiance (gamifiée) */}
        <Card style={styles.confidenceCard}>
          <Text style={styles.confidenceLabel}>
            Niveau de cohérence avec ton profil
          </Text>
          
          <View style={styles.confidenceBarContainer}>
            <LinearGradient
              colors={['#FF7B2B', '#FF852D', '#FFD93F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.confidenceBar, { width: `${coherencePercentage}%` }]}
            />
          </View>
          
          <Text style={styles.confidencePercentage}>
            {coherencePercentage}%
          </Text>
        </Card>

        {/* 4. Message clé anti-stress */}
        <View style={styles.antiStressContainer}>
          <Text style={styles.antiStressText}>
            Tu n'as pas besoin de tout savoir maintenant.
          </Text>
          <Text style={styles.antiStressText}>
            Tu as juste besoin d'avancer.
          </Text>
        </View>

        {/* 5. Bouton principal - ENTRER DANS TA SÉRIE */}
        <View style={styles.buttonContainer}>
          <Button
            title="Commencer ma série"
            onPress={handleStartSeries}
            style={styles.startButton}
          />
        </View>

        {/* Espace pour éviter que le bouton ne soit coupé */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 32,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: theme.fonts.body,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 32,
    alignItems: 'center',
  },
  mainTitle: {
    textAlign: 'center',
    fontSize: 36,
    letterSpacing: 1,
  },
  directionCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#00AAFF',
  },
  iconEmoji: {
    fontSize: 40,
  },
  directionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontFamily: theme.fonts.body,
  },
  directionMain: {
    fontSize: 28,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: theme.fonts.title,
    letterSpacing: 0.5,
  },
  directionSubtext: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    fontFamily: theme.fonts.body,
  },
  reassuranceBox: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00AAFF',
    width: '100%',
  },
  reassuranceText: {
    fontSize: 14,
    color: '#0055FF',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: theme.fonts.body,
    fontStyle: 'italic',
  },
  confidenceCard: {
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: theme.fonts.body,
  },
  confidenceBarContainer: {
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 6,
  },
  confidencePercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    fontFamily: theme.fonts.button,
  },
  antiStressContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  antiStressText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
    fontFamily: theme.fonts.body,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
  },
  startButton: {
    width: '100%',
  },
  bottomSpacer: {
    height: 20,
  },
});
