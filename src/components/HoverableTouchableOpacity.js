import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Platform } from 'react-native';

/**
 * TouchableOpacity avec effet hover web : .hover-lift (respiration 420ms, translateY -3px + shadow).
 * variant "button" | "breath" = applique .hover-lift sur le wrapper. variant "icon" = aucun hover.
 */
export default function HoverableTouchableOpacity({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  activeOpacity = 0.8,
  disabled = false,
  variant = 'button', // 'icon' | 'button' | 'breath'
  ...props
}) {
  const rootRef = useRef(null);
  const useHoverScale = variant === 'button' || variant === 'breath';

  // Sur web, appliquer .hover-lift sur le wrapper (pas de setState au hover = pure CSS)
  useEffect(() => {
    if (Platform.OS !== 'web' || !useHoverScale) return;
    const apply = () => {
      const node = rootRef.current;
      if (node && typeof node.setAttribute === 'function') {
        const existing = (node.getAttribute('class') || '').trim();
        if (!existing.includes('hover-lift')) node.setAttribute('class', existing ? `${existing} hover-lift` : 'hover-lift');
      }
    };
    const t = setTimeout(apply, 50);
    return () => clearTimeout(t);
  }, [useHoverScale]);

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

  const webProps = Platform.OS === 'web' ? {
    onPressIn: (e) => { onPressIn?.(e); },
    onPressOut: (e) => { onPressOut?.(e); },
    className: 'align-focus-visible',
    tabIndex: disabled ? undefined : 0,
  } : {};

  // Sur web : cursor, borderRadius, et transition en LONGHANDS inline (RN Web écrase la durée si on utilise le shorthand).
  // Preuve log : computed transition était "0s" avec le shorthand → longhands pour que transitionDuration gagne.
  const animatedStyle = Platform.OS === 'web' ? {
    ...(!disabled && { cursor: 'pointer' }),
    ...(borderRadius !== undefined && { borderRadius }),
    ...(useHoverScale && {
      transitionProperty: 'transform, box-shadow',
      transitionDuration: '300ms',
      transitionTimingFunction: 'ease',
    }),
  } : {};

  // Extraire le transform du style original s'il existe pour éviter les conflits.
  // IMPORTANT: Ne jamais utiliser Object.keys() sur un tableau — cela produit des clés "0","1"
  // qui, une fois appliquées au DOM (CSSStyleDeclaration), déclenchent "Cannot set indexed
  // properties on this object". On doit aplatir récursivement les tableaux.
  const extractNonTransformStyles = (styleInput) => {
    if (!styleInput) return {};
    const flatten = (input) => {
      if (!input || typeof input !== 'object') return [];
      if (Array.isArray(input)) return input.flatMap(flatten);
      return [input];
    };
    const flat = flatten(styleInput);
    const merged = {};
    flat.forEach((s) => {
      if (s && typeof s === 'object' && !Array.isArray(s)) {
        Object.keys(s).forEach((key) => {
          if (key !== 'transform') merged[key] = s[key];
        });
      }
    });
    return merged;
  };

  const baseStyle = extractNonTransformStyles(style);

  const finalStyle = Platform.OS === 'web' ? [baseStyle, animatedStyle] : [style];

  return (
    <TouchableOpacity
      ref={rootRef}
      {...props}
      {...webProps}
      onPress={onPress}
      activeOpacity={activeOpacity}
      disabled={disabled}
      style={finalStyle}
    >
      {children}
    </TouchableOpacity>
  );
}



