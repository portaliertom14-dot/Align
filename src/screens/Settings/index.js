/**
 * Écran Paramètres — redesign DA Align
 * Header ALIGN, sections COMPTE / PROGRESSION / LÉGAL, blocs #333D4B, bouton SE DÉCONNECTER.
 * Aucun autre écran modifié.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Platform, Switch, Linking, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile } from '../../lib/userProfile';
import { getUserProgress } from '../../lib/userProgressSupabase';
import { useAuth } from '../../context/AuthContext';
import { clearAuthState } from '../../services/authState';
import { downloadUserData } from '../../services/dataExport';
import { deleteMyAccount } from '../../services/accountDeletion';
import { SUPPORT_EMAIL } from '../../config/appConfig';
import Header from '../../components/Header';
import BottomNavBar from '../../components/BottomNavBar';
import HoverableText from '../../components/HoverableText';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';
import { useSoundSettings } from '../../context/SoundContext';

const DELETE_RED = '#EC3912';

// Rayon unique pour tous les blocs (très arrondi)
const BLOCK_RADIUS = 48;
// Dégradé titres de sections : FF7B2B → FFD93F (Bowlby One SC)
const SECTION_TITLE_GRADIENT = ['#FF7B2B', '#FFD93F'];
const LABEL_COLOR = '#ACACAC';
const BLOCK_BG = '#333D4B';
const LOGOUT_RED = '#EC3912';

/** Nom lisible pour secteur ou métier (progress) */
function getMetierDisplayName(progress) {
  if (!progress) return 'Non défini';
  const metier = progress.activeMetier || progress.activeMetierId;
  const sector = progress.activeDirection;
  const metierNames = {
    developpeur: 'Développeur logiciel',
    entrepreneur: 'Entrepreneur',
    designer: 'Designer',
    avocat: 'Avocat',
    medecin: 'Médecin',
    data_scientist: 'Data Scientist',
  };
  const sectorNames = {
    tech: 'Tech',
    business: 'Business',
    creation: 'Création',
    droit: 'Droit',
    sante: 'Santé',
    santé: 'Santé',
  };
  if (metier && metierNames[metier]) return metierNames[metier];
  if (sector && sectorNames[sector]) return sectorNames[sector];
  if (metier) return String(metier).charAt(0).toUpperCase() + String(metier).slice(1).replace(/_/g, ' ');
  if (sector) return String(sector).charAt(0).toUpperCase() + String(sector).slice(1);
  return 'Non défini';
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { signOut: authSignOut, user: authUser, authStatus } = useAuth();
  const { soundsEnabled, setSoundsEnabled } = useSoundSettings();
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [deleteLinkHover, setDeleteLinkHover] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  // .hover-lift appliqué via className (pas ref) pour ne pas être écrasé par React au re-render.

  const loadData = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
      const userProgress = await getUserProgress();
      setProgress(userProgress);
      if (__DEV__ && profile) {
        console.log('[Settings] Données profil rechargées — email:', profile.email != null ? '(présent)' : '(absent)', 'firstName:', profile.firstName ?? '(absent)');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    }
  };

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await authSignOut();
      await clearAuthState();
      // Pas de navigation.reset : RootGate affiche Welcome quand authStatus === 'signedOut'
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter, réessaie.');
    } finally {
      setLogoutLoading(false);
    }
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleAbout = () => {
    navigation.navigate('About');
  };

  const handleExportData = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      await downloadUserData();
      Alert.alert('Export terminé', 'Vos données ont été exportées.');
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible d’exporter les données. Réessaie plus tard.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleContactSupport = () => {
    const url = `mailto:${SUPPORT_EMAIL}`;
    Linking.canOpenURL(url).then((ok) => { if (ok) Linking.openURL(url); }).catch(() => {});
  };

  const openDeleteModal = () => {
    if (deleteLoading || !authUser) return;
    setDeleteConfirmChecked(false);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (!deleteLoading) setDeleteModalVisible(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmChecked || deleteLoading) return;
    setDeleteLoading(true);
    try {
      const result = await deleteMyAccount(authSignOut);
      if (result.success) {
        setDeleteModalVisible(false);
        setToastMessage('Compte supprimé');
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
        // signOut + clearAuthState déjà faits dans deleteMyAccount ; RootGate redirige vers login
      } else {
        setToastMessage('Impossible de supprimer le compte, réessaie.');
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (e) {
      setToastMessage('Impossible de supprimer le compte, réessaie.');
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  // Afficher "Non défini" / "Non renseigné" uniquement si la valeur est vraiment absente (null/undefined ou chaîne vide)
  const emailDisplay =
    userProfile?.email != null && String(userProfile.email).trim() !== ''
      ? userProfile.email
      : 'Non défini';
  const birthdateRaw = userProfile?.birthdate ?? userProfile?.date_naissance ?? userProfile?.dateNaissance;
  const birthdateFormatted =
    birthdateRaw != null && String(birthdateRaw).trim() !== ''
      ? (typeof birthdateRaw === 'string' && birthdateRaw.match(/^\d{4}-\d{2}-\d{2}$/) ? birthdateRaw : birthdateRaw)
      : 'Non renseigné';

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View
        {...(Platform.OS === 'web' ? { className: 'align-header-zone-safe' } : {})}
        style={Platform.OS !== 'web' ? { paddingTop: insets.top + 10 } : undefined}
      >
        <Header />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        dataSet={{ clarityMask: 'true' }}
      >
        {/* Titre de section : COMPTE — Bowlby One SC, dégradé */}
        <Text style={styles.sectionTitleSpacer} />
        <GradientText colors={SECTION_TITLE_GRADIENT} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 0 }} style={styles.sectionTitle}>
          COMPTE
        </GradientText>
        <View style={styles.block}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>ADRESSE E-MAIL</Text>
            <Text style={styles.value}>{emailDisplay}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoItem}>
            <Text style={styles.label}>DATE DE NAISSANCE</Text>
            <Text style={styles.value}>{birthdateFormatted}</Text>
          </View>
        </View>

        {/* Titre de section : PROGRESSION */}
        <GradientText colors={SECTION_TITLE_GRADIENT} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 0 }} style={styles.sectionTitle}>
          PROGRESSION
        </GradientText>
        <View style={styles.block}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>MÉTIER CHOISI</Text>
            <Text style={styles.value}>{getMetierDisplayName(progress)}</Text>
          </View>
        </View>

        {/* Titre de section : CONFORT */}
        <GradientText colors={SECTION_TITLE_GRADIENT} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 0 }} style={styles.sectionTitle}>
          CONFORT
        </GradientText>
        <View style={styles.block}>
          <View style={styles.soundRow}>
            <Text style={styles.label}>SONS</Text>
            <Text style={styles.soundDescription}>Couper les sons (quiz, validation)</Text>
            <View style={styles.soundSwitchRow}>
              <Text style={styles.value}>{soundsEnabled ? 'Activés' : 'Coupés'}</Text>
              <Switch
                value={soundsEnabled}
                onValueChange={setSoundsEnabled}
                trackColor={{ false: '#555', true: theme.colors?.primary ?? '#FF7B2B' }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </View>

        {/* Titre de section : MES DONNÉES */}
        <GradientText colors={SECTION_TITLE_GRADIENT} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 0 }} style={styles.sectionTitle}>
          MES DONNÉES
        </GradientText>
        <View style={styles.block}>
          <TouchableOpacity style={styles.legalItem} onPress={handleExportData} disabled={exportLoading} activeOpacity={0.8}>
            <HoverableText style={styles.legalText} hoverColor="#FF7B2B">
              {exportLoading ? 'Export en cours…' : 'Télécharger mes données'}
            </HoverableText>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.legalItem} onPress={handleContactSupport} activeOpacity={0.8}>
            <HoverableText style={styles.legalText} hoverColor="#FF7B2B">
              Contact support
            </HoverableText>
          </TouchableOpacity>
        </View>

        {/* Titre de section : LÉGAL */}
        <GradientText colors={SECTION_TITLE_GRADIENT} start={{ x: 0.4, y: 0 }} end={{ x: 0.6, y: 0 }} style={styles.sectionTitle}>
          LÉGAL
        </GradientText>
        <View style={styles.block}>
          <TouchableOpacity style={styles.legalItem} onPress={handlePrivacyPolicy} activeOpacity={0.8}>
            <HoverableText style={styles.legalText} hoverColor="#FF7B2B">
              Politique de confidentialité
            </HoverableText>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.legalItem} onPress={handleAbout} activeOpacity={0.8}>
            <HoverableText style={styles.legalText} hoverColor="#FF7B2B">
              À propos
            </HoverableText>
          </TouchableOpacity>
        </View>

        {/* Bouton SE DÉCONNECTER (principal) */}
        <HoverableTouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
          disabled={logoutLoading}
          variant="button"
        >
          {logoutLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.logoutButtonText}>SE DÉCONNECTER</Text>
          )}
        </HoverableTouchableOpacity>

        {/* Lien discret : Supprimer mon compte — visible seulement si session prête */}
        {authStatus === 'signedIn' && authUser && (
          <Pressable
            onPress={openDeleteModal}
            disabled={deleteLoading}
            onHoverIn={Platform.OS === 'web' ? () => setDeleteLinkHover(true) : undefined}
            onHoverOut={Platform.OS === 'web' ? () => setDeleteLinkHover(false) : undefined}
            style={styles.deleteLinkWrap}
          >
            <Text style={[styles.deleteLinkText, deleteLinkHover && styles.deleteLinkTextHover]}>
              Supprimer mon compte
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Modal confirmation suppression compte */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tu es sûr de vouloir supprimer ton compte ?</Text>
            <Text style={styles.modalBody}>
              Tu vas mettre fin à ton aventure ici… 😔{'\n'}
              Cette action est définitive : tes données seront supprimées.
            </Text>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => !deleteLoading && setDeleteConfirmChecked((c) => !c)}
              disabled={deleteLoading}
            >
              <View style={[styles.checkbox, deleteConfirmChecked && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>Je confirme vouloir supprimer définitivement mon compte</Text>
            </Pressable>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={closeDeleteModal} disabled={deleteLoading} activeOpacity={0.8}>
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonDelete, (!deleteConfirmChecked || deleteLoading) && styles.modalButtonDeleteDisabled]}
                onPress={handleDeleteConfirm}
                disabled={!deleteConfirmChecked || deleteLoading}
                activeOpacity={0.8}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonDeleteText}>Supprimer définitivement</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast feedback */}
      {toastMessage != null && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <BottomNavBar />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  sectionTitleSpacer: {
    height: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.title,
    marginBottom: 12,
    marginLeft: 32,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  block: {
    marginBottom: 28,
    paddingVertical: 20,
    paddingLeft: 40,
    paddingRight: 20,
    backgroundColor: BLOCK_BG,
    borderRadius: BLOCK_RADIUS,
  },
  infoItem: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.button,
    color: LABEL_COLOR,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  separator: {
    height: 1,
    backgroundColor: LABEL_COLOR,
    marginVertical: 14,
    opacity: 0.6,
  },
  soundRow: {
    marginBottom: 4,
  },
  soundDescription: {
    fontSize: 13,
    fontFamily: theme.fonts.button,
    color: LABEL_COLOR,
    marginTop: 2,
    marginBottom: 10,
  },
  soundSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legalItem: {
    paddingVertical: 12,
  },
  legalText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  logoutButton: {
    alignSelf: 'stretch',
    backgroundColor: LOGOUT_RED,
    borderRadius: BLOCK_RADIUS,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  logoutButtonText: {
    fontSize: 18,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  deleteLinkWrap: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
    paddingVertical: 6,
    paddingHorizontal: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  deleteLinkText: {
    fontSize: 13,
    fontFamily: theme.fonts.button,
    color: '#888',
    textDecorationLine: 'none',
  },
  deleteLinkTextHover: {
    color: DELETE_RED,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    backgroundColor: BLOCK_BG,
    borderRadius: 24,
    padding: 28,
    maxWidth: 420,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    fontFamily: theme.fonts.body,
    color: '#CCC',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#888',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: DELETE_RED,
    borderColor: DELETE_RED,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#CCC',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButtonCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#555',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#FFF',
    fontWeight: '700',
  },
  modalButtonDelete: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: DELETE_RED,
    minWidth: 120,
    alignItems: 'center',
  },
  modalButtonDeleteDisabled: {
    opacity: 0.5,
  },
  modalButtonDeleteText: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#FFF',
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: 15,
    fontFamily: theme.fonts.button,
    color: '#FFF',
  },
});
