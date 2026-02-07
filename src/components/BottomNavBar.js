import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform, Dimensions, Animated } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile } from '../lib/userProfile';
import { onScrollNav } from '../lib/scrollNavEvents';

// Icônes importées (Finder)
const homeIcon = require('../../assets/icons/applications/home.png');
const questsIcon = require('../../assets/icons/applications/quests.png');
const profileIconDefault = require('../../assets/icons/profile.png');

const NARROW_BREAKPOINT = 430;
const NAV_HEIGHT = 44;
const BAR_WIDTH_MIN = 320;
const BAR_WIDTH_MAX = 980;
const BAR_WIDTH_PERCENT = 0.75;
const NAV_HIDE_DELAY_MS = 15000;
const NAV_ANIM_DURATION = 300;
const SCROLL_THRESHOLD_PX = 10;

/**
 * Barre de navigation basse Align
 * HOME | QUÊTES | PROFIL — 3 éléments, sans labels
 * Auto-hide après 15s sans interaction, réapparaît sur mouvement/scroll/tap
 */
export default function BottomNavBar({ questsIconRef, questsHighlight, questsZIndex = 20 }) {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [profilePhotoURL, setProfilePhotoURL] = useState(null);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const animRef = useRef(new Animated.Value(1));
  const isNavVisibleRef = useRef(true);
  const scrollLastOffsetRef = useRef(null);
  const prevRouteNameRef = useRef(route?.name);
  isNavVisibleRef.current = isNavVisible;

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isMobile = SCREEN_WIDTH <= NARROW_BREAKPOINT;
  const navHeight = NAV_HEIGHT;
  const avatarSize = Math.round(navHeight * 0.72);
  const homeQuestIconSize = 100;
  const barWidth = Math.min(Math.max(SCREEN_WIDTH * BAR_WIDTH_PERCENT, BAR_WIDTH_MIN), BAR_WIDTH_MAX);
  const barPaddingH = isMobile ? 16 : 24;
  const bottomPadding = Math.max(isMobile ? 16 : 24, insets.bottom);

  const hideNavRef = useRef(() => {});
  hideNavRef.current = () => {
    setIsNavVisible(false);
    Animated.timing(animRef.current, {
      toValue: 0,
      duration: NAV_ANIM_DURATION,
      useNativeDriver: true,
    }).start();
  };

  const resetHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => hideNavRef.current(), NAV_HIDE_DELAY_MS);
  };

  const showNav = () => {
    if (!isNavVisibleRef.current) {
      setIsNavVisible(true);
      Animated.timing(animRef.current, {
        toValue: 1,
        duration: NAV_ANIM_DURATION,
        useNativeDriver: true,
      }).start();
    }
    resetHideTimer();
  };

  useEffect(() => {
    resetHideTimer();
    const unsubscribe = onScrollNav((offsetY) => {
      const prev = scrollLastOffsetRef.current;
      scrollLastOffsetRef.current = offsetY;
      if (prev == null) return;
      const delta = offsetY - prev;
      if (delta > SCROLL_THRESHOLD_PX) hideNavRef.current();
      else if (delta < -SCROLL_THRESHOLD_PX) {
        showNav();
        resetHideTimer();
      }
    });
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.addEventListener) {
      const lastScrollRef = { current: new Map() };
      const lastWindowScrollY = { current: typeof window !== 'undefined' ? (window.scrollY ?? 0) : 0 };
      const handleScroll = (e) => {
        let curr = 0;
        let prev = 0;
        const el = e?.target;
        if (el && typeof el.scrollTop === 'number') {
          prev = lastScrollRef.current.get(el) ?? el.scrollTop;
          curr = el.scrollTop;
          lastScrollRef.current.set(el, curr);
        } else if (typeof window !== 'undefined') {
          prev = lastWindowScrollY.current;
          curr = window.scrollY ?? document.documentElement?.scrollTop ?? 0;
          lastWindowScrollY.current = curr;
        } else return;
        const delta = curr - prev;
        if (delta > SCROLL_THRESHOLD_PX) hideNavRef.current();
        else if (delta < -SCROLL_THRESHOLD_PX) {
          showNav();
          resetHideTimer();
        }
      };
      document.addEventListener('scroll', handleScroll, true);
      ['mousemove', 'keydown', 'touchstart'].forEach((name) => document.addEventListener(name, showNav));
      return () => {
        unsubscribe();
        document.removeEventListener('scroll', handleScroll, true);
        ['mousemove', 'keydown', 'touchstart'].forEach((name) => document.removeEventListener(name, showNav));
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      };
    }
    return () => {
      unsubscribe();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      showNav();
    }, [])
  );

  useEffect(() => {
    if (prevRouteNameRef.current !== route?.name) {
      prevRouteNameRef.current = route?.name;
      scrollLastOffsetRef.current = null;
    }
  }, [route?.name]);

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

  const barStyle = { width: barWidth, height: navHeight, paddingHorizontal: barPaddingH };
  const translateY = animRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }, questsHighlight && { pointerEvents: 'box-none' }]}>
      {!isNavVisible && (
        <TouchableOpacity
          style={styles.tapBar}
          onPress={showNav}
          activeOpacity={1}
        />
      )}
      <Animated.View
        style={[
          styles.barWrapper,
          {
            opacity: animRef.current,
            transform: [{ translateY }],
            pointerEvents: isNavVisible ? 'auto' : 'none',
          },
        ]}
      >
      <View style={[styles.bar, barStyle]}>
        {/* HOME */}
        <TouchableOpacity
          onPress={handleHome}
          style={styles.item}
          activeOpacity={0.7}
        >
          <Image
            source={homeIcon}
            style={[styles.icon, { width: homeQuestIconSize, height: homeQuestIconSize }, isActive('Feed') && styles.iconActive]}
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
              style={[styles.icon, { width: homeQuestIconSize, height: homeQuestIconSize }, isActive('Quetes') && styles.iconActive]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* PROFIL — cercle, photo ou avatar gris, contour 1px #DADADA */}
        <TouchableOpacity
          onPress={handleProfil}
          style={styles.item}
          activeOpacity={0.8}
        >
          <View style={[styles.profileCircle, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            {profilePhotoURL ? (
              <Image
                source={{ uri: profilePhotoURL }}
                style={styles.profilePhoto}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={profileIconDefault}
                style={[styles.profileDefault, { width: avatarSize * 0.65, height: avatarSize * 0.65 }]}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
      </Animated.View>
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
  tapBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 9998,
  },
  barWrapper: {
    alignSelf: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#404A58',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#000000',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowRadius: 50,
        shadowOpacity: 0.55,
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  icon: {
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
  profileCircle: {
    borderWidth: 1,
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
  profileDefault: {},
});
