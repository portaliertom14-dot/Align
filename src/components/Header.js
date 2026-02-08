/**
 * Header global — délègue à StandardHeader (dimensions strictes : 73px, paddingTop 25, fontSize 25).
 */
import React, { useRef, useEffect } from 'react';
import { Image, Text, Platform, TouchableOpacity } from 'react-native';
import StandardHeader from './StandardHeader';

let settingsIcon = null;
try {
  settingsIcon = require('../../assets/icons/settings.png');
} catch (e) {
  settingsIcon = null;
}

let starGearImage = null;
try {
  starGearImage = require('../assets/images/star-gear.png');
} catch (e) {
  starGearImage = null;
}

export default function Header({ showSettings = false, onSettingsPress, settingsOnLeft = false, rightAction: customRightAction = null, rightImage = null, title = 'ALIGN' }) {
  const settingsRef = useRef(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = settingsRef.current;
    if (node && typeof node.setAttribute === 'function') {
      const existing = (node.getAttribute('class') || '').trim();
      if (!existing.includes('nav-item-hover')) node.setAttribute('class', existing ? `${existing} nav-item-hover` : 'nav-item-hover');
    }
  }, [showSettings, onSettingsPress]);

  const settingsButton =
    showSettings && onSettingsPress ? (
      <TouchableOpacity
        ref={settingsRef}
        onPress={onSettingsPress}
        style={{ padding: 10, borderRadius: 9999 }}
        activeOpacity={0.8}
        {...(Platform.OS === 'web' ? { tabIndex: 0 } : {})}
      >
        {settingsIcon ? (
          <Image source={settingsIcon} style={{ width: 24, height: 24 }} tintColor="#FFFFFF" resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 24, color: '#FFFFFF' }}>⚙️</Text>
        )}
      </TouchableOpacity>
    ) : null;
  const rightAction =
    customRightAction ||
    (!settingsOnLeft && settingsButton) ||
    (rightImage && (
      <Image source={rightImage} style={{ width: 260, height: 260 }} resizeMode="contain" />
    ));
  const leftAction = settingsOnLeft ? settingsButton : null;
  return <StandardHeader title={title} leftAction={leftAction || undefined} rightAction={rightAction || undefined} />;
}
