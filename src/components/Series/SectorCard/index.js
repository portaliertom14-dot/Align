import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Composant SectorCard - Card gamifiée pour les secteurs
 */
export default function SectorCard({ 
  sector, 
  isExplored, 
  onPress 
}) {
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.card,
          isExplored && styles.cardExplored,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F5F5F5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{sector.icon}</Text>
            {isExplored && (
              <View style={styles.exploredBadge}>
                <Text style={styles.exploredText}>✓</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.title}>{sector.name}</Text>
          <Text style={styles.description}>{sector.shortDescription}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardExplored: {
    borderWidth: 2,
    borderColor: '#FF7B2B',
  },
  cardGradient: {
    padding: 16,
    minHeight: 140,
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  icon: {
    fontSize: 40,
  },
  exploredBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF7B2B',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  exploredText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
});













