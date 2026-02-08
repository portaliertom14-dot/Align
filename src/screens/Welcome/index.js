import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';

/**
 * ÉCRAN 1 — ÉCRAN D'ACCUEIL (ENTRY / INDEX)
 * Sans header ni flèche retour (demandé A).
 *
 * FIX SHRINK GLOBAL (web): Sur web, on utilise window.innerWidth/innerHeight directement
 * car Dimensions/useWindowDimensions peut retourner des valeurs incorrectes (visualViewport,
 * scale, etc.). Sur natif, on garde useWindowDimensions.
 */
function useWebDimensions() {
  const rnDims = useWindowDimensions();
  const [webDims, setWebDims] = useState(() =>
    typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : null
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () =>
      setWebDims({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return Platform.OS === 'web' && webDims ? webDims : rnDims;
}

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const { width, height } = useWebDimensions();

  // Calculés à partir des dimensions réelles (réactives au resize)
  const BTN_WIDTH = Math.min(width * 0.76, 400);
  const logoSize = Math.min(width * 0.65, 400);

  // [DEBUG SHRINK] Instrumentation — valeurs au runtime (à supprimer après fix confirmé)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const raw = {
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      rootOffsetWidth: document.getElementById('root')?.offsetWidth,
    };
    console.log('[Welcome DEBUG] width=', width, 'height=', height, 'logo=', logoSize, 'btn=', BTN_WIDTH);
    console.log('[Welcome DEBUG] raw DOM:', raw);
  }, [width, height, logoSize, BTN_WIDTH]);

  // [DEBUG] Bandeau visible quand ?debug=1 en URL (à supprimer après fix)
  const showDebug =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location?.search || '').get('debug') === '1';
  const logoFontSize = Math.min(width * 0.18, 80);
  const mainFontSize = Math.min(width * 0.055, 24);
  const mainLineHeight = Math.min(width * 0.075, 34);

  const handleStart = () => {
    navigation.navigate('Choice');
  };

  return (
    <LinearGradient
      colors={['#FF7B2B', '#FF9B35', '#FFBC3F', '#FFD93F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo Align avec étoile en arrière-plan */}
        <View
          style={[
            styles.logoContainer,
            {
              width: logoSize,
              height: logoSize,
              marginBottom: height * 0.08,
            },
          ]}
        >
          {/* Étoile en arrière-plan avec opacité 50% */}
          <Image
            source={require('../../../assets/icons/star.png')}
            style={styles.starImage}
            resizeMode="contain"
          />
          {/* Texte ALIGN au premier plan */}
          <Text style={[styles.logoText, { fontSize: logoFontSize }]}>ALIGN</Text>
        </View>

        {/* Texte principal */}
        <Text
          style={[
            styles.mainText,
            {
              fontSize: mainFontSize,
              marginBottom: height * 0.06,
              lineHeight: mainLineHeight,
            },
          ]}
        >
          TROUVE LA VOIE QUI TE CORRESPOND VRAIMENT
        </Text>

        {/* Bouton principal */}
        <HoverableTouchableOpacity
          style={[styles.button, { width: BTN_WIDTH }]}
          onPress={handleStart}
          activeOpacity={0.85}
          variant="button"
        >
          <Text style={styles.buttonText}>COMMENCER</Text>
        </HoverableTouchableOpacity>

        {showDebug && (
          <View style={styles.debugBanner}>
            <Text style={styles.debugText} selectable>
              DEBUG: w={width} h={height} logo={Math.min(width * 0.65, 400)} btn={BTN_WIDTH}
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    flexShrink: 0,
    alignSelf: 'stretch',
    minWidth: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    maxWidth: 400,
    maxHeight: 400,
  },
  starImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.5, // Opacité 50% comme spécifié
  },
  logoText: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    letterSpacing: 2,
  },
  mainText: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 16,
    opacity: 1,
  },
  button: {
    backgroundColor: '#FF7B2B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  debugBanner: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 12,
    borderRadius: 8,
  },
  debugText: {
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  buttonText: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
    ...theme.buttonTextNoWrap,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
