/**
 * Header global — délègue à StandardHeader (dimensions strictes : 73px, paddingTop 25, fontSize 25).
 */
import React from 'react';
import { Image, Text } from 'react-native';
import HoverableTouchableOpacity from './HoverableTouchableOpacity';
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
  const settingsButton =
    showSettings && onSettingsPress ? (
      <HoverableTouchableOpacity onPress={onSettingsPress} style={{ padding: 8 }} variant="icon">
        {settingsIcon ? (
          <Image source={settingsIcon} style={{ width: 24, height: 24 }} tintColor="#FFFFFF" resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 24, color: '#FFFFFF' }}>⚙️</Text>
        )}
      </HoverableTouchableOpacity>
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
