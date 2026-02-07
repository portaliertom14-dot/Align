import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from './onboardingConstants';
import { saveDraft, loadDraft } from '../../lib/onboardingDraftStore';
import StandardHeader from '../../components/StandardHeader';
import WheelPicker from '../../components/WheelPicker';
import { daysInMonth } from '../../utils/date';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const { buttonWidth: CONTINUE_BTN_WIDTH } = getContinueButtonDimensions();

const PROGRESS_HEIGHT = 6;
const DATE_BLOCK_RADIUS = 24;
const ITEM_HEIGHT = 48;
const VISIBLE_COUNT = 7;
const PICKER_BLOCK_HEIGHT = VISIBLE_COUNT * ITEM_HEIGHT + 36;

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DEFAULT_DAY = 15;
const DEFAULT_MONTH_INDEX = 5;
const DEFAULT_YEAR = 2005;
const YEAR_MIN = 1950;

/**
 * ÉCRAN DATE DE NAISSANCE (étape 7/7) — WheelPicker type iOS
 * 3 colonnes : Jour, Mois, Année. Bande de focus, snap, auto-correction.
 */
export default function OnboardingDob() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const PROGRESS_BAR_WIDTH = width - 48;
  const QUESTION_FONT_SIZE = Math.min(Math.max(width * 0.048, 16), 22);
  const SUBTITLE_FONT_SIZE = Math.min(Math.max(width * 0.028, 11), 14);
  const DATE_BLOCK_WIDTH = Math.min(width * 0.86, width - 32);
  const currentStep = route.params?.currentStep ?? 7;
  const totalSteps = route.params?.totalSteps ?? 7;
  const currentYear = new Date().getFullYear();

  const [day, setDay] = useState(DEFAULT_DAY);
  const [monthIndex, setMonthIndex] = useState(DEFAULT_MONTH_INDEX);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const maxDay = daysInMonth(year, monthIndex);
  // Valeur affichée/clampée : jamais un jour invalide pour le mois/année courants
  const displayDay = Math.min(Math.max(1, day), maxDay);

  // Pré-remplir depuis le brouillon
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = await loadDraft();
      if (cancelled) return;
      if (draft.dob) {
        const match = String(draft.dob).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
          const [, y, m, d] = match;
          const mi = clamp(parseInt(m, 10) - 1, 0, 11);
          const yr = clamp(parseInt(y, 10), YEAR_MIN, currentYear);
          const maxD = daysInMonth(yr, mi);
          setYear(yr);
          setMonthIndex(mi);
          setDay(clamp(parseInt(d, 10), 1, maxD));
        }
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-correction : clamp le jour quand mois/année changent (ex: 31 jan → 28 fév)
  useEffect(() => {
    if (!hydrated) return;
    if (day > maxDay) setDay(maxDay);
  }, [monthIndex, year, maxDay, hydrated, day]);

  // Sauvegarde brouillon (toujours avec jour valide)
  useEffect(() => {
    if (!hydrated) return;
    const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;
    saveDraft({ dob: dateString });
  }, [hydrated, year, monthIndex, displayDay]);

  const onDayChange = useCallback((v) => {
    const d = isNaN(Number(v)) ? DEFAULT_DAY : Number(v);
    setDay(clamp(d, 1, maxDay));
  }, [maxDay]);

  const onMonthChange = useCallback((idx) => {
    const newIndex = isNaN(Number(idx)) ? DEFAULT_MONTH_INDEX : clamp(Number(idx), 0, 11);
    const newMax = daysInMonth(year, newIndex);
    setMonthIndex(newIndex);
    setDay((prev) => Math.min(prev, newMax));
  }, [year]);

  const onYearChange = useCallback((yr) => {
    const y = isNaN(Number(yr)) ? DEFAULT_YEAR : clamp(Number(yr), YEAR_MIN, currentYear);
    const newMax = daysInMonth(y, monthIndex);
    setYear(y);
    setDay((prev) => Math.min(prev, newMax));
  }, [monthIndex, currentYear]);

  const handleContinue = useCallback(() => {
    if (submitting) return;
    setSubmitting(true);
    const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;
    saveDraft({ dob: dateString });
    navigation.navigate('Onboarding');
    setSubmitting(false);
  }, [year, monthIndex, displayDay, submitting, navigation]);

  const progressRatio = currentStep / totalSteps;

  const monthItems = useMemo(
    () => MONTHS_FR.map((label, i) => ({ label, value: i })),
    []
  );

  const yearItems = useMemo(
    () => Array.from(
      { length: currentYear - YEAR_MIN + 1 },
      (_, i) => ({ label: String(currentYear - i), value: currentYear - i })
    ),
    [currentYear]
  );

  // Liste des jours dynamique : 1..daysInMonth(year, monthIndex)
  const dayItems = useMemo(() => {
    const max = daysInMonth(year, monthIndex);
    return Array.from({ length: max }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
  }, [year, monthIndex]);

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <StandardHeader title="ALIGN" />

      <View style={[styles.progressWrapper, { width: PROGRESS_BAR_WIDTH }]}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#FF7B2B', '#FFD93F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progressRatio * 100}%` }]}
          />
        </View>
      </View>

      <Text style={[styles.question, { fontSize: QUESTION_FONT_SIZE, lineHeight: QUESTION_FONT_SIZE * 1.15 }]}>QUAND ES-TU NÉ ?</Text>
      <Text style={[styles.subtitle, { fontSize: SUBTITLE_FONT_SIZE, lineHeight: SUBTITLE_FONT_SIZE * 1.2 }]}>
        Répond simplement il n'y a pas de bonnes ou de mauvaises réponses.
      </Text>

      <View style={[styles.dateBlock, { width: DATE_BLOCK_WIDTH, minHeight: PICKER_BLOCK_HEIGHT }]}>
        <View style={styles.dateRow}>
          <View style={styles.pickerColumn}>
            <WheelPicker
              key="day"
              items={dayItems}
              value={displayDay}
              onChange={onDayChange}
              itemHeight={ITEM_HEIGHT}
              visibleCount={VISIBLE_COUNT}
            />
          </View>
          <View style={[styles.pickerColumn, styles.pickerColumnMonth]}>
            <WheelPicker
              key="month"
              items={monthItems}
              value={monthIndex}
              onChange={onMonthChange}
              itemHeight={ITEM_HEIGHT}
              visibleCount={VISIBLE_COUNT}
            />
          </View>
          <View style={styles.pickerColumn}>
            <WheelPicker
              key="year"
              items={yearItems}
              value={year}
              onChange={onYearChange}
              itemHeight={ITEM_HEIGHT}
              visibleCount={VISIBLE_COUNT}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
        activeOpacity={0.85}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>CONTINUER</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1A1B23',
    alignItems: 'center',
    paddingBottom: 44,
  },
  progressWrapper: {
    alignSelf: 'center',
    marginBottom: 38,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    backgroundColor: '#2D3241',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  question: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  dateBlock: {
    backgroundColor: '#2D3241',
    borderRadius: DATE_BLOCK_RADIUS,
    padding: 18,
    marginBottom: 32,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerColumn: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  pickerColumnMonth: {
    flex: 1.2,
    minWidth: 0,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: CONTINUE_BTN_WIDTH,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontFamily: theme.fonts.title,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
