import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { getOnboardingImageTextSizes, isNarrow } from '../Onboarding/onboardingConstants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { theme } from '../../styles/theme';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { getUserProgress } from '../../lib/userProgressSupabase';
import { prefetchDynamicModulesSafe } from '../../services/prefetchDynamicModulesSafe';
// Secteur verrouillé : UNIQUEMENT progress.activeDirection (quiz secteur), pas de dérivation.

function messageForPrefetchError(err) {
  const code = err?.code ?? '';
  const status = err?.status;
  if (code === 'AI_DISABLED' || status === 503) return 'IA désactivée (AI_ENABLED=false). Réessaie plus tard.';
  if (code === 'QUOTA_EXCEEDED' || status === 429) return 'Quota dépassé, réessaie demain.';
  if (status >= 500) return 'Erreur IA/DB, réessaie.';
  return err?.message ?? 'Génération indisponible. Réessayez.';
}


/**
 * Image : à placer manuellement dans assets/onboarding/metier_defini.png
 */
const IMAGE_SOURCE = require('../../../assets/onboarding/metier_defini.png');

/**
 * Écran "Ton métier défini"
 * Affiché après le résultat du quiz métier (PropositionMetier).
 * Header avec nom du métier en dégradé, texte secondaire, image, bouton "COMMENCER LA VÉRIFICATION".
 */
export default function TonMetierDefiniScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const textSizes = getOnboardingImageTextSizes(width);
  const metierName = (route.params?.metierName || 'TRADER').toString().toUpperCase().trim();
  const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;
  const BTN_WIDTH = Math.min(width * 0.76, 400);

  const [prefetchError, setPrefetchError] = useState(null);
  const prefetchTriggeredRef = useRef(false);
  const mountedRef = useRef(true);

  const runPrefetch = useCallback(() => {
    if (prefetchTriggeredRef.current) {
      if (__DEV__) console.warn('[TonMetierDefini] prefetch skip: déjà déclenché une fois pour ce montage');
      return;
    }
    setPrefetchError(null);
    prefetchTriggeredRef.current = true;
    getUserProgress().then((progress) => {
      if (!mountedRef.current) return;
      const sectorId =
        typeof progress?.activeDirection === 'string' && progress.activeDirection.trim()
          ? progress.activeDirection.trim()
          : null;
      const jobTitle = (progress?.activeMetier && typeof progress.activeMetier === 'string') ? progress.activeMetier.trim() : null;
      if (!sectorId || !jobTitle) {
        if (__DEV__) console.warn('[TonMetierDefini] prefetch skip: sectorId ou jobTitle manquant', { sectorId, jobTitle: jobTitle ?? null });
        return;
      }
      void prefetchDynamicModulesSafe(sectorId, jobTitle, 'v1').then((result) => {
        if (!mountedRef.current) return;
        if (result && !result.ok && result.error !== 'PREFETCH_SKIPPED' && result.error !== 'PREFETCH_ABORTED') {
          setPrefetchError(result?.message ?? 'Génération indisponible. Réessayez.');
        }
      }).catch((e) => {
        if (!mountedRef.current) return;
        console.warn('[TonMetierDefini] prefetch failed:', e?.message ?? e);
        setPrefetchError(messageForPrefetchError(e));
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    runPrefetch();
    return () => { mountedRef.current = false; };
  }, [runPrefetch]);

  const headerPrefix = "TON MÉTIER DÉFINI EST DONC ";
  const subtitleText =
    "Mais avant de commencer ton chemin vers l'atteinte de cet objectif, on va d'abord vérifier si ce métier te correspond vraiment.";

  const handleStart = () => {
    navigation.replace('CheckpointsValidation');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, width >= 1100 && { marginTop: -24 }, isNarrow(width) && { marginTop: -16 }]}>
        {/* Titre : préfixe blanc ; nom du métier dégradé #FF7B2B → #FFD93F */}
        <View style={[styles.titleContainer, { maxWidth: width * textSizes.textMaxWidth }]}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>{headerPrefix}</Text>
              {Platform.OS === 'web' ? (
              <Text
                style={[
                  styles.titleMetier,
                  {
                    fontSize: textSizes.titleFontSize,
                    lineHeight: textSizes.titleLineHeight,
                    backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  },
                ]}
              >
                {metierName}
              </Text>
            ) : (
                <MaskedView
                maskElement={<Text style={[styles.titleMetier, styles.gradientText, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>{metierName}</Text>}
              >
                <LinearGradient
                  colors={['#FF7B2B', '#FFD93F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientContainer}
                >
                  <Text style={[styles.titleMetier, styles.transparentText, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>{metierName}</Text>
                </LinearGradient>
              </MaskedView>
            )}
            </View>
          </View>

          {/* Texte secondaire — dégradé #FF7B2B → #FFD93F, centré, largeur maîtrisée */}
          <View style={[styles.subtitleContainer, { maxWidth: width * textSizes.textMaxWidth }]}>
            {Platform.OS === 'web' ? (
              <Text
              style={[
                styles.subtitle,
                {
                  fontSize: textSizes.subtitleFontSize,
                  lineHeight: textSizes.subtitleLineHeight,
                  backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  },
                ]}
              >
                {subtitleText}
              </Text>
            ) : (
              <MaskedView
                maskElement={
                  <Text style={[styles.subtitle, styles.gradientText, { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight }]}>{subtitleText}</Text>
                }
              >
                <LinearGradient
                  colors={['#FF7B2B', '#FFD93F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientContainer}
                >
                  <Text style={[styles.subtitle, styles.transparentText, { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight }]}>{subtitleText}</Text>
                </LinearGradient>
              </MaskedView>
            )}
          </View>

          <Image
            source={IMAGE_SOURCE}
            style={[styles.illustration, { width: IMAGE_SIZE, height: IMAGE_SIZE }]}
            resizeMode="contain"
          />

        {prefetchError ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorText}>{prefetchError}</Text>
            <TouchableOpacity style={[styles.retryButton, { width: Math.min(BTN_WIDTH * 0.6, 220) }]} onPress={runPrefetch}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <HoverableTouchableOpacity
          style={[styles.button, { width: BTN_WIDTH }]}
          onPress={handleStart}
          activeOpacity={0.85}
          variant="button"
        >
          <Text style={styles.buttonText}>COMMENCER LA VÉRIFICATION</Text>
        </HoverableTouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1B23',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  titleMetier: {
    fontFamily: theme.fonts.title,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitleContainer: {
    marginTop: 6,
    marginBottom: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    textAlign: 'center',
  },
  gradientText: {},
  gradientContainer: {},
  transparentText: { opacity: 0 },
  illustration: {
    marginVertical: 16,
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#FF7B2B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontFamily: theme.fonts.title,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    ...theme.buttonTextNoWrap,
  },
  errorBlock: {
    marginTop: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: '#FFB347',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: 'rgba(255,123,43,0.9)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  retryButtonText: {
    fontFamily: theme.fonts.title,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
