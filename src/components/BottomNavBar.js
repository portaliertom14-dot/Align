import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile } from '../lib/userProfile';

// Icônes importées (Finder)
const homeIcon = require('../../assets/icons/home.png');
const questsIcon = require('../../assets/icons/quests.png');
const profileIconDefault = require('../../assets/icons/profile.png');

const ICON_SIZE = 47;
const BAR_WIDTH_PERCENT = 0.75;
const BOTTOM_PADDING = 24;

/**
 * Barre de navigation basse Align
 * HOME | QUÊTES | PROFIL — 3 éléments, sans labels
 * Barre capsule premium : fond #404A58, contour orange #FF7B2B
 */
export default function BottomNavBar({ questsIconRef, questsHighlight, questsZIndex = 20 }) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [profilePhotoURL, setProfilePhotoURL] = useState(null);

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const barWidth = SCREEN_WIDTH * BAR_WIDTH_PERCENT;
  const bottomPadding = Math.max(BOTTOM_PADDING, insets.bottom);

  useEffect(() => {
    let cancelled = false;
    getUserProfile()
      .then((p) => {
        if (!cancelled && p?.photoURL) setProfilePhotoURL(p.photoURL);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const isActive = (routeName) => route.name === routeName;

  const handleHome = () => navigation.navigate('Feed');
  const handleQuetes = () => navigation.navigate('Quetes');
  const handleProfil = () => navigation.navigate('Profil');

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }, questsHighlight && { pointerEvents: 'box-none' }]}>
      <View style={[styles.bar, { width: barWidth }]}>
        {/* HOME */}
        <TouchableOpacity
          onPress={handleHome}
          style={styles.item}
          activeOpacity={0.7}
        >
          <Image
            source={homeIcon}
            style={[styles.icon, isActive('Feed') && styles.iconActive]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* QUÊTES */}
        <View
          ref={questsIconRef}
          style={[styles.item, questsHighlight && { zIndex: questsZIndex, pointerEvents: 'auto' }]}
          {...(Platform.OS !== 'web' ? { collapsable: false } : {})}
        >
          <TouchableOpacity onPress={handleQuetes} style={styles.itemTouchable} activeOpacity={0.7}>
            <Image
              source={questsIcon}
              style={[styles.icon, isActive('Quetes') && styles.iconActive]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* PROFIL — cercle, photo ou avatar gris, contour 2px #DADADA */}
        <TouchableOpacity
          onPress={handleProfil}
          style={styles.item}
          activeOpacity={0.8}
        >
          <View style={styles.profileCircle}>
            {profilePhotoURL ? (
              <Image
                source={{ uri: profilePhotoURL }}
                style={styles.profilePhoto}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={profileIconDefault}
                style={styles.profileDefault}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 56,
    backgroundColor: '#404A58',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FF7B2B',
    ...Platform.select({
      web: {
        boxShadow: '0px 50px 39px rgba(0,0,0,0.45), 0px 12px 20px rgba(0,0,0,0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 50 },
        shadowRadius: 39,
        shadowOpacity: 0.45,
        elevation: 9999,
      },
    }),
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  itemTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
  profileCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    borderWidth: 2,
    borderColor: '#DADADA',
    overflow: 'hidden',
    backgroundColor: '#6A6A7A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profileDefault: {
    width: ICON_SIZE * 0.65,
    height: ICON_SIZE * 0.65,
  },
});
