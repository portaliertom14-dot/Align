import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../styles/theme';

/**
 * Barre de navigation basse Align
 * HOME | QUÊTES | PROFIL (bouton rond orange)
 * Barre fine orange sous l'icône active
 */
export default function BottomNavBar() {
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
    <View style={styles.container}>
      {/* HOME */}
      <TouchableOpacity
        onPress={handleHome}
        style={styles.navItem}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Text style={[
            styles.navIcon,
            isActive('Feed') && styles.navIconActive
          ]}>
            🏠
          </Text>
          {/* Barre fine orange sous l'icône active */}
          {isActive('Feed') && <View style={styles.activeIndicator} />}
        </View>
      </TouchableOpacity>

      {/* QUÊTES */}
      <TouchableOpacity
        onPress={handleQuetes}
        style={styles.navItem}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Text style={[
            styles.navIcon,
            isActive('Quetes') && styles.navIconActive
          ]}>
            📜
          </Text>
          {/* Barre fine orange sous l'icône active */}
          {isActive('Quetes') && <View style={styles.activeIndicator} />}
        </View>
      </TouchableOpacity>

      {/* PROFIL - Bouton rond orange */}
      <TouchableOpacity
        onPress={handleProfil}
        style={styles.profilButton}
        activeOpacity={0.9}
      >
        <View style={styles.profilButtonCircle}>
          <Text style={styles.profilIcon}>👤</Text>
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
  activeIndicatorProfil: {
    position: 'absolute',
    bottom: -8,
    width: 50, // Légèrement supérieure à la largeur du cercle
    height: 3,
    backgroundColor: '#FF7B2B',
    borderRadius: 10,
  },
});




