import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ScrollView, Image } from 'react-native';
import GradientBrand from '../components/GradientBrand';
import { LinearGradient } from 'expo-linear-gradient';
import { useZone } from '../context/ZoneContext';
import { colors, getColors } from '../theme';
import api from '../api/axios';

export default function HomeScreen({ navigation }) {
  const { zone, clearZone, language, profile, darkMode } = useZone();
  const c = getColors(darkMode);
  const en = language === 'en';
  const [stats, setStats] = useState({ total: 0, critical: 0, healthy: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [nextCollection, setNextCollection] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/bins', { params: { zone } });
      const list = data.bins || [];
      const total = list.length;
      const critical = list.filter((b) => b.status === 'critical').length;
      const optimal = list.filter((b) => b.status === 'optimal').length;
      setStats({
        total: total || 88,
        critical: critical || 4,
        healthy: total > 0 ? Math.round((optimal / total) * 100) : 84,
      });
    } catch {
      setStats({ total: 88, critical: 4, healthy: 84 });
    }
    try {
      const { data } = await api.get(`/schedule/${zone}`);
      if (data.length) setNextCollection(data[0]);
    } catch {
      setNextCollection({ day: 'Tomorrow', time: '7:00 AM', wasteTypes: ['General', 'Recyclable'] });
    }
  }, [zone]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Check for report status updates (reviewed or collected)
  useEffect(() => {
    if (!profile?.phone) return;
    const checkUpdates = async () => {
      try {
        const { data } = await api.get(`/reports/user/${profile.phone}`);
        // Check if any reports were updated since last seen
        const lastSeen = await require('@react-native-async-storage/async-storage').default.getItem('lastReportCheck');
        const lastTime = lastSeen ? new Date(lastSeen).getTime() : 0;
        const hasUpdates = data.some(r =>
          (r.status === 'reviewed' || r.status === 'collected') &&
          new Date(r.updatedAt).getTime() > lastTime
        );
        setHasUnread(hasUpdates);
      } catch {}
    };
    checkUpdates();
    const interval = setInterval(checkUpdates, 15000);
    return () => clearInterval(interval);
  }, [profile?.phone]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const actionButtons = [
    { icon: '🗑️', label: en ? 'Report a Bin' : 'Signaler', sub: en ? 'SIGNALER' : 'REPORT', onPress: () => navigation.navigate('ReportBin') },
    { icon: '📍', label: en ? 'Nearby Bins' : 'Bacs Proches', sub: en ? 'BACS PROCHES' : 'NEARBY', onPress: () => navigation.navigate('Map') },
    { icon: '📅', label: en ? 'Schedule' : 'Calendrier', sub: en ? 'CALENDRIER' : 'SCHEDULE', onPress: () => navigation.navigate('Schedule') },
    { icon: '🔔', label: en ? 'Notifications' : 'Alertes', sub: en ? 'ALERTES' : 'ALERTS', onPress: () => navigation.navigate('History') },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <GradientBrand fontSize={20} />
        <TouchableOpacity
          onPress={async () => {
            await require('@react-native-async-storage/async-storage').default.setItem('lastReportCheck', new Date().toISOString());
            setHasUnread(false);
            navigation.navigate('Reports');
          }}
          style={{ position: 'relative' }}
        >
          <Text style={{ fontSize: 20 }}>🔔</Text>
          {hasUnread && <View style={[styles.notifDot, { borderColor: c.background }]} />}
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      {profile?.name && (
        <Text style={[styles.greeting, { color: c.text }]}>
          {en ? `Hey ${profile.name} 👋` : `Salut ${profile.name} 👋`}
        </Text>
      )}

      {/* Zone Selector */}
      <TouchableOpacity style={[styles.zonePill, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={clearZone}>
        <Text style={styles.zoneDot}>📍</Text>
        <Text style={[styles.zoneText, { color: c.text }]}>{zone}</Text>
        <Text style={[styles.zoneChevron, { color: c.textMuted }]}>▾</Text>
      </TouchableOpacity>

      {/* Next Collection Banner */}
      <View style={styles.bannerContainer}>
        <View style={styles.banner}>
          <View style={styles.bannerBg}>
            <Text style={styles.bannerTruck}>🚛</Text>
          </View>
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
            style={styles.bannerOverlay}
          >
            <Text style={styles.bannerLabel}>
              {en ? 'NEXT COLLECTION' : 'PROCHAINE COLLECTE'}
            </Text>
            <Text style={styles.bannerTime}>
              {nextCollection?.day || 'Tomorrow'} {nextCollection?.time || '7:00 AM'}
            </Text>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>⏱️ 18h 42m</Text>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Action Buttons Grid */}
      <View style={styles.actionGrid}>
        {actionButtons.map((btn) => (
          <TouchableOpacity key={btn.label} style={[styles.actionCard, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={btn.onPress} activeOpacity={0.7}>
            <View style={[styles.actionIconCircle, { backgroundColor: c.accentLight }]}>
              <Text style={styles.actionIcon}>{btn.icon}</Text>
            </View>
            <Text style={[styles.actionLabel, { color: c.text }]}>{btn.label}</Text>
            <Text style={[styles.actionSub, { color: c.textMuted }]}>{btn.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Zone Status */}
      <View style={styles.zoneStatusSection}>
        <Text style={[styles.zoneStatusTitle, { color: c.textMuted }]}>{(zone || 'ZONE').toUpperCase()} ZONE STATUS</Text>
        <View style={[styles.zoneStatsRow, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={styles.zoneStat}>
            <Text style={[styles.zoneStatValue, { color: c.text }]}>{stats.total}</Text>
            <Text style={[styles.zoneStatLabel, { color: c.textSecondary }]}>{en ? 'Total Bins' : 'Total Bacs'}</Text>
          </View>
          <View style={[styles.zoneStatDivider, { backgroundColor: c.cardBorder }]} />
          <View style={styles.zoneStat}>
            <Text style={[styles.zoneStatValue, { color: c.critical }]}>{stats.critical}</Text>
            <Text style={[styles.zoneStatLabel, { color: c.textSecondary }]}>{en ? 'Critical' : 'Critique'} 🔴</Text>
          </View>
          <View style={[styles.zoneStatDivider, { backgroundColor: c.cardBorder }]} />
          <View style={styles.zoneStat}>
            <Text style={[styles.zoneStatValue, { color: c.accent }]}>{stats.healthy}%</Text>
            <Text style={[styles.zoneStatLabel, { color: c.textSecondary }]}>{en ? 'Healthy' : 'Sain'} 🟢</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={[styles.recentCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={styles.recentLeft}>
          <View style={[styles.recentIcon, { backgroundColor: c.background }]}>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recentTitle, { color: c.text }]}>
              {en ? 'Recent report near Market Square' : 'Signalement récent près du Marché'}
            </Text>
            <Text style={[styles.recentStatus, { color: c.accent }]}>● {en ? 'Reviewed' : 'Examiné'}</Text>
          </View>
        </View>
        <Text style={[styles.recentTime, { color: c.textMuted }]}>2h ago</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 55 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  brandText: { fontSize: 22, fontWeight: '900', color: '#1a3c3c', letterSpacing: 5 },
  greeting: { fontSize: 20, fontWeight: '700', color: colors.text, paddingHorizontal: 20, marginBottom: 4 },

  // Zone Selector
  zonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  zoneDot: { fontSize: 12 },
  zoneText: { fontSize: 13, fontWeight: '600', color: colors.text },
  zoneChevron: { fontSize: 12, color: colors.textMuted },

  // Banner
  bannerContainer: { paddingHorizontal: 20, marginBottom: 20 },
  banner: {
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1a472a',
  },
  bannerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTruck: { fontSize: 80 },
  bannerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerTime: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  countdownBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  countdownText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  // Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  actionSub: { fontSize: 9, fontWeight: '600', color: colors.textMuted, letterSpacing: 1 },

  // Zone Status
  zoneStatusSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  zoneStatusTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  zoneStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    alignItems: 'center',
  },
  zoneStat: { flex: 1, alignItems: 'center' },
  zoneStatDivider: { width: 1, height: 40, backgroundColor: colors.cardBorder },
  zoneStatValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  zoneStatLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  // Recent Activity
  recentCard: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  recentStatus: { fontSize: 11, color: colors.accent, marginTop: 2 },
  recentTime: { fontSize: 11, color: colors.textMuted },

  // Notification dot
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
});
