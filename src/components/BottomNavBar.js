import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated, Image, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../styles/theme';

// Icônes de navigation
const homeIcon = require('../../assets/icons/home.png');
const questsIcon = require('../../assets/icons/quests.png');
const profileIcon = require('../../assets/icons/profile.png');

/**
 * Barre de navigation basse Align
 * HOME | QUÊTES | PROFIL (bouton rond orange)
 * Barre fine orange sous l'icône active
 * @param {React.RefObject} questsIconRef - Ref optionnelle pour mesurer l'icône Quêtes (tutoriel guidé)
 * @param {boolean} questsHighlight - Tutoriel step 2 : icône Quêtes nette et cliquable au-dessus du blur
 * @param {number} questsZIndex - zIndex pour l'icône Quêtes quand highlight (ex: 20)
 */
export default function BottomNavBar({ questsIconRef, questsHighlight, questsZIndex = 20 }) {
  const navigation = useNavigation();
  const route = useRoute();
  const [indicatorPosition] = React.useState(new Animated.Value(0));

  const isActive = (routeName) => {
    return route.name === routeName;
  };

  // Animation de la barre lors du changement d'onglet
  React.useEffect(() => {
    let toValue = 0;
    if (isActive('Feed')) {
      toValue = 0; // Position pour HOME
    } else if (isActive('Quetes')) {
      toValue = 1; // Position pour QUÊTES
    } else if (isActive('Profil')) {
      toValue = 2; // Position pour PROFIL
    }

    Animated.spring(indicatorPosition, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [route.name]);

  const handleHome = () => {
    navigation.navigate('Feed');
  };

  const handleQuetes = () => {
    navigation.navigate('Quetes');
  };

  const handleProfil = () => {
    navigation.navigate('Profil');
  };

  // Calculer la position de la barre (sous les icônes)
  const itemWidth = '33.33%'; // 3 items égaux
  const indicatorLeft = indicatorPosition.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0%', '33.33%', '66.66%'],
  });

  return (
    <View style={[styles.container, questsHighlight && { pointerEvents: 'box-none' }]}>
      {/* HOME */}
      <TouchableOpacity
        onPress={handleHome}
        style={styles.navItem}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Image 
            source={homeIcon} 
            style={[
              styles.navIconImage,
              isActive('Feed') && styles.navIconImageActive
            ]}
            resizeMode="contain"
          />
          {/* Barre fine orange sous l'icône active */}
          {isActive('Feed') && <View style={styles.activeIndicator} />}
        </View>
      </TouchableOpacity>

      {/* QUÊTES — step 2 : net et cliquable au-dessus du blur */}
      <View
        ref={questsIconRef}
        style={[
          styles.navItem,
          questsHighlight && { zIndex: questsZIndex, pointerEvents: 'auto' },
        ]}
        {...(Platform.OS !== 'web' ? { collapsable: false } : {})}
      >
        <TouchableOpacity
          onPress={handleQuetes}
          style={styles.navItemTouchable}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Image 
              source={questsIcon} 
              style={[
                styles.navIconImage,
                isActive('Quetes') && styles.navIconImageActive
              ]}
              resizeMode="contain"
            />
            {isActive('Quetes') && <View style={styles.activeIndicator} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* PROFIL - Bouton rond orange */}
      <TouchableOpacity
        onPress={handleProfil}
        style={styles.profilButton}
        activeOpacity={0.9}
      >
        <View style={styles.profilButtonCircle}>
          <Image 
            source={profileIcon} 
            style={styles.profilIconImage}
            resizeMode="contain"
          />
          {/* Barre fine orange sous l'icône active */}
          {isActive('Profil') && <View style={styles.activeIndicatorProfil} />}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'transparent', // Fond transparent au lieu de blanc
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  navIconActive: {
    opacity: 1,
  },
  navIconImage: {
    width: 32,
    height: 32,
    opacity: 0.6,
  },
  navIconImageActive: {
    opacity: 1,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8, // Position sous l'icône
    width: 40, // Légèrement supérieure à la largeur de l'icône
    height: 3,
    backgroundColor: '#FF7B2B',
    borderRadius: 10,
  },
  profilButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    position: 'relative',
  },
  profilButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  profilIcon: {
    fontSize: 28,
  },
  profilIconImage: {
    width: 28,
    height: 28,
  },
  activeIndicatorProfil: {
    position: 'absolute',
    bottom: -8,
    width: 50, // Légèrement supérieure à la largeur du cercle
    height: 3,
    backgroundColor: '#FF7B2B',
    borderRadius: 10,
  },
});




