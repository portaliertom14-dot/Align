import React, { useState } from 'react';
import { Text, Platform } from 'react-native';

/**
 * Composant Text avec effet hover pour les liens
 * Change la couleur au survol avec transition
 */
export default function HoverableText({
  children,
  style,
  hoverColor = '#FF7B2B',
  onPress,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Sur web, ajouter les handlers de hover
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  const hoverStyle = Platform.OS === 'web' && isHovered ? {
    color: hoverColor,
    transition: 'color 0.3s ease',
  } : {};

  return (
    <Text
      {...props}
      {...webProps}
      onPress={onPress}
      style={[
        style,
        Platform.OS === 'web' && { transition: 'color 0.3s ease' },
        hoverStyle,
      ]}
    >
      {children}
    </Text>
  );
}
