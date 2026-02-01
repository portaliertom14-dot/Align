/**
 * Interlude Checkpoint 3 — non interactif, auto 1.2–2 s puis navigation vers CP3 Q1.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';

const CHECKPOINT_COLOR = '#EC3912';
const INTERLUDE_DURATION_MS = 1500;

export default function Checkpoint3IntroScreen() {
  const navigation = useNavigation();
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      navigation.replace('Checkpoint3Question');
    }, INTERLUDE_DURATION_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>CHECKPOINT</Text>
        <Text style={[styles.number, { color: CHECKPOINT_COLOR }]}>NUMÉRO 3</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  number: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    textAlign: 'center',
  },
});
