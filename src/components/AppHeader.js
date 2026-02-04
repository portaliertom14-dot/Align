/**
 * Header unique Align — délègue à StandardHeader (73px, paddingTop 25, fontSize 25).
 * Utilisé pour une apparence uniforme sur tous les écrans.
 */
import React from 'react';
import { Image, Text, TouchableOpacity } from 'react-native';
import StandardHeader from './StandardHeader';

let settingsIcon = null;
try {
  settingsIcon = require('../../assets/icons/settings.png');
} catch (e) {
  settingsIcon = null;
}

export default function AppHeader({ showSettings = false, onSettingsPress }) {
  const rightAction =
    showSettings && onSettingsPress ? (
      <TouchableOpacity onPress={onSettingsPress} style={{ padding: 8 }} activeOpacity={0.8}>
        {settingsIcon ? (
          <Image source={settingsIcon} style={{ width: 24, height: 24 }} tintColor="#FFFFFF" resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 24, color: '#FFFFFF' }}>⚙️</Text>
        )}
      </TouchableOpacity>
    ) : null;
  return <StandardHeader title="ALIGN" rightAction={rightAction || undefined} />;
}
