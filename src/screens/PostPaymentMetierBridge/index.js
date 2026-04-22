import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { theme } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';
import { getOnboardingImageTextSizes, isNarrow } from '../Onboarding/onboardingConstants';
import useStableViewport from '../../hooks/useStableViewport';
import { supabase } from '../../services/supabase';

/**
 * Écran intermédiaire après paiement et avant Quiz Métier.
 * Placeholder image: remplace IMAGE_SOURCE par ton asset final quand disponible.
 */
const IMAGE_SOURCE = require('../../../assets/images/paywall/post-payment-celebration.png');
const DEFAULT_FIRST_NAME = 'TOI';

function getSafeDisplayFirstName(value) {
  if (!value || typeof value !== 'string') return DEFAULT_FIRST_NAME;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_FIRST_NAME;
  const firstToken = trimmed.split(/\s+/).filter(Boolean)[0] || trimmed;
  return firstToken.toUpperCase();
}

function getFirstNameFromEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return null;
  const localPart = email.split('@')[0]?.trim();
  if (!localPart) return null;
  const cleaned = localPart.split(/[._-]/).filter(Boolean)[0] || localPart;
  return cleaned || null;
}

export default function PostPaymentMetierBridgeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { userFirstName, user } = useAuth();
  const { width } = useStableViewport();
  const [dbFirstName, setDbFirstName] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id;
    if (!userId) return undefined;

    const loadFirstName = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('first_name')
          .eq('id', userId)
          .maybeSingle();

        if (cancelled || error) return;
        const candidate = typeof data?.first_name === 'string' ? data.first_name.trim() : '';
        if (candidate) setDbFirstName(candidate);
      } catch (_) {
        // Non bloquant: on garde les autres fallbacks.
      }
    };

    loadFirstName();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const textSizes = getOnboardingImageTextSizes(width);
  const imageSize = Math.min(Math.max(width * 0.24, 300), 430) + 5;
  const firstName = useMemo(
    () =>
      getSafeDisplayFirstName(
        dbFirstName ||
          userFirstName ||
          user?.user_metadata?.first_name ||
          user?.user_metadata?.prenom ||
          user?.user_metadata?.name ||
          getFirstNameFromEmail(user?.email)
      ),
    [dbFirstName, userFirstName, user?.user_metadata?.first_name, user?.user_metadata?.prenom, user?.user_metadata?.name, user?.email]
  );

  const sectorId = route.params?.sectorId ?? '';
  const sectorRanked = Array.isArray(route.params?.sectorRanked) ? route.params.sectorRanked : [];
  const needsDroitRefinement = route.params?.needsDroitRefinement === true;
  const fromCheckoutSuccess = route.params?.fromCheckoutSuccess === true;
  const variantOverride = route.params?.variantOverride;

  const handleContinue = () => {
    navigation.replace('QuizMetier', {
      sectorId,
      sectorRanked,
      needsDroitRefinement,
      fromCheckoutSuccess,
      ...(variantOverride != null ? { variantOverride } : {}),
    });
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.content,
          width >= 1100 && { marginTop: -24 },
          isNarrow(width) && { marginTop: -16 },
          { paddingTop: Math.max(80, insets.top + 48) },
        ]}
      >
        <View style={[styles.titleBlock, { maxWidth: width * textSizes.textMaxWidth }, width >= 1100 && { maxWidth: width * 0.95 }]}>
          {Platform.OS === 'web' ? (
            <Text
              style={[
                styles.mainTitle,
                styles.mainTitleWeb,
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
              FÉLICITATIONS {firstName}, TU AS INVESTI EN TON AVENIR
            </Text>
          ) : (
            <MaskedView
              maskElement={
                <Text
                  style={[
                    styles.mainTitle,
                    {
                      fontSize: textSizes.titleFontSize,
                      lineHeight: textSizes.titleLineHeight,
                    },
                  ]}
                >
                  FÉLICITATIONS {firstName}, TU AS INVESTI EN TON AVENIR
                </Text>
              }
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientMask}
              >
                <Text
                  style={[
                    styles.mainTitle,
                    {
                      fontSize: textSizes.titleFontSize,
                      lineHeight: textSizes.titleLineHeight,
                      opacity: 0,
                    },
                  ]}
                >
                  FÉLICITATIONS {firstName}, TU AS INVESTI EN TON AVENIR
                </Text>
              </LinearGradient>
            </MaskedView>
          )}

          <Text
            style={[
              styles.subtitle,
              {
                fontSize: textSizes.subtitleFontSize,
                lineHeight: textSizes.subtitleLineHeight,
              },
            ]}
          >
            Ton paiement est confirmé. On affine maintenant ton métier exact, c&apos;est la dernière étape. Alors prêt(e) ?
          </Text>
        </View>

        <Image
          source={IMAGE_SOURCE}
          style={[styles.illustration, { width: imageSize, height: imageSize }]}
          resizeMode="contain"
        />

        <HoverableTouchableOpacity
          style={[styles.button, { width: Math.min(width * 0.76, 400) }]}
          onPress={handleContinue}
          activeOpacity={0.85}
          variant="button"
        >
          <Text style={styles.buttonText}>PRÊT(E) !</Text>
        </HoverableTouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
  titleBlock: {
    minHeight: 80,
    alignItems: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    fontFamily: Platform.select({ web: 'Bowlby One SC, cursive', default: 'BowlbyOneSC_400Regular' }),
    textAlign: 'center',
    paddingHorizontal: 2,
    textTransform: 'uppercase',
  },
  mainTitleWeb: {
    marginBottom: 10,
  },
  gradientMask: {},
  subtitle: {
    fontFamily: Platform.select({ web: 'Nunito, sans-serif', default: 'Nunito_900Black' }),
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 6,
  },
  illustration: {
    marginVertical: 16,
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
