/**
 * FocusOverlay : rend UNIQUEMENT les éléments focus AU-DESSUS du BlurView (zIndex 20).
 * Chaque step affiche des clones positionnés via measureInWindow (layouts).
 * tutorialStep = stepIndex (0, 1, 2).
 */
import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../Header';
import XPBar from '../XPBar';

const bookLogo = require('../../../assets/images/modules/book.png');
const questsIcon = require('../../../assets/icons/applications/quests.png');

const FOCUS_OVERLAY_Z = 20;
const FOCUS_ITEM_Z_HEADER = 24;
const FOCUS_ITEM_Z = 25;
// Barre XP / Quêtes au premier plan (au-dessus du header)
const FOCUS_ITEM_Z_ABOVE_HEADER = 28;
// Même taille que les icônes de la navbar (100×100)
const FOCUS_ICON_SIZE = 100;

/**
 * @param {number} step - tutorialStep (0, 1, 2)
 * @param {Object} layouts - { module1: {x,y,width,height}, xpBarStars: {...}, questsIcon: {...} }
 * @param {() => void} onModule1Press
 * @param {() => void} onQuestsPress
 * @param {() => void} onSettingsPress
 */
export default function FocusOverlay({
  step,
  layouts,
  onModule1Press,
  onQuestsPress,
  onSettingsPress,
}) {
  if (!layouts) return null;

  const { module1, xpBarStars, questsIcon: questsLayout } = layouts;
  const hasModule1 = module1 && module1.width > 0 && module1.height > 0;
  const hasXpBar = xpBarStars && xpBarStars.width > 0 && xpBarStars.height > 0;
  const hasQuests = questsLayout && questsLayout.width > 0 && questsLayout.height > 0;

  return (
    <View
      style={[StyleSheet.absoluteFillObject, { zIndex: FOCUS_OVERLAY_Z, pointerEvents: 'box-none' }]}
    >
      {/* Header net (steps 0, 1, 2) — zIndex inférieur à XP bar pour ne pas la masquer */}
      {(step === 0 || step === 1 || step === 2) && (
        <View style={[styles.headerWrap, { zIndex: FOCUS_ITEM_Z_HEADER, pointerEvents: 'auto' }]}>
          <Header
            showSettings={false}
            onSettingsPress={onSettingsPress}
          />
        </View>
      )}

      {/* STEP 0 : Module 1 net + cliquable */}
      {step === 0 && hasModule1 && (
        <Pressable
          style={[
            styles.cloneAbsolute,
            {
              left: module1.x,
              top: module1.y,
              width: module1.width,
              height: module1.height,
              borderRadius: module1.width / 2,
              zIndex: FOCUS_ITEM_Z,
              pointerEvents: 'auto',
            },
          ]}
          onPress={onModule1Press}
        >
          <LinearGradient
            colors={['#00FF41', '#19602B']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={styles.moduleCircleGradient}
          >
            <Image
              source={bookLogo}
              style={[styles.moduleCircleLogo, { width: FOCUS_ICON_SIZE, height: FOCUS_ICON_SIZE }]}
              resizeMode="contain"
            />
          </LinearGradient>
        </Pressable>
      )}

      {/* STEP 1 : XPBar + Quêtes nets en même temps (dès SUIVANT après step 0), au premier plan */}
      {step === 1 && (
        <>
          {hasXpBar && (
            <View
              style={[
                styles.cloneAbsolute,
                {
                  left: xpBarStars.x,
                  top: xpBarStars.y,
                  width: xpBarStars.width,
                  height: xpBarStars.height,
                  zIndex: FOCUS_ITEM_Z_ABOVE_HEADER,
                  elevation: 12,
                  pointerEvents: 'auto',
                },
              ]}
            >
              <XPBar />
            </View>
          )}
          {hasQuests && (
            <TouchableOpacity
              style={[
                styles.cloneAbsolute,
                {
                  left: questsLayout.x,
                  top: questsLayout.y,
                  width: questsLayout.width,
                  height: questsLayout.height,
                  zIndex: FOCUS_ITEM_Z_ABOVE_HEADER,
                  elevation: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  pointerEvents: 'auto',
                },
              ]}
              onPress={onQuestsPress}
              activeOpacity={0.7}
            >
              <Image
                source={questsIcon}
                style={{ width: FOCUS_ICON_SIZE, height: FOCUS_ICON_SIZE }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </>
      )}

      {/* STEP 2 : XPBar + Quêtes nets ; Module 1 net + cliquable */}
      {step === 2 && (
        <>
          {hasXpBar && (
            <View
              style={[
                styles.cloneAbsolute,
                {
                  left: xpBarStars.x,
                  top: xpBarStars.y,
                  width: xpBarStars.width,
                  height: xpBarStars.height,
                  zIndex: FOCUS_ITEM_Z_ABOVE_HEADER,
                  elevation: 12,
                  pointerEvents: 'auto',
                },
              ]}
            >
              <XPBar />
            </View>
          )}
          {hasQuests && (
            <TouchableOpacity
              style={[
                styles.cloneAbsolute,
                {
                  left: questsLayout.x,
                  top: questsLayout.y,
                  width: questsLayout.width,
                  height: questsLayout.height,
                  zIndex: FOCUS_ITEM_Z_ABOVE_HEADER,
                  elevation: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  pointerEvents: 'auto',
                },
              ]}
              onPress={onQuestsPress}
              activeOpacity={0.7}
            >
              <Image
                source={questsIcon}
                style={{ width: FOCUS_ICON_SIZE, height: FOCUS_ICON_SIZE }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
          {hasModule1 && (
            <Pressable
              style={[
                styles.cloneAbsolute,
                {
                  left: module1.x,
                  top: module1.y,
                  width: module1.width,
                  height: module1.height,
                  borderRadius: module1.width / 2,
                  zIndex: FOCUS_ITEM_Z,
                  pointerEvents: 'auto',
                },
              ]}
              onPress={onModule1Press}
            >
              <LinearGradient
                colors={['#00FF41', '#19602B']}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
                style={styles.moduleCircleGradient}
              >
                <Image
                  source={bookLogo}
                  style={[styles.moduleCircleLogo, { width: FOCUS_ICON_SIZE, height: FOCUS_ICON_SIZE }]}
                  resizeMode="contain"
                />
              </LinearGradient>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  cloneAbsolute: {
    position: 'absolute',
    overflow: 'hidden',
  },
  moduleCircleGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCircleLogo: {},
});
