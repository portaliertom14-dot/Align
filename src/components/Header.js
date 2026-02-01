import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';
import HoverableTouchableOpacity from './HoverableTouchableOpacity';

// Logo des paramètres
// Le fichier doit être placé dans assets/icons/settings.png
let settingsIcon = null;
try {
  settingsIcon = require('../../assets/icons/settings.png');
} catch (e) {
  // Fichier n'existe pas encore, sera ajouté manuellement
  settingsIcon = null;
}

// Image star-gear pour les écrans qui l'utilisent
let starGearImage = null;
try {
  starGearImage = require('../../assets/images/star-gear.png');
} catch (e) {
  // Image n'existe pas encore
  starGearImage = null;
}

/**
 * Header global Align
 * Affiche "ALIGN" uniquement
 * Peut afficher une image optionnelle en haut à droite
 * alignWithOnboarding: même hauteur et taille que les écrans onboarding (marginTop 48, fontSize 28)
 */
export default function Header({ showSettings = false, onSettingsPress, rightImage = null, alignWithOnboarding = false }) {
  return (
    <View style={[styles.header, alignWithOnboarding && styles.headerOnboarding]}>
      {/* Bouton paramètres (optionnel) */}
      {showSettings && onSettingsPress && (
        <HoverableTouchableOpacity
          onPress={onSettingsPress}
          style={[styles.settingsButton, alignWithOnboarding && styles.settingsButtonOnboarding]}
          variant="icon"
        >
          {settingsIcon ? (
            <Image 
              source={settingsIcon} 
              style={styles.settingsIcon} 
              tintColor="#FFFFFF"
              resizeMode="contain" 
            />
          ) : (
            <Text style={styles.settingsIconEmoji}>⚙️</Text>
          )}
        </HoverableTouchableOpacity>
      )}

      {/* Image optionnelle en haut à droite */}
      {rightImage && (
        <View style={styles.rightImageContainer}>
          <Image 
            source={rightImage} 
            style={styles.rightImage} 
            resizeMode="contain" 
          />
        </View>
      )}

      {/* Titre ALIGN */}
      <Text style={[styles.headerTitle, alignWithOnboarding && styles.headerTitleOnboarding]}>
        ALIGN
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: 24,
  },
  headerOnboarding: {
    paddingTop: 48,
    paddingBottom: 16,
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  settingsButtonOnboarding: {
    top: 48,
  },
  settingsIcon: {
    width: 24,
    height: 24,
  },
  settingsIconEmoji: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#61DAFB', // Bleu clair comme dans les images de référence
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  headerTitleOnboarding: {
    fontSize: 28,
    color: '#FFFFFF',
    marginTop: 0,
    marginBottom: 24,
  },
  rightImageContainer: {
    position: 'absolute',
    top: 5, // Déplacé de 5px vers le haut (était 10)
    right: 24,
    zIndex: 10,
  },
  rightImage: {
    width: 260,
    height: 260,
  },
});
