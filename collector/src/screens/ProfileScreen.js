import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, shadows } from '../theme';
import api from '../api/axios';

function PerformanceCircle({ percentage = 94, size = 80, strokeWidth = 8 }) {
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
  const { user, logout, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);

  const initials = (user?.name || 'C').split(' ').map((n) => n[0]).join('');
  const name = user?.name || 'Collector';
  const truck = user?.truck || 'Truck #204';
  const zone = user?.zone || 'Molyko Zone';

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled) return;

    const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setUploading(true);
    try {
      await api.put('/collectors/me/avatar', { avatar: base64 }, { timeout: 30000 });
      if (updateUser) updateUser({ ...user, avatar: base64 });
      Alert.alert('Success', 'Profile picture updated!');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      Alert.alert('Error', `Failed to upload: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <LinearGradient colors={gradients.screenBgWarm} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Image source={require('../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        </View>

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
                <Text style={styles.cameraIcon}>📷</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>FIELD COLLECTOR</Text>
          </View>
          <Text style={styles.meta}>{truck} · {zone} · <Text style={styles.activeStatus}>Active</Text></Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'BINS THIS MONTH', value: '184' },
            { label: 'AVG RESPONSE', value: '18min' },
            { label: 'ISSUES LOGGED', value: '3' },
            { label: 'DAYS ACTIVE', value: '22' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Performance */}
        <View style={styles.perfSection}>
          <View style={styles.perfInfo}>
            <Text style={styles.perfTitle}>Performance</Text>
            <Text style={styles.perfSubtitle}>Operational efficiency score</Text>
          </View>
          <PerformanceCircle percentage={94} />
        </View>

        {/* Featured Collection */}
        <View style={styles.featuredSection}>
          <Text style={styles.featuredLabel}>FEATURED COLLECTION</Text>
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
                <Text style={styles.featuredTitle}>Main Market Route Clear</Text>
                <Text style={styles.featuredMeta}>Completed 2 hours ago · Sector A-12</Text>
              </LinearGradient>
            </ImageBackground>
          </View>
        </View>

        {/* Contact Supervisor */}
        <TouchableOpacity style={styles.contactButton} activeOpacity={0.8} onPress={() => navigation?.navigate?.('Chat')}>
          <Text style={styles.contactText}>💬 Chat with Admin</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>🔓 Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

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
  cameraIcon: { fontSize: 14 },
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
