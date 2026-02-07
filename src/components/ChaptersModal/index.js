import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_MAX_WIDTH = 520;
const MODAL_WIDTH = Math.min(SCREEN_WIDTH * 0.92, MODAL_MAX_WIDTH);
const MODAL_MAX_HEIGHT = Math.min(SCREEN_HEIGHT * 0.75, 500);

// displayProgress: barre jamais vide au début (min 6% si rawProgress === 0)
function getDisplayProgress(rawProgress) {
  if (rawProgress >= 1) return 1;
  if (rawProgress === 0) return 0.06;
  return rawProgress;
}

/**
 * Modal des chapitres (overlay)
 * - Barre de progression : min 6% quand 0
 * - Accordion : clic sur chapitre (non verrouillé) déplie la liste des 3 modules
 */
export default function ChaptersModal({
  open,
  onClose,
  moduleTitle,
  chapters,
  onSelectModule,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) setExpandedId(null);
  }, [open]);

  useEffect(() => {
    if (open) {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      overlayAnim.setValue(0);
      cardAnim.setValue(0);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [open]);

  const overlayOpacity = overlayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardScale = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.overlayInner,
            { opacity: overlayOpacity },
            Platform.OS === 'web' && {
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            },
          ]}
        />
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.cardTouchable}
        >
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Chapitres</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {moduleTitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {moduleTitle}
              </Text>
            ) : null}

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {chapters.map((ch) => (
                <ChapterItem
                  key={ch.id}
                  chapter={ch}
                  expanded={expandedId === ch.id}
                  onToggleExpand={() => setExpandedId((prev) => (prev === ch.id ? null : ch.id))}
                  onSelectModule={onSelectModule}
                />
              ))}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function ChapterItem({ chapter, expanded, onToggleExpand, onSelectModule }) {
  const { id, title, status, progress = 0, modules = [] } = chapter;
  const isLocked = status === 'locked';
  const isCurrent = status === 'current';
  const isDone = status === 'done';
  const expandable = !isLocked && modules.length > 0;
  const displayProgress = getDisplayProgress(progress);

  const handleRowPress = () => {
    if (isLocked) return;
    if (expandable) onToggleExpand();
  };

  const content = (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <Text
          style={[styles.itemTitle, isLocked && styles.itemTitleLocked]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {isDone && (
          <>
            <Text style={styles.statusDone}>Terminé</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, styles.progressFillDone]} />
            </View>
          </>
        )}
        {isCurrent && (
          <>
            <Text style={styles.statusCurrent}>En cours</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  styles.progressFillCurrent,
                  { width: `${Math.min(100, Math.max(0, displayProgress * 100))}%` },
                ]}
              />
            </View>
          </>
        )}
        {isLocked && (
          <Text style={styles.statusLocked}>Termine le chapitre précédent</Text>
        )}
      </View>
      <View style={styles.itemIcon}>
        {isDone && (
          <View style={styles.iconDoneWrap}>
            <Text style={styles.iconDone}>✔</Text>
          </View>
        )}
        {isCurrent && <Text style={styles.iconCurrent}>›</Text>}
        {isLocked && <Text style={styles.iconLocked}>🔒</Text>}
        {expandable && (
          <Text style={[styles.chevron, expanded && styles.chevronOpen]}>{'›'}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.itemWrapper}>
      {isLocked ? (
        <View>{content}</View>
      ) : (
        <TouchableOpacity onPress={handleRowPress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      )}
      {expandable && expanded && (
        <View style={styles.accordionContent}>
          {modules.map((mod) => (
            <ModuleRow
              key={mod.index}
              chapterId={id}
              module={mod}
              onSelectModule={onSelectModule}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ModuleRow({ chapterId, module: mod, onSelectModule }) {
  const { index, shortLabel, completed, isCurrent, unlocked } = mod;
  const label = shortLabel || `Module ${index + 1}`;

  const handlePress = () => {
    if (!unlocked) return;
    onSelectModule?.(chapterId, index);
  };

  const content = (
    <View style={styles.moduleRow}>
      <Text
        style={[
          styles.moduleLabel,
          !unlocked && styles.moduleLabelLocked,
        ]}
        numberOfLines={1}
      >
        Module {index + 1} — {label}
      </Text>
      {isCurrent && <Text style={styles.moduleBadge}>En cours</Text>}
      {completed && !isCurrent && <Text style={styles.moduleDone}>✔</Text>}
      {!unlocked && <Text style={styles.moduleLocked}>🔒</Text>}
    </View>
  );

  if (!unlocked) {
    return <View style={styles.moduleRowWrap}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={styles.moduleRowWrap}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  overlayInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  cardTouchable: {
    width: MODAL_WIDTH,
    maxWidth: '92%',
    maxHeight: '85vh',
  },
  card: {
    width: '100%',
    maxHeight: MODAL_MAX_HEIGHT,
    borderRadius: 24,
    backgroundColor: '#2b2f3a',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  scrollView: {
    maxHeight: 360,
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 0,
  },
  itemWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemTitleLocked: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  statusDone: {
    fontSize: 13,
    color: '#00FF41',
    marginTop: 4,
    fontWeight: '600',
  },
  statusCurrent: {
    fontSize: 13,
    color: '#FF7B2B',
    marginTop: 4,
    fontWeight: '600',
  },
  statusLocked: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressFillDone: {
    width: '100%',
    backgroundColor: '#00FF41',
  },
  progressFillCurrent: {
    backgroundColor: '#FF7B2B',
  },
  itemIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
  },
  iconDoneWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 65, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDone: {
    fontSize: 16,
    color: '#00FF41',
    fontWeight: 'bold',
  },
  iconCurrent: {
    fontSize: 24,
    color: '#FF7B2B',
    fontWeight: 'bold',
  },
  iconLocked: {
    fontSize: 18,
    opacity: 0.6,
  },
  chevron: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    transform: [{ rotate: '90deg' }],
  },
  chevronOpen: {
    transform: [{ rotate: '-90deg' }],
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  moduleRowWrap: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  moduleLabel: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  moduleLabelLocked: {
    color: 'rgba(255, 255, 255, 0.45)',
  },
  moduleBadge: {
    fontSize: 11,
    color: '#FF7B2B',
    fontWeight: '600',
    marginLeft: 8,
  },
  moduleDone: {
    fontSize: 14,
    color: '#00FF41',
    marginLeft: 6,
  },
  moduleLocked: {
    fontSize: 14,
    opacity: 0.6,
    marginLeft: 6,
  },
});
