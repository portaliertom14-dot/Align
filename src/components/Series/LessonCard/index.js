import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Composant LessonCard - Card gamifiée pour les leçons
 */
export default function LessonCard({ 
  lesson, 
  isCompleted, 
  isLocked,
  onPress 
}) {
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    if (!isLocked) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={isLocked ? null : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={isLocked ? 1 : 0.9}
      disabled={isLocked}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.card,
          isCompleted && styles.cardCompleted,
          isLocked && styles.cardLocked,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={
            isLocked
              ? ['#CCCCCC', '#999999']
              : isCompleted
              ? ['#34C759', '#30D158']
              : ['#FFFFFF', '#F5F5F5']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{lesson.icon}</Text>
              {isCompleted && (
                <View style={styles.checkmarkContainer}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
              {isLocked && (
                <View style={styles.lockContainer}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}
            </View>
            
            {!isLocked && (
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>+{lesson.xpReward} XP</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.title, isLocked && styles.titleLocked]}>
            {lesson.title}
          </Text>
          <Text style={[styles.description, isLocked && styles.descriptionLocked]}>
            {lesson.description}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
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
  cardCompleted: {
    borderWidth: 2,
    borderColor: '#34C759',
  },
  cardLocked: {
    opacity: 0.6,
  },
  cardGradient: {
    padding: 20,
    minHeight: 160,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  icon: {
    fontSize: 48,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#34C759',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lockContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  lockIcon: {
    fontSize: 24,
  },
  xpBadge: {
    backgroundColor: '#FF7B2B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleLocked: {
    color: '#999999',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  descriptionLocked: {
    color: '#999999',
  },
});













