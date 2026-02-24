/**
 * RÈGLE ABSOLUE (priorité sur toute modification)
 * Le rendu final DOIT être visuellement IDENTIQUE à l’image “visuel souhaité”.
 * Aucune réinterprétation, aucune variation de layout, de tailles ou de hiérarchie.
 * Si un doute existe, toujours se référer au visuel souhaité.
 */
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  ScrollView,
  useWindowDimensions,
  Platform,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import { useQuiz } from '../../context/QuizContext';
import { analyzeSector } from '../../services/analyzeSector';
import { questions } from '../../data/questions';
import { setActiveDirection, updateUserProgress } from '../../lib/userProgress';
import { setActiveDirection as setActiveDirectionSupabase } from '../../lib/userProgressSupabase';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import GradientText from '../../components/GradientText';
import AlignLoading from '../../components/AlignLoading';
import { theme } from '../../styles/theme';
import { SECTOR_NAMES } from '../../lib/sectorAlgorithm';

const starIcon = require('../../../assets/icons/star.png');

/** Mock preview : ?mock=1 ou EXPO_PUBLIC_PREVIEW_RESULT / VITE_PREVIEW_RESULT = true */
function useMockPreview() {
  const [mock, setMock] = useState(false);
  useEffect(() => {
    let isMock = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && /[?&]mock=1/.test(window.location?.search || '')) isMock = true;
    if (typeof process !== 'undefined' && (process.env?.EXPO_PUBLIC_PREVIEW_RESULT === 'true' || process.env?.VITE_PREVIEW_RESULT === 'true')) isMock = true;
    setMock(isMock);
  }, []);
  return mock;
}

/** Liste officielle Align — 16 secteurs */
const SECTOR_ICONS = {
  ingenierie_tech: '🔧',
  data_ia: '💻',
  creation_design: '🎨',
  communication_medias: '📢',
  business_entrepreneuriat: '💼',
  finance_audit: '💰',
  droit_justice: '⚖️',
  defense_securite: '🛡️',
  sante_medical: '🏥',
  sciences_recherche: '🔬',
  education_transmission: '📚',
  architecture_urbanisme: '🏛️',
  industrie_production: '🏭',
  sport_performance: '⚡',
  social_accompagnement: '🤝',
  environnement_energie: '🌱',
};

const SECTOR_TAGLINES = {
  ingenierie_tech: 'CONCEVOIR, OPTIMISER, CONSTRUIRE',
  data_ia: 'ANALYSER, INNOVER, DÉCIDER',
  creation_design: 'CRÉER, IMAGINER, EXPRIMER',
  communication_medias: 'COMMUNIQUER, INFLUENCER, RÉSEAUTER',
  business_entrepreneuriat: 'NÉGOCIER, DÉVELOPPER, CONVAINCRE',
  finance_audit: 'GÉRER, DÉCIDER, PRENDRE DES RISQUES',
  droit_justice: 'DÉFENDRE, ANALYSER, ARGUMENTER',
  defense_securite: 'PROTÉGER, SÉCURISER, RÉAGIR',
  sante_medical: 'SOIGNER, ÉCOUTER, DIAGNOSTIQUER',
  sciences_recherche: 'EXPÉRIMENTER, PUBLIER, INNOVER',
  education_transmission: 'ENSEIGNER, TRANSMETTRE, ACCOMPAGNER',
  architecture_urbanisme: 'CONCEVOIR, DESSINER, BÂTIR',
  industrie_production: 'PRODUIRE, OPTIMISER, INDUSTRIALISER',
  sport_performance: 'PERFORMER, ENTRAÎNER, DÉPASSER',
  social_accompagnement: 'ACCOMPAGNER, ÉCOUTER, SOUTENIR',
  environnement_energie: 'PRÉSERVER, TRANSITIONNER, INNOVER',
};

const MOCK_RESULT = {
  secteurId: 'finance_audit',
  secteurName: 'Finance & Audit',
  sectorName: 'FINANCE & AUDIT',
  tagline: 'GÉRER, DÉCIDER, PRENDRE DES RISQUES',
  sectorDescription:
    "Tu aimes les chiffres, gérer les finances et créer des solutions concrètes grâce à ton expertise. Le secteur de la finance te correspond donc à merveille !",
  icon: '💰',
};

function getIconForSector(sectorResult) {
  if (sectorResult?.icon) return sectorResult.icon;
  const id = (sectorResult?.secteurId || '').toLowerCase();
  const name = (sectorResult?.secteurName || '').toLowerCase();
  return SECTOR_ICONS[id] ?? SECTOR_ICONS[name] ?? '💼';
}

function getTaglineForSector(sectorResult) {
  const id = (sectorResult?.secteurId || sectorResult?.sectorName || '').toLowerCase().replace(/\s+/g, '_');
  return SECTOR_TAGLINES[id] ?? SECTOR_TAGLINES[sectorResult?.secteurId] ?? 'EXPLORER, APPRENDRE, RÉUSSIR';
}

const FALLBACK_SECTOR_ID = 'ingenierie_tech';

/** Ne jamais exposer 'undetermined' dans la liste affichée. */
function sanitizeSectorId(id) {
  if (typeof id === 'string' && id.length > 0 && id !== 'undetermined') return id;
  return FALLBACK_SECTOR_ID;
}

/** Normalise le classement secteur (sectorRanked / top2) en liste [{ id, name, description }]. */
function buildRankedList(sectorResult) {
  const raw = sectorResult?.sectorRanked ?? sectorResult?.top2 ?? [];
  const arr = Array.isArray(raw) ? raw : [];
  if (arr.length === 0) {
    const id = sanitizeSectorId(sectorResult?.secteurId ?? sectorResult?.pickedSectorId ?? FALLBACK_SECTOR_ID);
    const name = sectorResult?.secteurName ?? SECTOR_NAMES[id] ?? id;
    return [{ id, name, description: sectorResult?.description ?? '' }];
  }
  return arr.map((item, i) => {
    const rawId = typeof item === 'object' && item != null ? (item.id ?? item.secteurId ?? item.pickedSectorId) : String(item ?? '');
    const id = sanitizeSectorId(rawId || `sector_${i}`);
    const name = typeof item === 'object' && item != null ? (item.name ?? item.secteurName ?? SECTOR_NAMES[id]) : SECTOR_NAMES[id] ?? id;
    const description = typeof item === 'object' && item != null ? (item.description ?? '') : '';
    return { id, name: name || id, description };
  });
}

function buildResultDataFromRankedItem(rankedItem, isMock) {
  if (isMock) {
    return {
      sectorName: MOCK_RESULT.sectorName,
      sectorDescription: MOCK_RESULT.sectorDescription,
      icon: MOCK_RESULT.icon,
      tagline: MOCK_RESULT.tagline,
    };
  }
  if (!rankedItem) return null;
  const id = rankedItem.id || rankedItem.secteurId || 'ingenierie_tech';
  return {
    sectorName: (rankedItem.name || rankedItem.secteurName || SECTOR_NAMES[id] || id).toUpperCase(),
    sectorDescription:
      rankedItem.description ||
      'Tu aimes résoudre des problèmes et créer des solutions concrètes grâce à ton expertise.',
    icon: SECTOR_ICONS[id] ?? SECTOR_ICONS[id.toLowerCase?.()] ?? '💼',
    tagline: getTaglineForSector({ secteurId: id }),
  };
}

function buildResultData(sectorResult, isMock) {
  if (isMock) {
    return {
      sectorName: MOCK_RESULT.sectorName,
      sectorDescription: MOCK_RESULT.sectorDescription,
      icon: MOCK_RESULT.icon,
      tagline: MOCK_RESULT.tagline,
    };
  }
  if (!sectorResult) return null;
  return {
    sectorName: (sectorResult.secteurName || sectorResult.sectorName || 'Tech').toUpperCase(),
    sectorDescription:
      sectorResult.description ||
      sectorResult.justification ||
      sectorResult.explanation ||
      'Tu aimes résoudre des problèmes et créer des solutions concrètes grâce à ton expertise.',
    icon: getIconForSector(sectorResult),
    tagline: getTaglineForSector(sectorResult),
  };
}

function getCardWidth(width) {
  if (width <= 600) return Math.min(width * 0.92, 520);
  if (width <= 900) return 640;
  return Math.min(820, width * 0.75);
}

/** clamp-like for font size */
function clampSize(min, preferred, max) {
  return Math.min(max, Math.max(min, preferred));
}

export default function ResultatSecteurScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute();
  const precomputedResult = route.params?.sectorResult;
  const sectorDescriptionTextFromParams = route.params?.sectorDescriptionText;
  const sectorIdFromParams = (precomputedResult?.secteurId ?? precomputedResult?.sectorId ?? '').trim();
  if (__DEV__) console.log('[SECTOR_UI_RENDER] id', sectorIdFromParams);
  const { answers } = useQuiz();
  const [sectorResult, setSectorResult] = useState(precomputedResult ?? null);
  const [loading, setLoading] = useState(typeof precomputedResult === 'undefined');
  const [loadingMessage, setLoadingMessage] = useState('Analyse de tes réponses...');
  /** Index dans le classement déjà calculé (0 = top1, 1 = top2, …). Cycle sans recalcul. */
  const [regenIndex, setRegenIndex] = useState(0);
  const mockPreview = useMockPreview();
  const cardAnim = useRef(new Animated.Value(0)).current;
  const didRunRef = useRef(!!precomputedResult);
  const loadingMessageTimerRef = useRef(null);
  const forcedPolyvalent = sectorResult?.forcedPolyvalent === true;

  const isMock = mockPreview;
  const ranked = useMemo(() => buildRankedList(sectorResult), [sectorResult]);
  const displayedRankedItem = ranked[regenIndex % Math.max(1, ranked.length)] ?? ranked[0] ?? null;
  const resultData = useMemo(
    () => (isMock ? buildResultData(null, true) : buildResultDataFromRankedItem(displayedRankedItem, false)),
    [isMock, displayedRankedItem]
  );
  useEffect(() => {
    if (isMock) console.log('[ResultatSecteur] MODE MOCK — aucun appel IA (mock=1 ou EXPO_PUBLIC_PREVIEW_RESULT=true)');
  }, [isMock]);

  useEffect(() => {
    if (isMock) {
      setLoading(false);
      return;
    }
    if (precomputedResult) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[FAST_PATH] ResultatSecteur precomputed');
      setSectorResult(precomputedResult);
      setLoading(false);
      didRunRef.current = true;
      if (precomputedResult.secteurId && precomputedResult.secteurId !== 'undetermined') {
        setActiveDirection(precomputedResult.secteurId).catch(() => {});
        setActiveDirectionSupabase(precomputedResult.secteurId).catch(() => {});
      }
      const sectorContext = precomputedResult?.debug?.extractedAI ?? precomputedResult?.debug?.extracted ?? null;
      updateUserProgress({ activeSectorContext: sectorContext }).catch(() => {});
      return;
    }
    if (!answers || Object.keys(answers).length === 0) {
      setLoading(false);
      return;
    }
    if (didRunRef.current) return;
    didRunRef.current = true;

    loadingMessageTimerRef.current = setTimeout(() => {
      setLoadingMessage('On affine ton profil...');
    }, 8000);

    const runAnalyzeSector = async () => {
      try {
        await updateUserProgress({ quizAnswers: answers });
        const result = await analyzeSector(answers, questions);
        setSectorResult(result);
        if (result.secteurId && result.secteurId !== 'undetermined') {
          await setActiveDirection(result.secteurId);
          await setActiveDirectionSupabase(result.secteurId).catch(() => {});
        }
        const sectorContext = result?.debug?.extractedAI ?? result?.debug?.extracted ?? null;
        await updateUserProgress({ activeSectorContext: sectorContext }).catch(() => {});
      } catch (error) {
        console.error('Erreur lors de l\'analyse du secteur:', error);
        alert(`Erreur: ${error.message}`);
        didRunRef.current = false;
      } finally {
        if (loadingMessageTimerRef.current) clearTimeout(loadingMessageTimerRef.current);
        setLoading(false);
      }
    };
    runAnalyzeSector();
    return () => {
      if (loadingMessageTimerRef.current) clearTimeout(loadingMessageTimerRef.current);
    };
  }, [answers, isMock, precomputedResult]);

  useEffect(() => {
    if (!resultData) return;
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [resultData]);

  const handleRegenerateSector = () => {
    if (isMock || ranked.length === 0) return;
    const fromId = displayedRankedItem?.id ?? '';
    const nextIndex = (regenIndex + 1) % ranked.length;
    setRegenIndex(nextIndex);
    const toItem = ranked[nextIndex];
    const toId = toItem?.id ?? '';
    if (typeof console !== 'undefined' && console.log) {
      console.log('[SECTOR_REGEN]', { fromId, toId, regenIndex: nextIndex, rankedIds: ranked.map((r) => r.id) });
    }
  };

  if (loading || !resultData) {
    return <AlignLoading subtitle={loadingMessage} />;
  }

  const cardWidth = getCardWidth(width);
  const titleSize = clampSize(14, width * 0.038, 20);
  const sectorNameSize = clampSize(22, width * 0.06, 32);
  const taglineSize = clampSize(14, width * 0.038, 19);
  const descSize = clampSize(13, width * 0.035, 16);
  const buttonTextSize = clampSize(16, width * 0.042, 19);

  if (sectorResult?.secteurId === 'undetermined') {
    return (
      <View style={styles.container}>
        <View style={styles.errorBackBlock}>
          <Text style={styles.errorBackText}>Résultat indisponible pour le moment.</Text>
          <TouchableOpacity style={styles.errorBackButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.errorBackButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Petit message si secteur choisi malgré profil polyvalent (jamais "secteur non déterminé") */}
        {forcedPolyvalent && (
          <View style={styles.polyvalentBanner}>
            <Text style={styles.polyvalentBannerText}>
              {sectorResult?.description || `Ton profil est polyvalent, mais le secteur le plus cohérent reste : ${(sectorResult?.secteurName || sectorResult?.sectorName || '').toUpperCase()}.`}
            </Text>
          </View>
        )}

        {/* Étoile partiellement derrière le badge (50% visible au-dessus), statique sans animation ni ombre */}
        <View style={styles.starBadgeGroup}>
          <View style={styles.starContainer}>
            <Image source={starIcon} style={styles.starImage} resizeMode="contain" />
          </View>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>RÉSULTAT DÉBLOQUÉ</Text>
            </View>
          </View>
        </View>

        {/* Wrapper card + glow (glow en arrière-plan) */}
        <View style={[styles.cardOuter, { width: cardWidth }]}>
          <View style={[styles.cardGlow, { width: cardWidth }]} />
          <Animated.View
            style={[
              styles.cardWrapper,
              {
                opacity: cardAnim,
                transform: [
                  { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
                ],
              },
            ]}
          >
          <View style={styles.sectorCard}>
            <Text style={[styles.cardTitle, { fontSize: titleSize }]}>CE SECTEUR TE CORRESPOND VRAIMENT</Text>

            {/* Section barres + emoji : [BARRE GAUCHE] — (EMOJI) — [BARRE DROITE] sur UNE ligne */}
            <View style={styles.barresEmojiZone}>
              <View style={styles.barLeft}>
                <LinearGradient
                  colors={['#FF6000', '#FFBB00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.barresEmojiBar}
                />
              </View>
              <Text style={styles.sectorIconEmoji}>{resultData.icon}</Text>
              <View style={styles.barRight}>
                <LinearGradient
                  colors={['#FF6000', '#FFBB00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.barresEmojiBar}
                />
              </View>
            </View>

            {/* Nom du secteur — juste sous barres+emoji, Bobly1SC, gradient inchangé */}
            <View style={styles.sectorNameWrap}>
              <GradientText colors={['#FFBB00', '#FF7B2B']} style={[styles.sectorName, { fontSize: sectorNameSize }]}>
                {resultData.sectorName}
              </GradientText>
            </View>

            {/* Mots-clés / accroche — gradient #FFE479 -> #FF9758, Minito Black */}
            <View style={styles.taglineWrap}>
              {Platform.OS === 'web' ? (
                <Text
                  style={[
                    styles.tagline,
                    {
                      fontSize: taglineSize,
                      backgroundImage: 'linear-gradient(90deg, #FFE479 0%, #FF9758 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                    },
                  ]}
                >
                  {resultData.tagline}
                </Text>
              ) : (
                <MaskedView
                  maskElement={<Text style={[styles.tagline, { fontSize: taglineSize }]}>{resultData.tagline}</Text>}
                >
                  <LinearGradient colors={['#FFE479', '#FF9758']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.taglineGradient}>
                    <Text style={[styles.tagline, styles.taglineTransparent, { fontSize: taglineSize }]}>{resultData.tagline}</Text>
                  </LinearGradient>
                </MaskedView>
              )}
            </View>

            {/* Barre sous texte secondaire — 3px, dégradé #FF6000 → #FFBB00 (même style que barres emoji) */}
            <View style={styles.barUnderTagline}>
              <LinearGradient
                colors={['#FF6000', '#FFBB00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.barUnderTaglineGradient}
              />
            </View>

            {/* Description secteur (toujours depuis params, sans fetch après rendu) */}
            <Text style={[styles.description, { fontSize: descSize }]}>
              {typeof sectorDescriptionTextFromParams === 'string' && sectorDescriptionTextFromParams.trim()
                ? sectorDescriptionTextFromParams.trim()
                : resultData.sectorDescription}
            </Text>

            {/* Barre grise liée au paragraphe (même largeur que le texte) */}
            <View style={styles.separatorUnderDescription} />

            {/* CTA principal — sans bordure, ombre portée douce */}
            <HoverableTouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                const displayedId = displayedRankedItem?.id ?? sectorResult?.secteurId ?? '';
                const displayedName = resultData?.sectorName ?? displayedRankedItem?.name ?? 'Tech';
                navigation.replace('InterludeSecteur', {
                  sectorName: displayedName,
                  sectorId: displayedId,
                  sectorRanked: ranked,
                });
                if (displayedId && displayedId !== 'undetermined') {
                  setActiveDirection(displayedId).catch((e) => {
                    if (typeof console !== 'undefined' && console.warn) console.warn('[ResultatSecteur] setActiveDirection fail', e?.message);
                  });
                  setActiveDirectionSupabase(displayedId).catch((e) => {
                    if (typeof console !== 'undefined' && console.warn) console.warn('[ResultatSecteur] setActiveDirectionSupabase fail', e?.message);
                  });
                }
              }}
              variant="button"
            >
              <LinearGradient colors={['#FF6000', '#FFC005']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
                <Text style={[styles.continueButtonText, { fontSize: buttonTextSize }]}>CONTINUER MON PARCOURS</Text>
              </LinearGradient>
            </HoverableTouchableOpacity>

            {/* CTA secondaire — sans bordure, ombre portée douce */}
            <HoverableTouchableOpacity
              style={styles.regenerateButton}
              onPress={handleRegenerateSector}
              variant="button"
            >
              <Text style={[styles.regenerateButtonText, { fontSize: buttonTextSize }]}>RÉGÉNÉRER</Text>
            </HoverableTouchableOpacity>

            <Text style={styles.regenerateHint}>(Tu peux ajuster si tu ne te reconnais pas totalement)</Text>
          </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#14161D',
  },
  errorBackBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorBackText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: theme.fonts.body,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBackButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(255,123,43,0.9)',
    borderRadius: 24,
  },
  errorBackButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#1A1B23',
    fontWeight: '900',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#FFFFFF', fontFamily: theme.fonts.body },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 40, paddingHorizontal: 20, alignItems: 'center', paddingBottom: 24 },

  polyvalentBanner: {
    alignSelf: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 172, 48, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 172, 48, 0.4)',
  },
  polyvalentBannerText: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFAC30',
    fontWeight: '600',
  },

  starBadgeGroup: {
    alignItems: 'center',
    marginBottom: -28,
    zIndex: 100,
  },
  starContainer: {
    marginBottom: -70,
    zIndex: 0,
  },
  starImage: { width: 140, height: 140 },
  badgeContainer: { zIndex: 101 },
  badge: {
    backgroundColor: '#FFAC30',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  cardOuter: { position: 'relative', alignSelf: 'center', marginBottom: 16, zIndex: 1 },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 32,
    pointerEvents: 'none',
  },
  cardWrapper: { width: '100%' },
  sectorCard: {
    backgroundColor: '#2D3241',
    borderRadius: 32,
    padding: 28,
    paddingTop: 28,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 200px rgba(255, 172, 48, 0.35)',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#FFAC30',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 200,
      shadowOpacity: 0.35,
      elevation: 0,
    }),
  },
  cardTitle: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  barresEmojiZone: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 3,
  },
  barLeft: { flex: 1, height: 3 },
  barRight: { flex: 1, height: 3 },
  barresEmojiBar: { height: 3, borderRadius: 5, flex: 1 },
  sectorIconEmoji: {
    fontSize: 50,
    marginHorizontal: 12,
    textAlign: 'center',
  },
  sectorNameWrap: { marginTop: 3, marginBottom: 3 },
  sectorName: {
    fontFamily: theme.fonts.title,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  taglineWrap: { marginBottom: 6, alignSelf: 'center' },
  tagline: {
    fontFamily: theme.fonts.button,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  taglineTransparent: { opacity: 0 },
  taglineGradient: { paddingHorizontal: 4, minWidth: 200 },
  description: {
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 12,
    maxWidth: '65%',
    alignSelf: 'center',
  },
  barUnderTagline: {
    width: '85%',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 12,
    height: 3,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barUnderTaglineGradient: { height: 3, borderRadius: 5, flex: 1 },
  separatorUnderDescription: {
    height: 3,
    backgroundColor: '#DADADA',
    borderRadius: 5,
    width: '65%',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  continueButton: {
    borderRadius: 999,
    marginBottom: 10,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      shadowOpacity: 0.35,
      elevation: 8,
    }),
  },
  continueButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  continueButtonText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' && { whiteSpace: 'nowrap' }),
  },
  regenerateButton: {
    backgroundColor: '#019AEB',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    marginBottom: 8,
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      shadowOpacity: 0.35,
      elevation: 8,
    }),
  },
  regenerateButtonText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' && { whiteSpace: 'nowrap' }),
  },
  regenerateHint: {
    fontSize: 13,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    opacity: 0.85,
    textAlign: 'center',
  },
});
