import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getUserProgress } from '../../lib/userProgress';
import { calculateLevel, getXPNeededForNextLevel } from '../../lib/progression';
import { getUserProfile, saveUserProfile } from '../../lib/userProfile';
import BottomNavBar from '../../components/BottomNavBar';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import Card from '../../components/Card';
import { theme } from '../../styles/theme';

// Ajustements design & UX — accueil, quêtes, profil
// Import conditionnel pour expo-image-picker (upload photo de profil)
let ImagePicker = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  // Si non installé, l'upload ne fonctionnera pas mais l'app ne plantera pas
}

/**
 * Écran Profil utilisateur Align
 * Affiche les infos utilisateur, secteur/métier favori et description IA
 * UX finalisée — prête pour branchement IA ultérieur
 */
export default function ProfilScreen() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      // Charger la progression
      const userProgress = await getUserProgress();
      const currentXP = userProgress.currentXP || 0;
      const currentLevel = calculateLevel(currentXP);
      const xpForNextLevel = getXPNeededForNextLevel(currentXP);
      const stars = userProgress.totalStars || 0;

      setProgress({
        ...userProgress,
        currentLevel,
        xpForNextLevel,
        stars,
        currentXP,
      });

      // Charger le profil utilisateur (onboarding)
      const profileData = await getUserProfile();
      setUserProfile(profileData);
      // Ajustements design & UX — accueil, quêtes, profil
      if (profileData?.photoURL) {
        setProfilePhoto(profileData.photoURL);
      }

      // Le profil Align (secteur/métier) vient de la progression
      // Mapper le secteurId vers le nom du secteur
      const secteurId = userProgress.activeDirection;
      const secteurName = secteurId 
        ? (secteurId === 'tech' ? 'Tech' 
           : secteurId === 'business' ? 'Business'
           : secteurId === 'creation' ? 'Création'
           : secteurId === 'droit' ? 'Droit'
           : secteurId === 'sante' ? 'Santé'
           : secteurId) 
        : null;
      
      // Mapper le metierId vers le nom du métier
      const metierId = userProgress.activeMetier;
      const metierName = metierId
        ? (metierId === 'developpeur' ? 'Développeur logiciel'
           : metierId === 'entrepreneur' ? 'Entrepreneur'
           : metierId === 'designer' ? 'Designer'
           : metierId === 'avocat' ? 'Avocat'
           : metierId === 'medecin' ? 'Médecin'
           : metierId)
        : null;
      
      setProfile({
        secteur: secteurName,
        metier: metierName,
      });
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Générer une description IA basée sur le profil
  const generateAIDescription = () => {
    if (!profile || !progress) {
      return 'Complète les quiz pour obtenir ta description personnalisée.';
    }

    const parts = [];

    if (profile.secteur && profile.secteur !== 'Non défini') {
      parts.push(`Tu es orienté vers ${profile.secteur.toLowerCase()}.`);
    }

    if (progress.currentLevel > 0) {
      parts.push(`Tu as déjà atteint le niveau ${progress.currentLevel}.`);
    }

    if (progress.stars > 0) {
      parts.push(`Tu as gagné ${progress.stars} étoiles.`);
    }

    if (progress.currentXP > 0) {
      parts.push(`Tu as accumulé ${progress.currentXP} points d'expérience.`);
    }

    if (parts.length === 0) {
      return 'Complète les quiz et les quêtes pour découvrir ta description personnalisée générée par Align.';
    }

    return parts.join(' ') + ' Continue à explorer pour découvrir ton potentiel !';
  };

  // Ajustements design & UX — accueil, quêtes, profil
  const handlePickImage = async () => {
    // Utiliser expo-image-picker si disponible, sinon simulation locale
    if (ImagePicker) {
      try {
        // Demander la permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à vos photos.');
          return;
        }

        // Ouvrir le sélecteur d'image
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const photoURI = result.assets[0].uri;
          setProfilePhoto(photoURI);
          
          // Sauvegarder dans le profil
          const currentProfile = await getUserProfile() || {};
          await saveUserProfile({
            ...currentProfile,
            photoURL: photoURI,
          });
        }
      } catch (error) {
        console.error('Erreur lors de la sélection de l\'image:', error);
        Alert.alert('Erreur', `Impossible de charger l'image: ${error.message}`);
      }
    } else {
      // Simulation locale : utiliser une image par défaut ou générer une URI locale
      // Pour le développement, on peut utiliser une image de test
      const testPhotoURI = 'https://via.placeholder.com/200';
      setProfilePhoto(testPhotoURI);
      
      // Sauvegarder dans le profil
      const currentProfile = await getUserProfile() || {};
      await saveUserProfile({
        ...currentProfile,
        photoURL: testPhotoURI,
      });
      
      Alert.alert(
        'Photo mise à jour',
        'Pour utiliser une vraie photo, installez expo-image-picker avec: npx expo install expo-image-picker'
      );
    }
  };

  const getAvatarInitials = () => {
    const firstName = userProfile?.firstName || userProfile?.prenom || '';
    const lastName = userProfile?.lastName || userProfile?.nom || '';
    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
    }
    return 'U';
  };

  if (loading || !progress) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
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
      {/* Header ALIGN */}
      <Header />
      
      {/* XP Bar */}
      <XPBar />

      {/* Contenu */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {/* Infos utilisateur */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Informations</Text>
          
          {/* Photo de profil avec option d'upload - Ajustements design & UX — accueil, quêtes, profil */}
          <TouchableOpacity onPress={handlePickImage} style={styles.photoContainer}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.avatarDefault}>
                <Text style={styles.avatarText}>{getAvatarInitials()}</Text>
              </View>
            )}
            <Text style={styles.photoHint}>Appuyez pour changer la photo</Text>
          </TouchableOpacity>

          <View style={styles.infoItem}>
            <View style={styles.infoRow}>
              {profilePhoto && (
                <Image source={{ uri: profilePhoto }} style={styles.infoPhoto} />
              )}
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Prénom</Text>
                <Text style={styles.infoValue}>
                  {userProfile?.firstName || userProfile?.prenom || 'À compléter'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoRow}>
              {profilePhoto && (
                <Image source={{ uri: profilePhoto }} style={styles.infoPhoto} />
              )}
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Nom</Text>
                <Text style={styles.infoValue}>
                  {userProfile?.lastName || userProfile?.nom || 'À compléter'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoRow}>
              {profilePhoto && (
                <Image source={{ uri: profilePhoto }} style={styles.infoPhoto} />
              )}
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Nom d'utilisateur</Text>
                <Text style={styles.infoValue}>
                  {userProfile?.username || userProfile?.nomUtilisateur || 'À compléter'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoRow}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>
                  {userProfile?.email || 'À compléter'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoRow}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Date de naissance</Text>
                <Text style={styles.infoValue}>
                  {userProfile?.birthdate || userProfile?.dateNaissance 
                    ? new Date(userProfile?.birthdate || userProfile?.dateNaissance).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })
                    : 'À compléter'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Infos Align */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Align</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Secteur favori</Text>
            <Text style={styles.infoValue}>
              {profile?.secteur || 'À compléter'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Métier favori</Text>
            <Text style={styles.infoValue}>
              {profile?.metier || 'À compléter'}
            </Text>
          </View>
        </Card>

        {/* Description IA */}
        <Card style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>Description personnalisée</Text>
          <Text style={styles.descriptionSubtitle}>
            Description générée par Align
          </Text>
          <Text style={styles.descriptionText}>
            {generateAIDescription()}
          </Text>
        </Card>
      </ScrollView>

      {/* Barre de navigation basse */}
      <BottomNavBar />
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 32,
    paddingBottom: 100, // Augmenté pour permettre le scroll complet
    paddingHorizontal: 24,
  },
  infoCard: {
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
  },
  // Ajustements design & UX — accueil, quêtes, profil
  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  avatarDefault: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  photoHint: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.8,
    fontStyle: 'italic',
  },
  infoItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 18,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  descriptionCard: {
    padding: 24,
    backgroundColor: '#373D4B',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  descriptionSubtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    lineHeight: 24,
  },
});


