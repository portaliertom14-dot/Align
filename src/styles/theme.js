import { Platform } from 'react-native';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Shadow style compatible avec la dépréciation shadow* : sur web utilise boxShadow, sur natif garde shadow*. */
export function shadowStyle({ color = '#000', width = 0, height = 4, opacity = 0.25, radius = 8 } = {}) {
  if (Platform.OS === 'web') {
    const colorRgba = color.startsWith('#') ? hexToRgba(color, opacity) : color;
    return { boxShadow: `${width}px ${height}px ${radius}px ${colorRgba}` };
  }
  return { shadowColor: color, shadowOffset: { width, height }, shadowOpacity: opacity, shadowRadius: radius };
}

/** Text shadow : sur web utilise textShadow, sur natif garde textShadow*. */
export function textShadowStyle({ color = 'rgba(0,0,0,0.3)', width = 0, height = 1, radius = 3 } = {}) {
  if (Platform.OS === 'web') {
    return { textShadow: `${width}px ${height}px ${radius}px ${color}` };
  }
  return { textShadowColor: color, textShadowOffset: { width, height }, textShadowRadius: radius };
}

/**
 * Design System Align
 * Polices officielles : Bowlby One SC (titres) + Nunito Black (boutons)
 * Palette de couleurs : bleu (#00AAFF → #00012F) et orange (#FF7B2B → #FFA36B)
 */

export const theme = {
  // === POLICES OFFICIELLES ALIGN ===
  fonts: {
    // Bowlby One SC : Titres principaux, messages forts, écrans clés
    // Fallback sur web si la font n'est pas chargée
    title: Platform.select({
      web: 'Bowlby One SC, Impact, Arial Black, sans-serif',
      default: 'BowlbyOneSC_400Regular',
    }),
    // Nunito Black : Boutons, CTA, éléments gamifiés (XP, badges, chiffres)
    // Variante la plus grasse de Nunito (900 weight)
    button: Platform.select({
      web: 'Nunito Black, Nunito, Arial, sans-serif',
      default: 'Nunito_900Black',
    }),
    // Police par défaut pour le body
    body: 'System',
    // Ruluko : pour les autres textes (onboarding, etc.)
    ruluko: Platform.select({
      web: 'Ruluko, Arial, sans-serif',
      default: 'System', // Ruluko n'est pas disponible via @expo-google-fonts, utiliser System en fallback
    }),
  },
  
  colors: {
    // Palette principale Align
    primary: '#2563eb',
    primaryDark: '#1e3a8a',
    secondary: '#ff7a00',
    
    // Gradients officiels Align
    gradient: {
      // Fond unifié pour backgrounds de pages clés
      align: ['#151B2B', '#151B2B'],
      // Dégradé orange pour boutons CTA
      buttonOrange: ['#FF7B2B', '#FFA36B'],
      // Anciens gradients (maintenus pour compatibilité)
      primary: ['#2563eb', '#1e3a8a'],
      secondary: ['#ff7a00', '#ff9500'],
    },
    
    // Couleurs de texte
    text: {
      primary: '#FFFFFF',
      secondary: '#E0E0E0',
      dark: '#000000',
      light: '#F5F5F5',
    },
    
    // Couleurs de base
    background: '#27273B', // Fond global de toutes les pages
    backgroundOld: '#FFFFFF', // Ancien fond (maintenu pour compatibilité)
    surface: '#F5F5F5',
    border: '#E0E0E0',
    
    // États
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#0A84FF',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  typography: {
    // Titres avec Bowlby One SC
    h1: {
      fontSize: 32,
      fontFamily: Platform.select({
        web: 'Bowlby One SC, Impact, Arial Black, sans-serif',
        default: 'BowlbyOneSC_400Regular',
      }),
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    h2: {
      fontSize: 24,
      fontFamily: Platform.select({
        web: 'Bowlby One SC, Impact, Arial Black, sans-serif',
        default: 'BowlbyOneSC_400Regular',
      }),
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    h3: {
      fontSize: 20,
      fontFamily: Platform.select({
        web: 'Bowlby One SC, Impact, Arial Black, sans-serif',
        default: 'BowlbyOneSC_400Regular',
      }),
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    // Boutons avec Nunito Black — anti-wrap pour éviter texte vertical/cassé
    button: {
      fontSize: 18,
      fontFamily: Platform.select({
        web: 'Nunito Black, Nunito, Arial, sans-serif',
        default: 'Nunito_900Black',
      }),
      color: '#FFFFFF',
      letterSpacing: 1,
      fontWeight: '900',
      ...(Platform.OS === 'web' && { whiteSpace: 'nowrap', overflow: 'hidden' }),
    },
    // Body avec police système
    body: {
      fontSize: 16,
      fontFamily: 'System',
      fontWeight: '400',
      color: '#FFFFFF',
    },
    caption: {
      fontSize: 14,
      fontFamily: 'System',
      fontWeight: '400',
      color: '#E0E0E0',
    },
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999, // Pour les boutons pill-shaped
  },
  
  // Anti-wrap pour texte des boutons (à spread dans les buttonText customs)
  buttonTextNoWrap: Platform.OS === 'web' ? { whiteSpace: 'nowrap', overflow: 'hidden' } : {},

  // === RÈGLES UI ALIGN ===
  ui: {
    // Boutons
    button: {
      borderRadius: 999,
      paddingVertical: 18,
      paddingHorizontal: 32,
      ...shadowStyle({ color: '#FF7B2B', height: 4, opacity: 0.3, radius: 8 }),
      elevation: 5,
    },
    // Cards
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      ...shadowStyle({ height: 2, opacity: 0.1, radius: 8 }),
      elevation: 3,
    },
  },
};
