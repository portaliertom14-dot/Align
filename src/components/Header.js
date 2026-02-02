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
 * Header global Align — identique à l’écran Home (LayoutAlign)
 * Même taille, couleur (#FFFFFF), position (paddingTop 60, paddingBottom 24) partout :
 * Home (Feed), Paramètres, Quêtes, Profil.
 */
export default function Header({ showSettings = false, onSettingsPress, rightImage = null }) {
  return (
    <View style={styles.header}>
      {/* Bouton paramètres (optionnel) */}
      {showSettings && onSettingsPress && (
        <HoverableTouchableOpacity
          onPress={onSettingsPress}
          style={styles.settingsButton}
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

      {/* Titre ALIGN — même style que Home */}
      <Text style={styles.headerTitle}>
        ALIGN
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Référence : LayoutAlign (écran Home) — même hauteur et espacement
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  settingsIcon: {
    width: 24,
    height: 24,
  },
  settingsIconEmoji: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  // Même style que Home (LayoutAlign) : blanc, 32px, centré
  headerTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  rightImageContainer: {
    position: 'absolute',
    top: 5,
    right: 24,
    zIndex: 10,
  },
  rightImage: {
    width: 260,
    height: 260,
  },
});
