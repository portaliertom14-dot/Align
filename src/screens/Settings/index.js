/**
 * Écran Paramètres
 * Affiche les options de compte et paramètres
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getUserProfile } from '../../lib/userProfile';
import { resetUserProgress } from '../../lib/userProgress';
import Header from '../../components/Header';
import Card from '../../components/Card';
import BottomNavBar from '../../components/BottomNavBar';
import { theme } from '../../styles/theme';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadProfile();
    const unsubscribe = navigation.addListener('focus', loadProfile);
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  };

  const handleResetQuiz = () => {
    Alert.alert(
      'Recommencer le quiz',
      'Êtes-vous sûr de vouloir recommencer depuis le début ? Cette action supprimera toutes vos réponses et votre progression.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetUserProgress();
              Alert.alert('Succès', 'Votre progression a été réinitialisée.');
              navigation.navigate('Main', { screen: 'Feed' });
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de réinitialiser la progression.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: () => {
            // TODO: Implémenter la déconnexion réelle
            Alert.alert('Déconnexion', 'Fonctionnalité de déconnexion à implémenter.');
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={theme.colors.gradient.align}
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
        {/* Compte */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Adresse email</Text>
            <Text style={styles.infoValue}>
              {userProfile?.email || 'Non défini'}
            </Text>
          </View>
        </Card>

        {/* Actions */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleResetQuiz}
          >
            <Text style={styles.actionButtonText}>Recommencer le quiz</Text>
            <Text style={styles.actionButtonIcon}>→</Text>
          </TouchableOpacity>
        </Card>

        {/* Légal */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Légal</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Politique de confidentialité', 'À venir')}
          >
            <Text style={styles.actionButtonText}>Politique de confidentialité</Text>
            <Text style={styles.actionButtonIcon}>→</Text>
          </TouchableOpacity>
        </Card>

        {/* Déconnexion */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.button,
    color: '#000000',
    marginBottom: 20,
    letterSpacing: 1,
  },
  infoItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 18,
    fontFamily: theme.fonts.body,
    color: '#000000',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#000000',
  },
  actionButtonIcon: {
    fontSize: 20,
    color: '#666666',
  },
  logoutButton: {
    marginTop: 32,
    marginBottom: 24,
    padding: 18,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FF3B30',
    fontWeight: '600',
  },
});




