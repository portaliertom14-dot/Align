import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useMetierQuiz } from '../../context/MetierQuizContext';
import { calculateMetierFromAnswers } from '../../lib/metierAlgorithm';
import { wayProposeMetiers } from '../../services/wayMock';
import { quizMetierQuestions } from '../../data/quizMetierQuestions';
import { getUserProgress, setActiveMetier, updateUserProgress } from '../../lib/userProgress';
// NOTE: Les imports markOnboardingCompleted, isOnboardingCompleted et getCurrentUser seront réintégrés avec l'IA
import Button from '../../components/Button';
import Title from '../../components/Title';
import Card from '../../components/Card';
import Header from '../../components/Header';
import { theme } from '../../styles/theme';

/**
 * Écran Proposition Métier
 * Affiche le métier proposé et permet de commencer le premier module
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
        // Récupérer le secteur actif (déterminé par way)
        const progress = await getUserProgress();
        const activeSecteurId = progress.activeSerie || progress.activeDirection || 'sciences_technologies';
        setSecteurId(activeSecteurId);

        // Calculer le métier via way (IA) - retourne 1-3 métiers proposés
        const result = await calculateMetierFromAnswers(answers, quizMetierQuestions, activeSecteurId);
        setMetierResult(result);
        
        // Sauvegarder le métier actif (UN SEUL métier déterminé par way)
        if (result.metierId) {
          await setActiveMetier(result.metierId);
          // Sauvegarder aussi le secteur si pas déjà fait
          await updateUserProgress({ activeDirection: activeSecteurId });
          
          // NOTE: Le marquage de l'onboarding comme complété sera réintégré avec l'IA
          // Pour l'instant, on ne marque pas pour éviter les problèmes de récupération d'utilisateur
        }
      } catch (error) {
        console.error('Erreur lors du calcul du métier:', error);
        // Afficher l'erreur à l'utilisateur au lieu de masquer
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
      // Récupérer le secteur actif
      const progress = await getUserProgress();
      const activeSecteurId = progress.activeDirection || secteurId || 'tech';
      
      // Simulation locale : générer un métier aléatoire selon le secteur
      const metiersParSecteur = {
        tech: [
          { id: 'developpeur', nom: 'Développeur logiciel', justification: 'Tu as un profil technique et créatif, parfait pour le développement.' },
          { id: 'data_scientist', nom: 'Data Scientist', justification: 'Ton profil analytique correspond bien à la science des données.' },
        ],
        business: [
          { id: 'entrepreneur', nom: 'Entrepreneur', justification: 'Ton profil dynamique et autonome correspond à l\'entrepreneuriat.' },
          { id: 'consultant', nom: 'Consultant', justification: 'Tu as les qualités pour conseiller et accompagner les entreprises.' },
        ],
        creation: [
          { id: 'designer', nom: 'Designer', justification: 'Ton profil créatif correspond parfaitement au design.' },
          { id: 'graphiste', nom: 'Graphiste', justification: 'Tu as un sens artistique développé, idéal pour le graphisme.' },
        ],
        droit: [
          { id: 'avocat', nom: 'Avocat', justification: 'Ton profil structuré et argumentatif correspond au métier d\'avocat.' },
          { id: 'notaire', nom: 'Notaire', justification: 'Tu as un profil méthodique, parfait pour le notariat.' },
        ],
        sante: [
          { id: 'medecin', nom: 'Médecin', justification: 'Ton profil empathique et rigoureux correspond à la médecine.' },
          { id: 'infirmier', nom: 'Infirmier', justification: 'Tu as les qualités humaines nécessaires pour les soins infirmiers.' },
        ],
      };
      
      const metiersDisponibles = metiersParSecteur[activeSecteurId] || metiersParSecteur.tech;
      
      // Exclure le métier actuel pour avoir un changement visible
      const currentMetierId = metierResult?.metierId;
      const availableMetiers = metiersDisponibles.filter(m => m.id !== currentMetierId);
      const randomMetier = availableMetiers[Math.floor(Math.random() * availableMetiers.length)] || metiersDisponibles[0];
      
      const result = {
        metierId: randomMetier.id,
        metierName: randomMetier.nom,
        description: `${randomMetier.nom} dans le secteur ${activeSecteurId}`,
        why: randomMetier.justification,
        secteurId: activeSecteurId,
        métiers: [{
          id: randomMetier.id,
          nom: randomMetier.nom,
          justification: randomMetier.justification,
        }],
        score: 75 + Math.random() * 20, // Entre 75 et 95
      };
      
      setMetierResult(result);
      
      // Sauvegarder le nouveau métier
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
        colors={theme.colors.gradient.align}
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
        {/* Header ALIGN - sans progression (onboarding en cours) */}
        <Header hideProgress={true} />

        {/* Titre */}
        <View style={styles.titleContainer}>
          <Title variant="h1" style={styles.title}>
            Ton métier Align
          </Title>
        </View>

        {/* Card avec le(s) métier(s) proposé(s) par way */}
        {metierResult.métiers && metierResult.métiers.length > 0 ? (
          metierResult.métiers.map((metier, index) => (
            <Card key={metier.id || index} style={styles.metierCard}>
              <View style={styles.metierHeader}>
                <Text style={styles.metierIcon}>💼</Text>
                <Text style={styles.metierName}>{metier.nom}</Text>
              </View>

              <View style={styles.whyContainer}>
                <Text style={styles.whyLabel}>Pourquoi ce métier ?</Text>
                <Text style={styles.why}>
                  {metier.justification}
                </Text>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.metierCard}>
            <View style={styles.metierHeader}>
              <Text style={styles.metierIcon}>💼</Text>
              <Text style={styles.metierName}>{metierResult.metierName || 'Métier à découvrir'}</Text>
            </View>

            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.description}>
                {metierResult.description || 'Continue à explorer pour découvrir ton métier.'}
              </Text>
            </View>

            {metierResult.why && (
              <View style={styles.whyContainer}>
                <Text style={styles.whyLabel}>Pourquoi ce métier ?</Text>
                <Text style={styles.why}>
                  {metierResult.why}
                </Text>
              </View>
            )}
          </Card>
        )}
        
        {/* Avertissement de way si présent */}
        {metierResult.avertissement && (
          <Card style={styles.avertissementCard}>
            <Text style={styles.avertissementText}>⚠️ {metierResult.avertissement}</Text>
          </Card>
        )}

        {/* Boutons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Régénérer un autre métier"
            onPress={handleRegenerateMetier}
            style={styles.regenerateButton}
          />
          <Button
            title="Retour à l'accueil"
            onPress={() => {
              // Rediriger vers Main (Feed sera l'écran initial)
              // NOTE: La vérification d'onboarding complété sera réintégrée avec l'IA
              navigation.replace('Main');
            }}
            style={styles.startButton}
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
  metierCard: {
    marginHorizontal: 24,
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
  },
  metierHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  metierIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  metierName: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#000000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionLabel: {
    fontSize: 14,
    color: '#666666',
    fontFamily: theme.fonts.body,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    fontFamily: theme.fonts.body,
  },
  whyContainer: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  whyLabel: {
    fontSize: 14,
    color: '#666666',
    fontFamily: theme.fonts.body,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  why: {
    fontSize: 16,
    color: '#333333',
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
  startButton: {
    width: '100%',
  },
});






