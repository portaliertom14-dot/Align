import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform, Dimensions, Animated } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile } from '../lib/userProfile';
import { onScrollNav } from '../lib/scrollNavEvents';

// Icônes importées (Finder)
const homeIcon = require('../../assets/icons/applications/home.png');
const questsIcon = require('../../assets/icons/applications/quests.png');
// Remplacer par profile.png quand le fichier est ajouté dans assets/icons/
const profileIconDefault = require('../../assets/icons/settings.png');

const NARROW_BREAKPOINT = 430;
const LARGE_SCREEN_BREAKPOINT = 768;
const NAV_BAR_REDUCTION_LARGE_PX = 50;
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
  const homeItemRef = useRef(null);
  const questsItemRef = useRef(null);
  const profileItemRef = useRef(null);
  isNavVisibleRef.current = isNavVisible;

  // Web : appliquer .nav-item-hover au DOM (RN Web ne transmet pas toujours className)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const apply = (ref, label) => {
      const node = ref.current;
      if (node && typeof node.setAttribute === 'function') {
        const existing = (node.getAttribute('class') || '').trim();
        if (!existing.includes('nav-item-hover')) node.setAttribute('class', existing ? `${existing} nav-item-hover` : 'nav-item-hover');
      }
    };
    const run = () => {
      apply(homeItemRef, 'home');
      apply(questsItemRef, 'quests');
      apply(profileItemRef, 'profile');
    };
    const t1 = setTimeout(run, 50);
    const t2 = setTimeout(run, 200);
    const t3 = setTimeout(run, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isMobile = SCREEN_WIDTH <= NARROW_BREAKPOINT;
  const isLargeScreen = SCREEN_WIDTH >= LARGE_SCREEN_BREAKPOINT;
  const navHeight = NAV_HEIGHT;
  const avatarSize = Math.round(navHeight * 0.72);
  const homeIconSize = 120;
  const questsIconSize = 100;
  const baseBarWidth = Math.min(Math.max(SCREEN_WIDTH * BAR_WIDTH_PERCENT, BAR_WIDTH_MIN), BAR_WIDTH_MAX);
  const barWidth = Math.max(BAR_WIDTH_MIN, baseBarWidth - (isLargeScreen ? NAV_BAR_REDUCTION_LARGE_PX : 0));
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

  const isWeb = Platform.OS === 'web';
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
        {/* HOME — hover via CSS .navIconBtn::before (classe appliquée au DOM en useEffect, RN Web n’envoie pas className) */}
        <TouchableOpacity
          ref={homeItemRef}
          onPress={handleHome}
          style={[styles.item, isWeb && styles.itemWeb]}
          activeOpacity={0.7}
          {...(isWeb ? { tabIndex: 0 } : {})}
        >
          <Image
            source={homeIcon}
            style={[styles.icon, { width: homeIconSize, height: homeIconSize }, isActive('Feed') && styles.iconActive]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* QUÊTES */}
        <View
          ref={questsIconRef}
          style={[styles.item, questsHighlight && { zIndex: questsZIndex, pointerEvents: 'auto' }]}
          {...(Platform.OS !== 'web' ? { collapsable: false } : {})}
        >
          <TouchableOpacity
            ref={questsItemRef}
            onPress={handleQuetes}
            style={styles.itemTouchable}
            activeOpacity={0.7}
            {...(isWeb ? { tabIndex: 0 } : {})}
          >
            <Image
              source={questsIcon}
              style={[styles.icon, { width: questsIconSize, height: questsIconSize }, isActive('Quetes') && styles.iconActive]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* PROFIL — hover Safari-like (corbeille photo uniquement dans Paramètres) */}
        <TouchableOpacity
          ref={profileItemRef}
          onPress={handleProfil}
          style={[styles.item, isWeb && styles.itemWeb]}
          activeOpacity={0.8}
          {...(isWeb ? { tabIndex: 0 } : {})}
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
        overflow: 'hidden',
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
  itemWeb: {
    cursor: 'pointer',
  },
  navItemPill: {
    padding: 10,
    borderRadius: 9999,
    alignSelf: 'center',
  },
  itemTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  icon: {
    opacity: 0.9,
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
