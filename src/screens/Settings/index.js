/**
 * Écran Paramètres
 * Affiche les options de compte et paramètres
 * Design basé sur les screenshots de référence
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getUserProfile } from '../../lib/userProfile';
import { resetUserProgress, getUserProgress } from '../../lib/userProgress';
import { signOut } from '../../services/auth';
import { useQuiz } from '../../context/QuizContext';
import { useMetierQuiz } from '../../context/MetierQuizContext';
import Header from '../../components/Header';
import BottomNavBar from '../../components/BottomNavBar';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import HoverableText from '../../components/HoverableText';
import { theme } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const { resetQuiz: resetSectorQuiz } = useQuiz();
  const { resetQuiz: resetMetierQuiz } = useMetierQuiz();

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
      const userProgress = await getUserProgress();
      setProgress(userProgress);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    }
  };

  const handleResetQuiz = () => {
    Alert.alert(
      'Recommencer les quiz',
      'Êtes-vous sûr de vouloir recommencer depuis le début ? Cette action supprimera toutes vos réponses et votre progression.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Réinitialiser les réponses des quiz dans les contexts
              resetSectorQuiz();
              resetMetierQuiz();
              
              // Réinitialiser la progression utilisateur
              await resetUserProgress();
              
              // Supprimer les réponses aux quiz stockées dans AsyncStorage
              await AsyncStorage.removeItem('@align_quiz_responses');
              await AsyncStorage.removeItem('@align_metier_quiz_responses');
              await AsyncStorage.removeItem('@align_user_progress_fallback');
              
              // Supprimer les réponses aux quiz dans la base de données (si elles existent)
              // Note: Cela nécessiterait une fonction spécifique dans userService
              
              Alert.alert('Succès', 'Votre progression a été réinitialisée.');
              
              // Rediriger vers le premier quiz
              navigation.reset({
                index: 0,
                routes: [{ name: 'Quiz' }],
              });
            } catch (error) {
              console.error('Erreur lors de la réinitialisation:', error);
              Alert.alert('Erreur', 'Impossible de réinitialiser la progression.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              // Déconnexion de l'utilisateur
              const { error } = await signOut();
              
              if (error) {
                console.error('Erreur lors de la déconnexion:', error);
                Alert.alert('Erreur', 'Impossible de se déconnecter. Veuillez réessayer.');
                return;
              }
              
              // Supprimer les données locales (session, cache, etc.)
              await AsyncStorage.multiRemove([
                '@align_user_progress',
                '@align_user_progress_fallback',
                '@align_user_progress_fallback_user_id',
                '@align_quiz_responses',
                '@align_metier_quiz_responses',
              ]);
              
              // Rediriger vers l'écran de connexion
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion.');
            }
          },
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleAbout = () => {
    navigation.navigate('About');
  };

  const handleRevoirTutoriel = async () => {
    await AsyncStorage.removeItem('guidedTourDone');
    navigation.navigate('Main', { screen: 'Feed', params: { forceTour: true } });
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Header />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Section COMPTE */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>COMPTE</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ADRESSE EMAIL</Text>
            <Text style={styles.infoValue}>
              {userProfile?.email || 'Non défini'}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>DATE DE NAISSANCE</Text>
            <Text style={styles.infoValue}>
              {userProfile?.birthdate || userProfile?.date_naissance || 'Non renseigné'}
            </Text>
          </View>
        </View>

        {/* Section PROGRESSION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PROGRESSION</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>SECTEUR FAVORI</Text>
            <Text style={styles.infoValue}>
              {progress?.activeDirection || 'Tech'}
            </Text>
          </View>
        </View>

        {/* Section LÉGAL */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>LÉGAL</Text>
          <HoverableTouchableOpacity
            style={styles.legalItem}
            onPress={handlePrivacyPolicy}
            variant="icon"
          >
            <HoverableText style={styles.legalText} hoverColor="#FF7B2B">Politique de confidentialité</HoverableText>
            <Text style={styles.arrowIcon}>→</Text>
          </HoverableTouchableOpacity>
          <View style={styles.separator} />
          <HoverableTouchableOpacity
            style={styles.legalItem}
            onPress={handleAbout}
            variant="icon"
          >
            <HoverableText style={styles.legalText} hoverColor="#FF7B2B">À propos</HoverableText>
            <Text style={styles.arrowIcon}>→</Text>
          </HoverableTouchableOpacity>
        </View>

        {/* Révoir le tutoriel (accueil) */}
        <HoverableTouchableOpacity
          style={[styles.restartQuizButton, { marginBottom: 12 }]}
          onPress={handleRevoirTutoriel}
          variant="button"
        >
          <LinearGradient
            colors={['#FF7B2B', '#FFD93F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.restartQuizButtonGradient}
          >
            <Text style={styles.restartQuizButtonText}>RÉVOIR LE TUTORIEL</Text>
          </LinearGradient>
        </HoverableTouchableOpacity>

        {/* Bouton RECOMMENCER LES QUIZ (Orange) */}
        <HoverableTouchableOpacity
          style={styles.restartQuizButton}
          onPress={handleResetQuiz}
          variant="button"
        >
          <LinearGradient
            colors={['#FF9900', '#C83D01']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.restartQuizButtonGradient}
          >
            <Text style={styles.restartQuizButtonText}>RECOMMENCER LES QUIZ</Text>
          </LinearGradient>
        </HoverableTouchableOpacity>

        {/* Bouton SE DÉCONNECTER (Rouge) */}
        <HoverableTouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          variant="button"
        >
          <Text style={styles.logoutButtonText}>SE DÉCONNECTER</Text>
        </HoverableTouchableOpacity>
      </ScrollView>

      <BottomNavBar />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 32,
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  sectionCard: {
    marginBottom: 24,
    padding: 24,
    backgroundColor: '#373D4B',
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 16,
  },
  legalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  legalText: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  restartQuizButton: {
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  restartQuizButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  restartQuizButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 32,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
