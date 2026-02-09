/**
 * Écran Profil — design Figma (scroll vertical)
 * Blocs: Prénom/Username (édition + cooldown 30j), Récap (niveau, flammes, étoiles, modules), Secteur/Métier favori, Bouton Partager.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import StandardHeader from '../../components/StandardHeader';
import { theme } from '../../styles/theme';
import { emitScrollNav } from '../../lib/scrollNavEvents';
import { getUserProgress } from '../../lib/userProgressSupabase';
import { calculateLevel } from '../../lib/progression';
import {
  getUserProfile,
  ensureProfileWithDefaults,
  ensureReferralCode,
  updateProfileFieldsWithCooldown,
  getCooldownDaysLeft,
  uploadAvatar,
  clearProfilePhoto,
} from '../../lib/userProfile';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getChapterProgress } from '../../lib/chapterProgress';

const xpIcon = require('../../../assets/icons/xp.png');
const starIcon = require('../../../assets/icons/star.png');
const flameIcon = require('../../../assets/images/flame.png');
const modulesDoneIcon = require('../../../assets/images/modules_done.png');
// Icône corbeille : place ton image dans assets/icons/trash.png (recommandé 24×24 ou 48×48 px)
const trashIcon = require('../../../assets/icons/trash.png');
// Placeholder pour utilisateurs sans photo (remplace assets/icons/default_avatar.png si besoin)
const defaultAvatar = require('../../../assets/icons/default_avatar.png');

// Même logique que Paramètres (rayons d'angle + alignement texte)
const BLOCK_RADIUS = 48;
const BLOCK_BG = '#2D3241';
const LABEL_COLOR = '#ACACAC';
const VALUE_COLOR = '#FFFFFF';
const COOLDOWN_DAYS = 30;
const AVATAR_SIZE = 180;

const SECTOR_NAMES = {
  tech: 'Tech',
  business: 'Business',
  creation: 'Création',
  droit: 'Droit',
  sante: 'Santé',
};
const JOB_NAMES = {
  developpeur: 'Développeur logiciel',
  entrepreneur: 'Entrepreneur',
  designer: 'Designer',
  avocat: 'Avocat',
  medecin: 'Médecin',
};

function mapSector(id) {
  return (id && SECTOR_NAMES[id]) || id || '—';
}
function mapJob(id) {
  return (id && JOB_NAMES[id]) || id || '—';
}

export default function ProfilScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [trashHovered, setTrashHovered] = useState(false);
  const [editHovered, setEditHovered] = useState(false);

  const loadData = useCallback(async () => {
    try {
      let userProfile = await getUserProfile();
      userProfile = await ensureProfileWithDefaults() ?? userProfile;
      const [userProgress, chapterProgress] = await Promise.all([
        getUserProgress(true),
        getChapterProgress(),
      ]);
      setProfile(userProfile || {});

      const currentXP = userProgress?.currentXP || 0;
      const level = calculateLevel(currentXP);
      const stars = userProgress?.totalStars ?? 0;
      const streakCount = userProgress?.streakCount ?? 0;
      const ch = chapterProgress?.chapterHistory || [];
      const cm = chapterProgress?.completedModulesInChapter || [];
      const modulesCompleted = ch.length * 3 + cm.length;

      setProgress({
        level,
        stars,
        streakCount,
        modulesCompleted,
        sector: mapSector(userProgress?.activeDirection),
        job: mapJob(userProgress?.activeMetier),
      });

      const code = await ensureReferralCode();
      if (code) setReferralCode(code);
      else if (userProfile?.referralCode) setReferralCode(userProfile.referralCode);
    } catch (e) {
      console.error('[Profil] loadData:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const firstName = profile?.firstName ?? profile?.prenom ?? 'Utilisateur';
  const username = profile?.username ?? profile?.nomUtilisateur ?? '';
  const displayUsername = username ? (username.startsWith('@') ? username : `@${username}`) : '@user_…';

  const firstNameCooldown = getCooldownDaysLeft(profile?.first_name_last_changed_at);
  const usernameCooldown = getCooldownDaysLeft(profile?.username_last_changed_at);

  const openEdit = (field, value) => {
    setEditField(field);
    setEditValue(field === 'username' ? (String(value || '').replace(/^@/, '')) : (String(value || '')));
    setEditError('');
  };

  const pickAndUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Accès à la galerie refusé.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setUploadingAvatar(true);
      const { success, avatarUrl, error } = await uploadAvatar(result.assets[0].uri);
      if (success && avatarUrl) {
        setProfile((p) => ({ ...p, photoURL: avatarUrl }));
      } else {
        Alert.alert('Erreur', error || 'Impossible d’importer la photo.');
      }
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible d’importer la photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const confirmDeleteProfilePhoto = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Supprimer la photo de profil ?')) handleDeleteProfilePhoto();
      return;
    }
    Alert.alert(
      'Supprimer la photo de profil ?',
      '',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: handleDeleteProfilePhoto },
      ]
    );
  };

  const handleDeleteProfilePhoto = async () => {
    const { success } = await clearProfilePhoto();
    if (success) setProfile((p) => ({ ...p, photoURL: null }));
  };

  const saveEdit = async () => {
    if (!editField) return;
    setSaving(true);
    setEditError('');
    const payload =
      editField === 'first_name'
        ? { firstName: editValue.trim(), username: undefined }
        : { firstName: undefined, username: editValue.trim() };
    const res = await updateProfileFieldsWithCooldown(payload);
    setSaving(false);
    if (res.success) {
      setProfile((p) => ({
        ...p,
        ...(editField === 'first_name'
          ? { firstName: editValue.trim(), prenom: editValue.trim(), first_name_last_changed_at: new Date().toISOString() }
          : { username: editValue.trim(), nomUtilisateur: editValue.trim(), username_last_changed_at: new Date().toISOString() }),
      }));
      setEditField(null);
    } else {
      if (res.error === 'username_deja_utilise' || res.error?.includes('unique')) {
        setEditError("Ce nom d'utilisateur est déjà pris.");
      } else if (res.error === 'cooldown_username' || res.error === 'cooldown_first_name') {
        setEditError(`Modifiable dans ${COOLDOWN_DAYS} jours.`);
      } else {
        setEditError(res.error || 'Erreur');
      }
    }
  };

  const handleShare = async () => {
    const code = referralCode || (await ensureReferralCode());
    if (!code) {
      Alert.alert('Partage', 'Lien de parrainage non disponible.');
      return;
    }
    const url = `https://align-app.fr?ref=${encodeURIComponent(code)}`;
    const message = `Rejoins-moi sur Align ! ${url}`;
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard?.writeText(url);
        Alert.alert('Lien copié', 'Lien de parrainage copié dans le presse-papier.');
      } else {
        await Share.share({ message, url, title: 'Partager mon profil Align' });
      }
    } catch (e) {
      if (e?.message !== 'User did not share') Alert.alert('Partage', e?.message || 'Impossible de partager.');
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
        <StandardHeader title="ALIGN" leftAction={<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Text style={styles.backArrow}>←</Text></TouchableOpacity>} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
      <StandardHeader
        title="ALIGN"
        leftAction={
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        onScroll={(e) => emitScrollNav(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Avatar + Username (avatar cliquable → picker + upload) ; corbeille en bas à droite si photo custom */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <TouchableOpacity
              onPress={pickAndUploadAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.85}
              style={styles.avatarTouchable}
            >
              {profile?.photoURL ? (
                <Image
                  source={{ uri: profile.photoURL }}
                  style={styles.avatar}
                  onError={() => {}}
                />
              ) : (
                <Image source={defaultAvatar} style={styles.avatar} resizeMode="cover" />
              )}
              {uploadingAvatar ? (
                <View style={styles.avatarLoadingOverlay}>
                  <Text style={styles.avatarLoadingText}>...</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            {/* Icône stylet (modifier photo) — symétrique à la corbeille, bas gauche */}
            <TouchableOpacity
              onPress={pickAndUploadAvatar}
              disabled={uploadingAvatar}
              style={[
                styles.avatarEditWrap,
                editHovered && styles.avatarEditWrapHover,
                Platform.OS === 'web' && { transitionProperty: 'opacity, transform', transitionDuration: '250ms', transitionTimingFunction: 'ease' },
              ]}
              activeOpacity={0.9}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              onMouseEnter={Platform.OS === 'web' ? () => setEditHovered(true) : undefined}
              onMouseLeave={Platform.OS === 'web' ? () => setEditHovered(false) : undefined}
            >
              <Ionicons name="pencil" size={22} color="#ACACAC" />
            </TouchableOpacity>
            {/* Corbeille (supprimer photo) — bas droite, uniquement si photo existe */}
            {profile?.photoURL ? (
              <TouchableOpacity
                onPress={confirmDeleteProfilePhoto}
                style={[
                  styles.avatarTrashWrap,
                  trashHovered && styles.avatarTrashWrapHover,
                  Platform.OS === 'web' && { transitionProperty: 'opacity, transform', transitionDuration: '250ms', transitionTimingFunction: 'ease' },
                ]}
                activeOpacity={0.9}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                onMouseEnter={Platform.OS === 'web' ? () => setTrashHovered(true) : undefined}
                onMouseLeave={Platform.OS === 'web' ? () => setTrashHovered(false) : undefined}
              >
                <Image source={trashIcon} style={styles.avatarTrashImage} resizeMode="contain" />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.username}>{displayUsername}</Text>
        </View>

        {/* Bloc PRÉNOM / NOM D'UTILISATEUR */}
        <View style={styles.block}>
          <Text style={styles.blockLabel}>PRÉNOM</Text>
          <View style={styles.row}>
            <Text style={styles.blockValue}>{firstName || '—'}</Text>
            {firstNameCooldown.modifiable ? (
              <TouchableOpacity onPress={() => openEdit('first_name', firstName)} style={styles.pencil}>
                <Text style={styles.pencilText}>✎</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.cooldownHint}>Modifiable dans {firstNameCooldown.daysLeft} jours</Text>
            )}
          </View>
          <Text style={[styles.blockLabel, { marginTop: 16 }]}>NOM D'UTILISATEUR</Text>
          <View style={styles.row}>
            <Text style={styles.blockValue}>{displayUsername}</Text>
            {usernameCooldown.modifiable ? (
              <TouchableOpacity onPress={() => openEdit('username', username)} style={styles.pencil}>
                <Text style={styles.pencilText}>✎</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.cooldownHint}>Modifiable dans {usernameCooldown.daysLeft} jours</Text>
            )}
          </View>
        </View>

        {/* Bloc RÉCAP */}
        <View style={styles.block}>
          <Text style={styles.blockLabel}>RÉCAP</Text>
          <View style={styles.recapRow}>
            <Image source={xpIcon} style={styles.recapIconImageXp} />
            <Text style={styles.recapText}>Niveau {progress?.level ?? 0}</Text>
          </View>
          <View style={styles.recapRow}>
            <Image source={flameIcon} style={styles.recapIconImage} />
            <Text style={styles.recapText}>{progress?.streakCount ?? 0} jours</Text>
          </View>
          <View style={styles.recapRow}>
            <Image source={starIcon} style={styles.recapIconImage} />
            <Text style={styles.recapText}>{progress?.stars ?? 0} étoiles</Text>
          </View>
          <View style={styles.recapRow}>
            <Image source={modulesDoneIcon} style={styles.recapIconImage} />
            <Text style={styles.recapText}>{progress?.modulesCompleted ?? 0} modules complétés</Text>
          </View>
        </View>

        {/* Bloc SECTEUR FAVORI / MÉTIER FAVORI */}
        <View style={styles.block}>
          <Text style={styles.blockLabel}>SECTEUR FAVORI</Text>
          <Text style={styles.blockValue}>{progress?.sector ?? '—'}</Text>
          <Text style={[styles.blockLabel, { marginTop: 16 }]}>MÉTIER FAVORI</Text>
          <Text style={styles.blockValue}>{progress?.job ?? '—'}</Text>
        </View>

        {/* Bouton PARTAGER MON PROFIL */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
          <Text style={styles.shareButtonText}>PARTAGER MON PROFIL</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal édition : fermeture uniquement sur Annuler ou après succès Enregistrer (tap overlay ferme) */}
      <Modal visible={!!editField} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditField(null)}>
          <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {editField === 'first_name' ? 'Prénom' : "Nom d'utilisateur"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={editField === 'username' ? 'sans @' : 'Prénom'}
              placeholderTextColor="#8E8E8E"
              autoCapitalize={editField === 'first_name' ? 'words' : 'none'}
              editable={!saving}
            />
            {editError ? <Text style={styles.modalError}>{editError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditField(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveEdit} disabled={saving}>
                <Text style={styles.modalSaveText}>{saving ? '...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 8 },
  backArrow: { fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#FFFFFF', fontFamily: theme.fonts.body },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 100 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarTouchable: { position: 'relative' },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarTrashWrap: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  avatarEditWrap: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  avatarEditWrapHover: {
    opacity: 1,
    transform: [{ translateY: -1 }],
  },
  avatarTrashWrapHover: {
    opacity: 1,
    transform: [{ translateY: -1 }],
  },
  avatarTrashImage: {
    width: 24,
    height: 24,
  },
  avatarTrashIcon: {
    fontSize: 24,
    color: '#E04A4A',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: BLOCK_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { fontSize: 56, color: VALUE_COLOR, fontFamily: theme.fonts.title },
  avatarLoadingOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoadingText: { color: '#FFF', fontSize: 18 },
  username: {
    marginTop: 16,
    fontSize: 18,
    color: VALUE_COLOR,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
  },
  block: {
    backgroundColor: BLOCK_BG,
    borderRadius: BLOCK_RADIUS,
    paddingVertical: 20,
    paddingLeft: 40,
    paddingRight: 20,
    marginBottom: 28,
  },
  blockLabel: {
    fontSize: 12,
    color: LABEL_COLOR,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  blockValue: {
    fontSize: 16,
    color: VALUE_COLOR,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  pencil: { padding: 8 },
  pencilText: { fontSize: 18, color: LABEL_COLOR },
  cooldownHint: { fontSize: 12, color: '#B0B0B0', fontFamily: theme.fonts.button },
  recapRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  recapIcon: { fontSize: 18, marginRight: 12 },
  recapIconImage: { width: 20, height: 20, marginRight: 12 },
  recapIconImageXp: { width: 25, height: 25, marginRight: 12 },
  recapText: { fontSize: 16, color: VALUE_COLOR, fontFamily: theme.fonts.button, fontWeight: '900' },
  shareButton: {
    backgroundColor: '#00AAFF',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
  },
  shareButtonText: {
    fontFamily: theme.fonts.title,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: BLOCK_BG,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: { fontSize: 16, color: VALUE_COLOR, fontFamily: theme.fonts.button, fontWeight: '900', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: LABEL_COLOR,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: VALUE_COLOR,
    marginBottom: 8,
  },
  modalError: { fontSize: 12, color: '#FF6B6B', marginBottom: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalCancel: { padding: 10 },
  modalCancelText: { color: LABEL_COLOR, fontFamily: theme.fonts.button },
  modalSave: { backgroundColor: '#00AAFF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999 },
  modalSaveText: { color: '#FFFFFF', fontFamily: theme.fonts.button, fontWeight: '900' },
});
