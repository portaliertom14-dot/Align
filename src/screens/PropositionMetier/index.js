/**
 * Résultat Métier — MÊME écran que Résultat Secteur.
 * Même structure, mêmes styles, mêmes espacements, couleurs, typographies, ombres.
 * Seuls changent : titre (nom du métier), emoji, textes générés.
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import { useMetierQuiz } from '../../context/MetierQuizContext';
import { analyzeJob } from '../../services/analyzeJob';
import { quizMetierQuestions } from '../../data/quizMetierQuestions';
import { getUserProgress, setActiveMetier, updateUserProgress } from '../../lib/userProgressSupabase';
import { fetchDynamicModules } from '../../services/dynamicModules';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';

const starIcon = require('../../../assets/icons/star.png');

const JOB_ICONS = {
  developpeur: '💻',
  data_scientist: '🔬',
  entrepreneur: '💼',
  designer: '🎨',
  avocat: '⚖️',
  medecin: '🏥',
};
const DEFAULT_TAGLINE = 'EXPLORER, APPRENDRE, RÉUSSIR';

function getCardWidth(width) {
  if (width <= 600) return Math.min(width * 0.92, 520);
  if (width <= 900) return 640;
  return Math.min(820, width * 0.75);
}

function clampSize(min, preferred, max) {
  return Math.min(max, Math.max(min, preferred));
}

function getIconForJob(jobId) {
  if (!jobId) return '💼';
  const id = String(jobId).toLowerCase().replace(/\s+/g, '_');
  return JOB_ICONS[id] ?? '💼';
}

export default function PropositionMetierScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { answers, quizQuestions } = useMetierQuiz();
  const [metierResult, setMetierResult] = useState(null);
  const [secteurId, setSecteurId] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardAnim = useRef(new Animated.Value(0)).current;

  const resultData = useMemo(() => {
    if (!metierResult) return null;
    const name = (metierResult.metierName || 'Métier').toUpperCase();
    return {
      sectorName: name,
      sectorDescription: metierResult.why || metierResult.description || 'Ce métier correspond à ton profil.',
      icon: getIconForJob(metierResult.metierId),
      tagline: DEFAULT_TAGLINE,
    };
  }, [metierResult]);

  useEffect(() => {
    const runAnalyzeJob = async () => {
      try {
        const progress = await getUserProgress();
        const activeSecteurId = progress.activeSerie || progress.activeDirection || 'tech';
        setSecteurId(activeSecteurId);

        const result = await analyzeJob(answers, quizQuestions || quizMetierQuestions);
        setMetierResult({
          metierId: result.jobId,
          metierName: result.jobName,
          why: result.description,
          description: result.description,
          secteurId: activeSecteurId,
        });

        if (result.jobId) {
          await setActiveMetier(result.jobId);
          await updateUserProgress({ activeDirection: activeSecteurId });
          fetchDynamicModules(activeSecteurId, result.jobId, 'v1').catch(() => {});
        }
      } catch (error) {
        console.error('Erreur lors du calcul du métier:', error);
        alert(`Erreur: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (answers && Object.keys(answers).length > 0) {
      runAnalyzeJob();
    } else {
      setLoading(false);
    }
  }, [answers]);

  useEffect(() => {
    if (!resultData) return;
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [resultData]);

  const handleRegenerateMetier = async () => {
    try {
      setLoading(true);
      const progress = await getUserProgress();
      const activeSecteurId = progress.activeDirection || secteurId || 'tech';
      const metiersParSecteur = {
        tech: [
          { id: 'developpeur', nom: 'Développeur logiciel', justification: 'Tu as un profil technique et créatif.' },
          { id: 'data_scientist', nom: 'Data Scientist', justification: 'Ton profil analytique correspond à la science des données.' },
        ],
        business: [{ id: 'entrepreneur', nom: 'Entrepreneur', justification: 'Ton profil dynamique correspond à l\'entrepreneuriat.' }],
        creation: [{ id: 'designer', nom: 'Designer', justification: 'Ton profil créatif correspond au design.' }],
        droit: [{ id: 'avocat', nom: 'Avocat', justification: 'Ton profil argumentatif correspond au métier d\'avocat.' }],
        sante: [{ id: 'medecin', nom: 'Médecin', justification: 'Ton profil empathique et rigoureux correspond à la médecine.' }],
      };
      const metiersDisponibles = metiersParSecteur[activeSecteurId] || metiersParSecteur.tech;
      const currentMetierId = metierResult?.metierId;
      const availableMetiers = metiersDisponibles.filter((m) => m.id !== currentMetierId);
      const randomMetier = availableMetiers[Math.floor(Math.random() * availableMetiers.length)] || metiersDisponibles[0];
      const result = {
        metierId: randomMetier.id,
        metierName: randomMetier.nom,
        description: randomMetier.justification,
        why: randomMetier.justification,
        secteurId: activeSecteurId,
      };
      setMetierResult(result);
      if (result.metierId) {
        await setActiveMetier(result.metierId);
        await updateUserProgress({ activeDirection: activeSecteurId });
        fetchDynamicModules(activeSecteurId, result.metierId, 'v1').catch(() => {});
      }
    } catch (error) {
      console.error('Erreur lors de la régénération:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !resultData) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Calcul de ton métier...</Text>
        </View>
      </View>
    );
  }

  const cardWidth = getCardWidth(width);
  const titleSize = clampSize(14, width * 0.038, 20);
  const sectorNameSize = clampSize(22, width * 0.06, 32);
  const taglineSize = clampSize(14, width * 0.038, 19);
  const descSize = clampSize(13, width * 0.035, 16);
  const buttonTextSize = clampSize(16, width * 0.042, 19);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        <View style={[styles.cardOuter, { width: cardWidth }]}>
          <View style={[styles.cardGlow, { width: cardWidth }]} />
          <Animated.View
            style={[
              styles.cardWrapper,
              {
                opacity: cardAnim,
                transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }],
              },
            ]}
          >
            <View style={styles.sectorCard}>
              <Text style={[styles.cardTitle, { fontSize: titleSize }]}>CE MÉTIER TE CORRESPOND VRAIMENT</Text>

              <View style={styles.barresEmojiZone}>
                <View style={styles.barLeft}>
                  <LinearGradient colors={['#FF6000', '#FFBB00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.barresEmojiBar} />
                </View>
                <Text style={styles.sectorIconEmoji}>{resultData.icon}</Text>
                <View style={styles.barRight}>
                  <LinearGradient colors={['#FF6000', '#FFBB00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.barresEmojiBar} />
                </View>
              </View>

              <View style={styles.sectorNameWrap}>
                <GradientText colors={['#FFBB00', '#FF7B2B']} style={[styles.sectorName, { fontSize: sectorNameSize }]}>
                  {resultData.sectorName}
                </GradientText>
              </View>

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
                  <MaskedView maskElement={<Text style={[styles.tagline, { fontSize: taglineSize }]}>{resultData.tagline}</Text>}>
                    <LinearGradient colors={['#FFE479', '#FF9758']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.taglineGradient}>
                      <Text style={[styles.tagline, styles.taglineTransparent, { fontSize: taglineSize }]}>{resultData.tagline}</Text>
                    </LinearGradient>
                  </MaskedView>
                )}
              </View>

              <View style={styles.barUnderTagline}>
                <LinearGradient colors={['#FF6000', '#FFBB00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.barUnderTaglineGradient} />
              </View>

              <Text style={[styles.description, { fontSize: descSize }]}>{resultData.sectorDescription}</Text>

              <View style={styles.separatorUnderDescription} />

              <HoverableTouchableOpacity
                style={styles.continueButton}
                onPress={() => navigation.replace('TonMetierDefini', { metierName: metierResult?.metierName || 'Métier' })}
                variant="button"
              >
                <LinearGradient colors={['#FF6000', '#FFC005']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueButtonGradient}>
                  <Text style={[styles.continueButtonText, { fontSize: buttonTextSize }]}>CONTINUER MON PARCOURS</Text>
                </LinearGradient>
              </HoverableTouchableOpacity>

              <HoverableTouchableOpacity style={styles.regenerateButton} onPress={handleRegenerateMetier} variant="button">
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
  container: { flex: 1, backgroundColor: '#14161D' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#FFFFFF', fontFamily: theme.fonts.body },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 40, paddingHorizontal: 20, alignItems: 'center', paddingBottom: 24 },

  starBadgeGroup: { alignItems: 'center', marginBottom: -28, zIndex: 100 },
  starContainer: { marginBottom: -70, zIndex: 0 },
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
    ...(Platform.OS === 'web' && { boxShadow: '0 0 200px rgba(255, 172, 48, 0.35)' }),
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
  sectorIconEmoji: { fontSize: 50, marginHorizontal: 12, textAlign: 'center' },
  sectorNameWrap: { marginTop: 3, marginBottom: 3 },
  sectorName: { fontFamily: theme.fonts.title, textAlign: 'center', textTransform: 'uppercase' },
  taglineWrap: { marginBottom: 6, alignSelf: 'center' },
  tagline: { fontFamily: theme.fonts.button, textAlign: 'center', textTransform: 'uppercase' },
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
    ...(Platform.OS === 'web' && { transition: 'transform 0.25s ease, box-shadow 0.25s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }),
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.35, elevation: 8 }),
  },
  continueButtonGradient: { paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
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
    ...(Platform.OS === 'web' && { transition: 'transform 0.25s ease, box-shadow 0.25s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }),
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.35, elevation: 8 }),
  },
  regenerateButtonText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' && { whiteSpace: 'nowrap' }),
  },
  regenerateHint: { fontSize: 13, fontFamily: theme.fonts.button, color: '#FFFFFF', opacity: 0.85, textAlign: 'center' },
});
