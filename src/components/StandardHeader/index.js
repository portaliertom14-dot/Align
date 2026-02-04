/**
 * Header unique réutilisable — mêmes dimensions sur tous les écrans.
 * height: 73px, paddingTop: 25px, title fontSize: 25px.
 */
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../../styles/theme';

export default function StandardHeader({ title = 'ALIGN', leftAction = null, rightAction = null }) {
  return (
    <View style={styles.container}>
      {leftAction != null && <View style={styles.leftAction}>{leftAction}</View>}
      {rightAction != null && <View style={styles.rightAction}>{rightAction}</View>}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 73,
    paddingTop: 25,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 25,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  leftAction: {
    position: 'absolute',
    left: 24,
    top: 25,
    zIndex: 10,
  },
  rightAction: {
    position: 'absolute',
    right: 24,
    top: 25,
    zIndex: 10,
  },
});
