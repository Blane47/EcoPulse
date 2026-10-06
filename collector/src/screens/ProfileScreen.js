import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, shadows } from '../theme';
import { CameraIcon, LogoutIcon } from '../components/Icons';
import api from '../api/axios';
import TealHeader from '../components/TealHeader';
import { shrinkPhoto } from '../utils/shrinkPhoto';

function PerformanceCircle({ percentage = 0, size = 80, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.cardBorder} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.accent} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.perfValue}>{percentage}%</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser, language, selectLanguage } = useAuth();
  const en = language === 'en';
  const [uploading, setUploading] = useState(false);
  const [profileStats, setProfileStats] = useState({ bins: 0, assigned: 0, issues: 0 });
  const [statsError, setStatsError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/collectors/me/route');
      const bins = data.bins || [];
      const collected = bins.filter(b => b.fillLevel === 0 || b.status === 'optimal').length;
      setProfileStats({
        bins: collected,
        assigned: bins.length,
        issues: bins.filter(b => b.status === 'critical').length,
      });
      setStatsError(false);
    } catch {
      setStatsError(true);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const initials = (user?.name || 'C').split(' ').map((n) => n[0]).join('');
  const name = user?.name || (en ? 'Collector' : 'Collecteur');
  const truck = user?.truck || (en ? 'No truck assigned' : 'Aucun camion assigné');
  const zone = user?.zone || '—';
  const daysActive = user?.createdAt
    ? String(Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))
    : '—';

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        en ? 'Permission needed' : 'Autorisation requise',
        en ? 'Please allow access to your photo library.' : "Veuillez autoriser l'accès à votre galerie photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    let base64;
    try {
      base64 = (await shrinkPhoto(result.assets[0], 512)).dataUrl;
    } catch {
      Alert.alert(en ? 'Photo problem' : 'Problème de photo', en ? 'Could not process the photo. Please try again.' : 'Impossible de traiter la photo. Veuillez réessayer.');
      return;
    }
    setUploading(true);
    try {
      await api.put('/collectors/me/avatar', { avatar: base64 }, { timeout: 30000 });
      if (updateUser) updateUser({ ...user, avatar: base64 });
      Alert.alert(en ? 'Success' : 'Succès', en ? 'Profile picture updated!' : 'Photo de profil mise à jour !');
    } catch (err) {
      let msg;
      if (!err.response) {
        msg = en
          ? 'Your photo could not be uploaded. Check your internet connection and try again.'
          : "Votre photo n'a pas pu être envoyée. Vérifiez votre connexion internet et réessayez.";
      } else {
        msg = en
          ? `Failed to upload: ${err.response.data?.message || 'please try again.'}`
          : "Échec de l'envoi de la photo. Veuillez réessayer.";
      }
      Alert.alert(en ? 'Upload failed' : "Échec de l'envoi", msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <LinearGradient colors={gradients.screenBgWarm} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <TealHeader title={en ? 'My Profile' : 'Mon profil'} />

        {/* Profile Hero with real image */}
        <View style={styles.heroSection}>
          <View style={styles.heroBg}>
            <Image
              source={require('../assets/images/collector-hero.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} activeOpacity={0.8}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <CameraIcon size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{en ? 'FIELD COLLECTOR' : 'COLLECTEUR DE TERRAIN'}</Text>
          </View>
          <Text style={styles.meta}>{truck} · {zone} · <Text style={[styles.activeStatus, user?.status === 'on-leave' && { color: colors.warning }, user?.status === 'inactive' && { color: colors.critical }]}>{user?.status === 'on-leave' ? (en ? 'On Leave' : 'En congé') : user?.status === 'inactive' ? (en ? 'Inactive' : 'Inactif') : (en ? 'Active' : 'Actif')}</Text></Text>
        </View>

        {/* Stats Grid */}
        {statsError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{en ? "Couldn't load your stats" : 'Impossible de charger vos statistiques'}</Text>
            <Text style={styles.errorText}>
              {en ? 'Check your internet connection and try again.' : 'Vérifiez votre connexion internet et réessayez.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchStats}>
              <Text style={styles.retryText}>{en ? 'Retry' : 'Réessayer'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {[
              { label: en ? 'BINS COLLECTED' : 'BACS COLLECTÉS', value: String(profileStats.bins) },
              { label: en ? 'ASSIGNED BINS' : 'BACS ASSIGNÉS', value: String(profileStats.assigned) },
              { label: en ? 'CRITICAL BINS' : 'BACS CRITIQUES', value: String(profileStats.issues) },
              { label: en ? 'DAYS ACTIVE' : 'JOURS ACTIFS', value: daysActive },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Performance */}
        <View style={styles.perfSection}>
          <View style={styles.perfInfo}>
            <Text style={styles.perfTitle}>Performance</Text>
            <Text style={styles.perfSubtitle}>{en ? 'Operational efficiency score' : "Score d'efficacité opérationnelle"}</Text>
          </View>
          <PerformanceCircle percentage={user?.efficiency ?? 0} />
        </View>

        {/* Language */}
        <View style={styles.langSection}>
          <Text style={styles.langTitle}>{en ? 'Language' : 'Langue'}</Text>
          <View style={styles.langSwitch}>
            {['en', 'fr'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langOption, language === lang && styles.langOptionActive]}
                onPress={() => selectLanguage(lang)}
                activeOpacity={0.8}
              >
                <Text style={[styles.langOptionText, language === lang && styles.langOptionTextActive]}>
                  {lang.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Collection */}
        <View style={styles.featuredSection}>
          <Text style={styles.featuredLabel}>{en ? 'FEATURED COLLECTION' : 'COLLECTE EN VEDETTE'}</Text>
          <View style={styles.featuredCard}>
            <ImageBackground
              source={require('../assets/images/truck-featured.png')}
              style={styles.featuredImage}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.featuredGradient}
              >
                <Text style={styles.featuredTitle}>{en ? `${zone} Route` : `Itinéraire ${zone}`}</Text>
                <Text style={styles.featuredMeta}>
                  {statsError ? truck : `${profileStats.bins} ${en ? 'bins collected' : 'bacs collectés'} · ${truck}`}
                </Text>
              </LinearGradient>
            </ImageBackground>
          </View>
        </View>

        {/* Contact Supervisor */}
        <TouchableOpacity style={styles.contactButton} activeOpacity={0.8} onPress={() => navigation?.navigate?.('Chat')}>
          <Text style={styles.contactText}>{en ? 'Chat with Admin' : "Discuter avec l'admin"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactButton} activeOpacity={0.8} onPress={() => navigation?.navigate?.('ChangePassword')}>
          <Text style={styles.contactText}>{en ? 'Change password' : 'Modifier le mot de passe'}</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              en ? 'Sign Out' : 'Déconnexion',
              en ? 'Are you sure you want to sign out?' : 'Voulez-vous vraiment vous déconnecter ?',
              [
                { text: en ? 'Cancel' : 'Annuler', style: 'cancel' },
                { text: en ? 'Sign Out' : 'Se déconnecter', style: 'destructive', onPress: logout },
              ]
            );
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogoutIcon size={18} color="#ef4444" />
            <Text style={styles.logoutText}>{en ? 'Sign Out' : 'Se déconnecter'}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 10,
  },
  backArrow: { fontSize: 22, color: colors.accent, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.accent },
  headerLogo: { width: 28, height: 28, borderRadius: 6 },

  // Hero
  heroSection: { alignItems: 'center', marginBottom: 24 },
  heroBg: {
    width: '100%',
    height: 140,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 400,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  avatarContainer: { marginTop: -44 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    ...shadows.cardHover,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: '#fff',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIcon: { },
  avatarText: { fontSize: 30, fontWeight: '800', color: colors.accent },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 12 },
  roleBadge: {
    backgroundColor: colors.accentLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  roleText: { fontSize: 11, fontWeight: '700', color: colors.accent, letterSpacing: 1 },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 10 },
  activeStatus: { color: colors.accent, fontWeight: '600' },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
    padding: 16,
    ...shadows.card,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text },

  // Load error
  errorBox: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.criticalLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 16,
    alignItems: 'center',
  },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#991b1b' },
  errorText: { fontSize: 12, color: '#b91c1c', textAlign: 'center', marginTop: 4, lineHeight: 17 },
  retryBtn: { marginTop: 12, backgroundColor: colors.critical, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 8 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Performance
  perfSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  perfInfo: { flex: 1 },
  perfTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  perfSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  perfValue: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent,
  },

  // Language
  langSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 20,
    ...shadows.card,
  },
  langTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  langSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 3,
  },
  langOption: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  langOptionActive: { backgroundColor: colors.accent },
  langOptionText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
  langOptionTextActive: { color: '#fff' },

  // Featured
  featuredSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featuredLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  featuredCard: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 160,
    ...shadows.cardHover,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  featuredMeta: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

  // Contact
  contactButton: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(34,197,94,0.04)',
  },
  contactText: { fontSize: 14, fontWeight: '700', color: colors.accent },

  // Logout
  logoutButton: {
    alignItems: 'center',
    padding: 14,
    marginBottom: 20,
  },
  logoutText: { fontSize: 14, color: colors.textSecondary },
});
