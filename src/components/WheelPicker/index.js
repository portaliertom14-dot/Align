/**
 * WheelPicker — colonne déroulante type iOS
 * Effet roulette : bande de focus centrale, items atténués au-dessus/en-dessous.
 * Desktop : molette + drag souris. Mobile : scroll doigt. Snap automatique.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WheelPicker({
  items = [],
  value,
  onChange,
  itemHeight = 48,
  visibleCount = 7,
}) {
  const scrollRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const scrollYRef = useRef(0);
  const containerHeight = visibleCount * itemHeight;
  const paddingVertical = ((visibleCount - 1) / 2) * itemHeight;
  const maxScrollY = Math.max(0, (items.length - 1) * itemHeight);
  const snapOffsets = React.useMemo(
    () => Array.from({ length: items.length }, (_, i) => i * itemHeight),
    [items.length, itemHeight]
  );
  const wheelSnapTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastPointerYRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const initialScrolledRef = useRef(false);

  // Comparaison tolérante (string/number) pour éviter erreurs de type
  const valueIndex = items.findIndex((it) => it != null && Number(it.value) === Number(value));

  // Réinitialiser le scroll quand la liste change (ex: 31→28 jours en changeant de mois)
  const prevItemsLenRef = useRef(items.length);
  useEffect(() => {
    if (prevItemsLenRef.current !== items.length) {
      prevItemsLenRef.current = items.length;
      initialScrolledRef.current = false;
    }
  }, [items.length]);

  // Scroll initial vers la valeur sélectionnée
  useEffect(() => {
    if (!initialScrolledRef.current && items.length > 0 && valueIndex >= 0 && scrollRef.current) {
      initialScrolledRef.current = true;
      const targetY = valueIndex * itemHeight;
      scrollRef.current.scrollTo({ y: targetY, animated: false });
      setScrollY(targetY);
      scrollYRef.current = targetY;
    }
  }, [items.length, valueIndex, itemHeight]);

  // Sync quand value ou items changent (ex: jour clampé 31→30, liste 31→28 jours)
  useEffect(() => {
    if (!scrollRef.current || items.length === 0) return;
    let targetIndex = valueIndex;
    if (valueIndex < 0) {
      targetIndex = Math.max(0, items.length - 1);
      const fallbackItem = items[targetIndex];
      if (fallbackItem != null && Number(fallbackItem.value) !== Number(value)) {
        onChange?.(fallbackItem.value);
      }
    }
    const targetY = targetIndex * itemHeight;
    const currentIdx = Math.round(scrollYRef.current / itemHeight);
    if (currentIdx !== targetIndex || Math.abs(scrollYRef.current - targetY) > 2) {
      scrollRef.current.scrollTo({ y: targetY, animated: true });
      setScrollY(targetY);
      scrollYRef.current = targetY;
    }
  }, [value, valueIndex, items, itemHeight, onChange]);

  const snapToNearest = useCallback(() => {
    if (!scrollRef.current || items.length === 0) return;
    const currentY = scrollYRef.current;
    const idx = Math.round(currentY / itemHeight);
    const clampedIdx = Math.max(0, Math.min(idx, items.length - 1));
    const targetY = clampedIdx * itemHeight;
    scrollRef.current.scrollTo({ y: targetY, animated: true });
    setScrollY(targetY);
    scrollYRef.current = targetY;
    const item = items[clampedIdx];
    if (item != null && Number(item.value) !== Number(value)) onChange?.(item.value);
  }, [itemHeight, items, value, onChange]);

  const handleScroll = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    setScrollY(y);
    scrollYRef.current = y;
    lastScrollYRef.current = y;
  }, []);

  // Snap magnétique quand le scroll s'arrête (débounce pour molette)
  const scheduleWheelSnap = useCallback(() => {
    if (wheelSnapTimeoutRef.current) clearTimeout(wheelSnapTimeoutRef.current);
    wheelSnapTimeoutRef.current = setTimeout(() => {
      wheelSnapTimeoutRef.current = null;
      snapToNearest();
    }, 120);
  }, [snapToNearest]);

  useEffect(() => () => { if (wheelSnapTimeoutRef.current) clearTimeout(wheelSnapTimeoutRef.current); }, []);

  const handleScrollEnd = useCallback(() => {
    if (isDraggingRef.current) return;
    snapToNearest();
  }, [snapToNearest]);

  const handleMomentumScrollEnd = useCallback(() => {
    snapToNearest();
  }, [snapToNearest]);

  const handleScrollEndDrag = useCallback(() => {
    isDraggingRef.current = false;
    snapToNearest();
  }, [snapToNearest]);

  const scrollToIndex = useCallback(
    (index) => {
      if (items.length === 0) return;
      const clampedIdx = Math.max(0, Math.min(index, items.length - 1));
      const targetY = clampedIdx * itemHeight;
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
      setScrollY(targetY);
      scrollYRef.current = targetY;
      const item = items[clampedIdx];
      if (item != null) onChange?.(item.value);
    },
    [items, itemHeight, onChange]
  );

  // Desktop : drag souris
  const handlePointerDown = useCallback((e) => {
    if (Platform.OS !== 'web') return;
    isDraggingRef.current = true;
    const ev = e.nativeEvent ?? e;
    lastPointerYRef.current = ev.clientY ?? ev.pageY ?? 0;
    lastScrollYRef.current = scrollYRef.current;
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      if (Platform.OS !== 'web' || !isDraggingRef.current) return;
      const ev = e.nativeEvent ?? e;
      const clientY = ev.clientY ?? ev.pageY ?? 0;
      const delta = lastPointerYRef.current - clientY;
      lastPointerYRef.current = clientY;
      const newY = Math.max(0, Math.min(maxScrollY, lastScrollYRef.current + delta));
      lastScrollYRef.current = newY;
      setScrollY(newY);
      scrollRef.current?.scrollTo({ y: newY, animated: false });
    },
    [maxScrollY]
  );

  const handlePointerUp = useCallback(() => {
    if (Platform.OS !== 'web') return;
    isDraggingRef.current = false;
    snapToNearest();
  }, [snapToNearest]);

  const handlePointerLeave = useCallback(() => {
    if (Platform.OS !== 'web') return;
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      snapToNearest();
    }
  }, [snapToNearest]);

  const handleWheel = useCallback(
    (e) => {
      if (Platform.OS !== 'web') return;
      e.preventDefault?.();
      e.stopPropagation?.();
      const delta = e.deltaY ?? e.nativeEvent?.deltaY ?? 0;
      const currentY = scrollYRef.current;
      const newY = Math.max(0, Math.min(maxScrollY, currentY + delta));
      scrollRef.current?.scrollTo({ y: newY, animated: false });
      setScrollY(newY);
      scrollYRef.current = newY;
      scheduleWheelSnap();
    },
    [maxScrollY, scheduleWheelSnap]
  );

  return (
    <View
      style={[styles.container, { height: containerHeight }]}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
    >
      {/* Bande de focus centrale */}
      <View
        style={[
          styles.focusBand,
          {
            top: paddingVertical,
            height: itemHeight,
          },
        ]}
      />
      {/* Gradient fade haut */}
      <LinearGradient
        colors={['#2D3241', 'transparent']}
        style={[styles.gradientTop, { height: paddingVertical }]}
        pointerEvents="none"
      />
      {/* Gradient fade bas */}
      <LinearGradient
        colors={['transparent', '#2D3241']}
        style={[styles.gradientBottom, { height: paddingVertical, top: paddingVertical + itemHeight }]}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={{
          paddingVertical,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        decelerationRate="fast"
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
      >
        {items.map((item, i) => {
          const itemCenter = paddingVertical + i * itemHeight + itemHeight / 2;
          const viewCenter = scrollY + containerHeight / 2;
          const distance = Math.abs(itemCenter - viewCenter) / itemHeight;
          const opacity = Math.max(0.35, 1 - distance * 0.22);
          const scale = Math.max(0.88, 1 - distance * 0.04);
          const isSelected = Math.abs(distance) < 0.6;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.item, { height: itemHeight }]}
              onPress={() => scrollToIndex(i)}
              activeOpacity={1}
            >
              <Text
                style={[
                  styles.itemText,
                  {
                    opacity,
                    transform: [{ scale }],
                    fontWeight: isSelected ? '900' : '600',
                  },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  focusBand: {
    position: 'absolute',
    left: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    zIndex: 0,
  },
  gradientTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1,
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  itemText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.045, 20),
    color: '#FFFFFF',
    fontFamily: theme.fonts.button,
  },
});
