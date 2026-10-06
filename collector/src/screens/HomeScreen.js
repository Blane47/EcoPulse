import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import GradientBrand from '../components/GradientBrand';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { colors, gradients, shadows } from '../theme';
import { navigateToBin } from '../utils/collectBin';
import { BellIcon, MapPinIcon, CheckIcon, ClockIcon } from '../components/Icons';
import api from '../api/axios';

const truckBanner = require('../assets/images/truck-banner.png');

export default function HomeScreen({ navigation }) {
  const { user, language } = useAuth();
  const en = language === 'en';
  const { unread, notifications } = useNotifications();
  const [stats, setStats] = useState({ assigned: 0, collected: 0, remaining: 0 });
  const [priorityBins, setPriorityBins] = useState([]);
  const [assignedReports, setAssignedReports] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [{ data }, { data: reports }] = await Promise.all([
        api.get('/collectors/me/route'),
        api.get('/reports/assigned/me'),
      ]);
      const bins = data.bins || [];
      const collected = bins.filter((b) => b.fillLevel === 0 || b.status === 'optimal').length;
      setStats({ assigned: bins.length, collected, remaining: bins.length - collected });
      setPriorityBins(
        bins
          .filter((b) => b.status === 'critical' || b.status === 'warning')
          .sort((a, b) => b.fillLevel - a.fillLevel)
          .slice(0, 5)
      );
      setAssignedReports(reports.filter((r) => r.status === 'assigned'));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  // Refresh when returning to this tab and whenever a new notification arrives
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const latestNotificationId = notifications[0]?._id;
  useEffect(() => {
    if (latestNotificationId) fetchData();
  }, [fetchData, latestNotificationId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return en ? 'Good Morning' : 'Bonjour';
    if (h < 17) return en ? 'Good Afternoon' : 'Bon après-midi';
    return en ? 'Good Evening' : 'Bonsoir';
  };

  const progressPct = stats.assigned > 0 ? Math.round((stats.collected / stats.assigned) * 100) : 0;

  const statusLabel = (status) => {
    if (status === 'critical') return en ? 'CRITICAL' : 'CRITIQUE';
    if (status === 'warning') return en ? 'WARNING' : 'ALERTE';
    return 'OPTIMAL';
  };

  const statusColor = (status) => {
    if (status === 'critical') return colors.critical;
    if (status === 'warning') return colors.warning;
    return colors.accent;
  };

  const statusBg = (status) => {
    if (status === 'critical') return colors.criticalLight;
    if (status === 'warning') return colors.warningLight;
    return colors.accentLight;
  };

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <>
            {/* Teal Banner Header */}
            <LinearGradient
              colors={['#0a2a3c', '#0f3d52', '#134b63']}
              style={styles.tealBanner}
            >
              <View style={styles.tealHeaderRow}>
                <GradientBrand fontSize={20} />
                <TouchableOpacity style={styles.tealNotif} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
                  <BellIcon size={20} color="#F59E0B" />
                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {/* Greeting row */}
              <View style={styles.greetingRow}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarSmallImage} />
                ) : (
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarSmallText}>
                      {(user?.name || 'C').split(' ').map((n) => n[0]).join('')}
                    </Text>
                  </View>
                )}
                <Text style={[styles.greetingText, { color: '#fff' }]}>
                  {greeting()}, {user?.name?.split(' ')[0] || (en ? 'Collector' : 'Collecteur')} 👋
                </Text>
              </View>
            </LinearGradient>

            {/* On Leave Banner */}
            {user?.status === 'on-leave' && (
              <View style={styles.onLeaveBanner}>
                <Text style={{ fontSize: 18 }}>🏖️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onLeaveTitle}>{en ? 'You are currently on leave' : 'Vous êtes actuellement en congé'}</Text>
                  <Text style={styles.onLeaveSub}>
                    {en
                      ? 'Collection actions are disabled. Contact your supervisor to resume duty.'
                      : 'Les collectes sont désactivées. Contactez votre superviseur pour reprendre le service.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Duty Banner — Liquid Glass */}
            <View style={styles.bannerContainer}>
              <View style={styles.glassOuter}>
                {/* Background gradient layer */}
                <LinearGradient
                  colors={['rgba(22,163,74,0.85)', 'rgba(21,128,61,0.75)', 'rgba(22,101,52,0.85)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Blur layer */}
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                {/* Top shine highlight */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)', 'transparent']}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.glassShine}
                />
                {/* Refraction orb — top left */}
                <View style={styles.glassOrb1} />
                {/* Refraction orb — bottom right */}
                <View style={styles.glassOrb2} />
                {/* Content */}
                <View style={styles.bannerContentGlass}>
                  <View style={styles.bannerContent}>
                    <View style={styles.dutyBadge}>
                      <View style={[styles.dutyDot, user?.status === 'on-leave' && { backgroundColor: colors.warning }]} />
                      <Text style={styles.dutyText}>
                        {user?.status === 'on-leave' ? (en ? 'ON LEAVE' : 'EN CONGÉ') : (en ? 'ON DUTY' : 'EN SERVICE')}
                        {user?.zone ? ` — ${user.zone.toUpperCase()}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.bannerTitle}>{en ? "Today's Route Schedule" : 'Itinéraire du jour'}</Text>
                  </View>
                  <Image source={truckBanner} style={styles.bannerImage} resizeMode="contain" />
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              {[
                { Icon: () => <MapPinIcon size={20} color={colors.text} />, label: en ? 'ASSIGNED' : 'ASSIGNÉS', value: stats.assigned, color: colors.text },
                { Icon: () => <CheckIcon size={20} color={colors.accent} />, label: en ? 'COLLECTED' : 'COLLECTÉS', value: stats.collected, color: colors.accent },
                { Icon: () => <ClockIcon size={20} color={colors.warning} />, label: en ? 'REMAINING' : 'RESTANTS', value: stats.remaining, color: colors.warning },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <View style={styles.statIcon}><stat.Icon /></View>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                </View>
              ))}
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>
                  {en ? `Today's Progress — ${progressPct}% Complete` : `Progression du jour — ${progressPct} % terminé`}
                </Text>
                <Text style={styles.progressCount}>{stats.collected}/{stats.assigned} {en ? 'Bins' : 'bacs'}</Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={gradients.greenButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${progressPct}%` }]}
                />
              </View>
            </View>

            {/* Connection problem */}
            {loadError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>{en ? "Couldn't load your route" : 'Impossible de charger votre itinéraire'}</Text>
                <Text style={styles.errorText}>
                  {en
                    ? 'Check your internet connection. Pull down or tap retry to try again.'
                    : 'Vérifiez votre connexion internet. Tirez vers le bas ou appuyez sur Réessayer.'}
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
                  <Text style={styles.retryText}>{en ? 'Retry' : 'Réessayer'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Reports assigned from the dashboard */}
            {assignedReports.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>{en ? 'Assigned Reports' : 'Signalements assignés'}</Text>
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>{assignedReports.length}</Text>
                    </View>
                  </View>
                </View>
                {assignedReports.map((report) => (
                  <TouchableOpacity
                    key={report._id}
                    style={styles.reportCard}
                    onPress={() => navigation.navigate('AssignedReport', { id: report._id })}
                    activeOpacity={0.7}
                  >
                    {report.photo ? (
                      <Image source={{ uri: report.photo }} style={styles.reportThumb} />
                    ) : (
                      <View style={[styles.reportThumb, styles.reportThumbEmpty]}>
                        <MapPinIcon size={20} color="#7c3aed" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportLocation} numberOfLines={1}>{report.location}</Text>
                      <Text style={styles.reportMeta} numberOfLines={1}>
                        {report.zone}{report.note ? ` · ${report.note}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.reportOpen}>{en ? 'OPEN' : 'OUVRIR'}</Text>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 10 }} />
              </>
            )}

            {/* Priority Bins Header */}
            {priorityBins.length > 0 && (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>{en ? 'Priority Bins' : 'Bacs prioritaires'}</Text>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.critical, marginLeft: 6 }} />
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Route')}>
                  <Text style={styles.viewAll}>{en ? 'VIEW ALL' : 'VOIR TOUT'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        data={priorityBins}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.binCard}
            onPress={() => navigation.navigate('BinDetail', { id: item._id })}
            activeOpacity={0.7}
          >
            <View style={styles.binCardTop}>
              <View style={styles.binCardLeft}>
                <Image source={require('../assets/images/bin-icon.png')} style={styles.binIconImage} resizeMode="cover" />
                <View style={styles.binInfo}>
                  <Text style={styles.binId}>{item.binId}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                    <MapPinIcon size={12} color={colors.textSecondary} />
                    <Text style={styles.binDistance} numberOfLines={1}>{item.location}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.binCardRight}>
                <Text style={[styles.binFill, { color: statusColor(item.status) }]}>{item.fillLevel}%</Text>
                <View style={[styles.binStatusBadge, { backgroundColor: statusBg(item.status) }]}>
                  <Text style={[styles.binStatus, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.binNavigateBtn} onPress={() => navigateToBin(item)} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPinIcon size={14} color={colors.accent} />
                <Text style={styles.binNavigateText}>{en ? 'Navigate' : 'Y aller'}</Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          priorityBins.length > 0 ? (
            <View style={styles.binCardFooter}>
              <TouchableOpacity style={styles.navigateButton} onPress={() => navigation.navigate('Route')}>
                <LinearGradient colors={gradients.greenButton} style={styles.navigateGradient}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPinIcon size={14} color="#fff" />
                    <Text style={styles.navigateText}>{en ? 'Navigate' : 'Y aller'}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tealBanner: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    marginBottom: 16,
  },
  tealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tealNotif: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.critical,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f3d52',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.accent,
    ...shadows.soft,
  },
  avatarSmallImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: colors.accent,
  },
  avatarSmallText: { fontSize: 14, fontWeight: '700', color: colors.accent },
  greetingText: { fontSize: 16, fontWeight: '600', color: colors.text },

  // On Leave Banner
  onLeaveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fbbf24',
    padding: 14,
  },
  onLeaveTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  onLeaveSub: { fontSize: 11, color: '#a16207', marginTop: 2, lineHeight: 16 },

  // Banner — Liquid Glass
  bannerContainer: { paddingHorizontal: 20, marginBottom: 20 },
  glassOuter: {
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...shadows.cardHover,
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  glassOrb1: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(134,239,172,0.2)',
  },
  glassOrb2: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  bannerContentGlass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  bannerContent: { flex: 1 },
  dutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#86efac',
    shadowColor: '#86efac',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  dutyText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.5,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bannerImage: {
    width: 100,
    height: 80,
    marginLeft: 10,
    opacity: 0.95,
    borderRadius: 14,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
    padding: 14,
    alignItems: 'center',
    ...shadows.card,
  },
  statIcon: { fontSize: 18, marginBottom: 6 },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text },

  // Progress
  progressContainer: {
    marginHorizontal: 20,
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
    padding: 16,
    marginBottom: 20,
    ...shadows.card,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  progressCount: { fontSize: 12, color: colors.textMuted },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionDot: { fontSize: 10 },
  viewAll: { fontSize: 12, fontWeight: '600', color: colors.accent },

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

  // Assigned reports
  countPill: {
    marginLeft: 8,
    backgroundColor: '#ede9fe',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    padding: 12,
    ...shadows.card,
  },
  reportThumb: { width: 48, height: 48, borderRadius: 12 },
  reportThumbEmpty: { backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  reportLocation: { fontSize: 14, fontWeight: '700', color: colors.text },
  reportMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  reportOpen: { fontSize: 11, fontWeight: '700', color: '#7c3aed', letterSpacing: 0.5 },

  // Bin Cards
  binCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.08)',
    padding: 16,
    ...shadows.card,
  },
  binCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  binCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  binIconImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  binInfo: { flex: 1 },
  binId: { fontSize: 15, fontWeight: '700', color: colors.text },
  binDistance: { fontSize: 12, color: colors.textSecondary },
  binCardRight: { alignItems: 'flex-end', marginRight: -8 },
  binFill: { fontSize: 20, fontWeight: '800' },
  binStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  binStatus: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  binNavigateBtn: {
    marginTop: 12,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  binNavigateText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  binCardFooter: { paddingHorizontal: 20, marginBottom: 10 },
  navigateButton: { borderRadius: 14, overflow: 'hidden' },
  navigateGradient: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  navigateText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
