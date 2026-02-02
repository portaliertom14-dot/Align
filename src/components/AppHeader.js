/**
 * Header unique Align — PIXEL PERFECT identique à l'écran Login/Signup (AuthScreen).
 * Utilisé sur TOUS les écrans pour une apparence 100 % uniforme.
 * Même hauteur, paddings, couleurs, polices que AuthScreen (logo ALIGN).
 */
import React from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';

let settingsIcon = null;
try {
  settingsIcon = require('../../assets/icons/settings.png');
} catch (e) {
  settingsIcon = null;
}

export default function AppHeader({ showSettings = false, onSettingsPress }) {
  return (
    <View style={styles.header}>
      {showSettings && onSettingsPress && (
        <TouchableOpacity
          onPress={onSettingsPress}
          style={styles.settingsButton}
          activeOpacity={0.8}
        >
          {settingsIcon ? (
            <Image source={settingsIcon} style={styles.settingsIcon} tintColor="#FFFFFF" resizeMode="contain" />
          ) : (
            <Text style={styles.settingsIconEmoji}>⚙️</Text>
          )}
        </TouchableOpacity>
      )}
      <Text style={styles.logo}>ALIGN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  logo: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  settingsButton: {
    position: 'absolute',
    top: 48,
    left: 24,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  settingsIcon: {
    width: 24,
    height: 24,
  },
  settingsIconEmoji: {
    fontSize: 24,
    color: '#FFFFFF',
  },
});
