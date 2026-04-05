import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ScrollView, Image } from 'react-native';
import GradientBrand from '../components/GradientBrand';
import { BellIcon, MapPinIcon, ClockIcon, ChevronDownIcon } from '../components/Icons';
import { CalendarIcon, CollectionIcon, ReportIcon } from '../components/TabIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useZone } from '../context/ZoneContext';
import { colors, shadows } from '../theme';
import api from '../api/axios';

const DAY_MAP = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

function getNextCollectionDate(dayName, time) {
  const now = new Date();
  const targetDay = DAY_MAP[dayName];
  if (targetDay === undefined) return null;

  const currentDay = now.getDay();
  let daysAhead = targetDay - currentDay;

  // Parse time
  const match = time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let hours = 7, mins = 0;
  if (match) {
    hours = parseInt(match[1]);
    mins = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  }

  // If today is the collection day, check if time hasn't passed yet
  if (daysAhead === 0) {
    const todayCollection = new Date(now);
    todayCollection.setHours(hours, mins, 0, 0);
    if (todayCollection <= now) daysAhead = 7; // already passed today, next week
  } else if (daysAhead < 0) {
    daysAhead += 7;
  }

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysAhead);
  nextDate.setHours(hours, mins, 0, 0);
  return nextDate;
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Now!';
  const totalMins = Math.floor(ms / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const minutes = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatCollectionDay(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export default function HomeScreen({ navigation }) {
  const { zone, clearZone, language, profile } = useZone();
  const en = language === 'en';
  const [stats, setStats] = useState({ total: 0, critical: 0, healthy: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [nextCollection, setNextCollection] = useState(null);
  const [nextCollectionDate, setNextCollectionDate] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [hasUnread, setHasUnread] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/bins', { params: { zone } });
      const list = data.bins || [];
      const total = list.length;
      const critical = list.filter((b) => b.status === 'critical').length;
      const optimal = list.filter((b) => b.status === 'optimal').length;
      setStats({
        total,
        critical,
        healthy: total > 0 ? Math.round((optimal / total) * 100) : 0,
      });
    } catch {
      setStats({ total: 0, critical: 0, healthy: 0 });
    }
    try {
      const { data } = await api.get(`/schedule/${zone}`);
      if (data.length) {
        // Find the soonest upcoming collection
        let soonest = null;
        let soonestDate = null;
        for (const item of data) {
          const d = getNextCollectionDate(item.day, item.time);
          if (d && (!soonestDate || d < soonestDate)) {
            soonest = item;
            soonestDate = d;
          }
        }
        if (soonest) {
          setNextCollection(soonest);
          setNextCollectionDate(soonestDate);
        }
      }
    } catch {
      setNextCollection({ day: 'Thursday', time: '7:00 AM', wasteTypes: ['General', 'Recyclable'] });
      setNextCollectionDate(getNextCollectionDate('Thursday', '7:00 AM'));
    }
  }, [zone]);

  // Live countdown timer
  useEffect(() => {
    if (!nextCollectionDate) return;
    const update = () => {
      const ms = nextCollectionDate.getTime() - Date.now();
      setCountdown(formatCountdown(ms));
    };
    update();
    const interval = setInterval(update, 60000); // update every minute
    return () => clearInterval(interval);
  }, [nextCollectionDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Check for new announcements and report status updates
  useEffect(() => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const checkUpdates = async () => {
      try {
        const lastSeen = await AsyncStorage.getItem('lastNotifCheck');
        const lastTime = lastSeen ? new Date(lastSeen).getTime() : 0;

        // Check announcements
        let hasNew = false;
        try {
          const { data: announcements } = await api.get('/announcements', { params: { zone } });
          hasNew = announcements.some(a => new Date(a.createdAt).getTime() > lastTime);
        } catch {}

        // Check report updates
        if (!hasNew && profile?.phone) {
          try {
            const { data: reports } = await api.get(`/reports/user/${profile.phone}`);
            hasNew = reports.some(r =>
              (r.status === 'reviewed' || r.status === 'collected') &&
              new Date(r.updatedAt).getTime() > lastTime
            );
          } catch {}
        }

        setHasUnread(hasNew);
      } catch {}
    };
    checkUpdates();
    const interval = setInterval(checkUpdates, 15000);
    return () => clearInterval(interval);
  }, [profile?.phone, zone]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const actionButtons = [
    { Icon: () => <CollectionIcon size={26} color={colors.accent} />, label: en ? 'Report a Bin' : 'Signaler', sub: en ? 'SIGNALER' : 'REPORT', onPress: () => navigation.navigate('ReportBin') },
    { Icon: () => <MapPinIcon size={26} color={colors.accent} />, label: en ? 'Nearby Bins' : 'Bacs Proches', sub: en ? 'BACS PROCHES' : 'NEARBY', onPress: () => navigation.navigate('Map') },
    { Icon: () => <CalendarIcon size={26} color={colors.accent} />, label: en ? 'Schedule' : 'Calendrier', sub: en ? 'CALENDRIER' : 'SCHEDULE', onPress: () => navigation.navigate('Collections') },
    { Icon: () => <BellIcon size={26} color="#F59E0B" />, label: en ? 'Notifications' : 'Alertes', sub: en ? 'ALERTES' : 'ALERTS', onPress: () => navigation.navigate('Reports', { tab: 'Notifications' }) },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Dark Teal Hero Banner */}
      <LinearGradient
        colors={['#0a2a3c', '#0f3d52', '#134b63']}
        style={styles.heroBanner}
      >
        {/* Header row */}
        <View style={styles.header}>
          <GradientBrand fontSize={20} />
          <TouchableOpacity
            onPress={async () => {
              await require('@react-native-async-storage/async-storage').default.setItem('lastNotifCheck', new Date().toISOString());
              setHasUnread(false);
              navigation.navigate('Reports', { tab: 'Notifications' });
            }}
            style={{ position: 'relative' }}
          >
            <BellIcon size={22} color="#F59E0B" />
            {hasUnread && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        {profile?.name && (
          <Text style={styles.greeting}>
            {en ? `Hey ${profile.name} 👋` : `Salut ${profile.name} 👋`}
          </Text>
        )}

        {/* Zone Pill */}
        <TouchableOpacity style={styles.zonePill} onPress={clearZone}>
          <MapPinIcon size={16} color="#F59E0B" />
          <Text style={styles.zoneText}>{zone}</Text>
          <ChevronDownIcon size={14} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Next Collection Card (floating on banner) */}
        <View style={styles.collectionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.collectionLabel}>
              {en ? 'NEXT COLLECTION' : 'PROCHAINE COLLECTE'}
            </Text>
            <Text style={styles.collectionTime}>
              {nextCollectionDate ? formatCollectionDay(nextCollectionDate) : 'Tomorrow'} {nextCollection?.time || '7:00 AM'}
            </Text>
            <View style={styles.countdownBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ClockIcon size={14} color="#F59E0B" />
                <Text style={styles.countdownText}>{countdown || 'Loading...'}</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Action Buttons Grid */}
      <View style={styles.actionGrid}>
        {actionButtons.map((btn, i) => (
          <TouchableOpacity key={btn.label} style={styles.actionCard} onPress={btn.onPress} activeOpacity={0.7}>
            <View style={[styles.actionIconCircle, i === 0 && { backgroundColor: '#FEF3C7' }]}>
              <btn.Icon />
            </View>
            <Text style={styles.actionLabel}>{btn.label}</Text>
            <Text style={styles.actionSub}>{btn.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Zone Status */}
      <View style={styles.zoneStatusSection}>
        <Text style={styles.zoneStatusTitle}>{(zone || 'ZONE').toUpperCase()} ZONE STATUS</Text>
        <View style={styles.zoneStatsRow}>
          <View style={styles.zoneStat}>
            <Text style={[styles.zoneStatValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={styles.zoneStatLabel}>{en ? 'Total Bins' : 'Total Bacs'}</Text>
          </View>
          <View style={styles.zoneStatDivider} />
          <View style={styles.zoneStat}>
            <Text style={[styles.zoneStatValue, { color: colors.critical }]}>{stats.critical}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.zoneStatLabel}>{en ? 'Critical' : 'Critique'}</Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.critical }} />
            </View>
          </View>
          <View style={styles.zoneStatDivider} />
          <View style={styles.zoneStat}>
            <Text style={[styles.zoneStatValue, { color: colors.accent }]}>{stats.healthy}%</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.zoneStatLabel}>{en ? 'Healthy' : 'Sain'}</Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
            </View>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentCard}>
        <View style={styles.recentLeft}>
          <View style={styles.recentIcon}>
            <CollectionIcon size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recentTitle}>
              {en ? 'Recent report near Market Square' : 'Signalement récent près du Marché'}
            </Text>
            <Text style={styles.recentStatus}>● {en ? 'Reviewed' : 'Examiné'}</Text>
          </View>
        </View>
        <Text style={styles.recentTime}>2h ago</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Hero Banner
  heroBanner: {
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    marginBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginBottom: 8 },

  // Zone Selector (on dark banner)
  zonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 6,
  },
  zoneDot: { fontSize: 12 },
  zoneText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  zoneChevron: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  // Collection Card (floating on banner)
  collectionCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  collectionTime: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  countdownBadge: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  countdownText: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },

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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    alignItems: 'center',
    ...shadows.card,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    alignItems: 'center',
    ...shadows.card,
  },
  zoneStat: { flex: 1, alignItems: 'center' },
  zoneStatDivider: { width: 1, height: 40, backgroundColor: colors.cardBorder },
  zoneStatValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  zoneStatLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  // Recent Activity
  recentCard: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.soft,
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
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#0a2a3c',
  },
});
