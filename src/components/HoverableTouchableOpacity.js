import React, { useState, useRef, useEffect } from 'react';
import { TouchableOpacity, Platform, Animated } from 'react-native';

/**
 * Composant TouchableOpacity avec effet hover pour web
 * Sur mobile, se comporte comme un TouchableOpacity normal
 * Sur web, ajoute un effet hover avec scale très léger et animation fluide
 */
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function HoverableTouchableOpacity({
  children,
  style,
  hoverStyle,
  onPress,
  activeOpacity = 0.8,
  disabled = false,
  variant = 'button', // 'icon' ou 'button'
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [, forceUpdate] = useState(0); // Force re-render when animation changes

  // Scale très léger pour les boutons (les icônes n'ont pas de scale, seulement le fond subtil)
  const targetScale = 1.02;

  // Listener pour forcer le re-render quand l'animation change (nécessaire pour useNativeDriver)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const listenerId = scaleAnim.addListener(() => {
        // Force un re-render pour que le style animé soit appliqué
        forceUpdate(prev => prev + 1);
      });
      return () => {
        scaleAnim.removeListener(listenerId);
      };
    }
  }, [scaleAnim]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      Animated.timing(scaleAnim, {
        toValue: isHovered ? targetScale : 1,
        duration: 350, // Animation plus lente et fluide (350ms)
        useNativeDriver: true,
      }).start();
    }
  }, [isHovered, scaleAnim, targetScale]);

  // Extraire le borderRadius du style pour le préserver (important pour les ronds)
  const getBorderRadius = () => {
    if (!style) return undefined;
    
    if (Array.isArray(style)) {
      // Chercher dans tous les styles du tableau
      for (const s of style) {
        if (s && typeof s === 'object' && s.borderRadius !== undefined) {
          return s.borderRadius;
        }
      }
      return undefined;
    }
    
    if (typeof style === 'object' && style.borderRadius !== undefined) {
      return style.borderRadius;
    }
    
    return undefined;
  };

  const borderRadius = getBorderRadius();

  // Sur web, ajouter les handlers de hover
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  // Utiliser AnimatedTouchableOpacity sur web pour l'animation, TouchableOpacity normal sur mobile
  const TouchableComponent = Platform.OS === 'web' ? AnimatedTouchableOpacity : TouchableOpacity;

  // Construire le style animé pour web - DOIT être le dernier pour écraser tout transform existant
  const animatedStyle = Platform.OS === 'web' ? {
    // Pour les icônes : seulement le fond subtil, pas de scale
    // Pour les boutons et ronds de modules : scale + fond subtil + shadow renforcée
    ...(variant !== 'icon' && {
      transform: [{ scale: scaleAnim }],
    }),
    // Préserver le borderRadius si défini pour éviter que les ronds deviennent des carrés
    ...(borderRadius !== undefined && { borderRadius }),
    // Ajouter un fond subtil au survol pour les icônes
    ...(variant === 'icon' && isHovered && !disabled && {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    }),
    // Renforcer l'ombre au hover pour les boutons et modules
    ...(variant === 'button' && isHovered && !disabled && {
      boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.5)',
      elevation: 12,
    }),
    // Transition pour toutes les propriétés
    transition: 'all 0.35s cubic-bezier(0.25, 1.0, 0.5, 1.0)',
  } : {};

  // Extraire le transform du style original s'il existe pour éviter les conflits
  const extractNonTransformStyles = (styleInput) => {
    if (!styleInput) return {};
    if (Array.isArray(styleInput)) {
      const merged = {};
      styleInput.forEach(s => {
        if (s && typeof s === 'object') {
          Object.keys(s).forEach(key => {
            if (key !== 'transform') {
              merged[key] = s[key];
            }
          });
        }
      });
      return merged;
    }
    if (typeof styleInput === 'object') {
      const { transform, ...rest } = styleInput;
      return rest;
    }
    return {};
  };

  const baseStyle = extractNonTransformStyles(style);

  const finalStyle = Platform.OS === 'web' ? [
    baseStyle,
    animatedStyle, // animatedStyle en dernier pour garantir que le transform animé est appliqué
  ] : [style];

  return (
    <TouchableComponent
      {...props}
      {...webProps}
      onPress={onPress}
      activeOpacity={activeOpacity}
      disabled={disabled}
      style={finalStyle}
    >
      {children}
    </TouchableComponent>
  );
}



