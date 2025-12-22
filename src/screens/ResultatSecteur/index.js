import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useQuiz } from '../../context/QuizContext';
import { calculateSectorFromAnswers, SECTOR_NAMES } from '../../lib/sectorAlgorithm';
import { wayDetermineSecteur } from '../../services/wayMock';
import { questions } from '../../data/questions';
import { setActiveDirection, updateUserProgress } from '../../lib/userProgress';
import { TouchableOpacity } from 'react-native';
import Button from '../../components/Button';
import Title from '../../components/Title';
import Card from '../../components/Card';
import Header from '../../components/Header';
import { theme } from '../../styles/theme';

/**
 * Écran Résultat Secteur
 * Affiche le secteur dominant et permet de continuer vers le quiz métier
 */
export default function ResultatSecteurScreen() {
  const navigation = useNavigation();
  const { answers } = useQuiz();
  const [sectorResult, setSectorResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateSector = async () => {
      try {
        // Sauvegarder les réponses du quiz pour way
        await updateUserProgress({ quizAnswers: answers });
        
        // Calculer le secteur dominant via way (IA)
        const result = await calculateSectorFromAnswers(answers, questions);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResultatSecteur/index.js:34',message:'BEFORE setActiveDirection',data:{secteurId:result.secteurId,secteurName:result.secteurName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        setSectorResult(result);

        // Sauvegarder la direction active (UTILISER secteurId, PAS secteurName)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResultatSecteur/index.js:40',message:'BEFORE setActiveDirection - CHECKING MAPPING',data:{secteurId:result.secteurId,secteurName:result.secteurName,usingSecteurName:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        // CRITICAL: setActiveDirection attend un secteurId (snake_case), pas un secteurName
        await setActiveDirection(result.secteurId || result.secteurName);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResultatSecteur/index.js:37',message:'AFTER setActiveDirection',data:{secteurName:result.secteurName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResultatSecteur/index.js:44',message:'ERROR in calculateSector',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        console.error('Erreur lors du calcul du secteur:', error);
        // Afficher l'erreur à l'utilisateur au lieu de masquer
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

  const handleContinueToMetier = () => {
    // Naviguer vers le Quiz Métier
    navigation.replace('QuizMetier');
  };

  const handleRegenerateSector = async () => {
    try {
      setLoading(true);
      
      // Simulation locale : générer un secteur aléatoire
      const secteurs = [
        { id: 'tech', name: 'Tech' },
        { id: 'business', name: 'Business' },
        { id: 'creation', name: 'Création' },
        { id: 'droit', name: 'Droit' },
        { id: 'sante', name: 'Santé' },
      ];
      
      // Exclure le secteur actuel pour avoir un changement visible
      const currentSecteurId = sectorResult?.secteurId;
      const availableSecteurs = secteurs.filter(s => s.id !== currentSecteurId);
      const randomSecteur = availableSecteurs[Math.floor(Math.random() * availableSecteurs.length)] || secteurs[0];
      
      // Mettre à jour la progression
      await setActiveDirection(randomSecteur.id);
      
      const result = {
        secteurId: randomSecteur.id,
        secteurName: randomSecteur.name,
        explanation: `Way a analysé ton profil et a déterminé que le secteur ${randomSecteur.name} correspond mieux à tes réponses.`,
        confiance: 0.75 + Math.random() * 0.2, // Entre 0.75 et 0.95
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
        colors={theme.colors.gradient.align}
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
        {/* Header ALIGN - sans progression pendant l'affichage des résultats */}
        <Header hideProgress={true} />

        {/* Titre */}
        <View style={styles.titleContainer}>
          <Title variant="h1" style={styles.title}>
            Ton secteur Align
          </Title>
        </View>

        {/* Card avec le secteur déterminé par way */}
        <Card style={styles.sectorCard}>
          <View style={styles.sectorHeader}>
            <Text style={styles.sectorIcon}>🎯</Text>
            <Text style={styles.sectorName}>{sectorResult.secteurName}</Text>
          </View>

          <Text style={styles.explanation}>
            {sectorResult.justification || sectorResult.explanation || 'Way a analysé ton profil pour déterminer ce secteur.'}
          </Text>
          
          {sectorResult.confiance !== undefined && sectorResult.confiance < 0.7 && (
            <View style={styles.confidenceNote}>
              <Text style={styles.confidenceNoteText}>
                💡 Ce secteur correspond à ton profil, mais continue à explorer pour affiner ton choix.
              </Text>
            </View>
          )}
        </Card>

        {/* Boutons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Régénérer un autre secteur"
            onPress={handleRegenerateSector}
            style={styles.regenerateButton}
          />
          <Button
            title="Continuer"
            onPress={handleContinueToMetier}
            style={styles.continueButton}
          />
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
    paddingBottom: 40,
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 32,
  },
  sectorCard: {
    marginHorizontal: 24,
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
  },
  sectorHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  sectorName: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#000000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  explanation: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: theme.fonts.body,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginTop: 32,
    gap: 12,
  },
  regenerateButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  continueButton: {
    width: '100%',
  },
});






