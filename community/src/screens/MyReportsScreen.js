import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useZone } from '../context/ZoneContext';
import { colors, shadows } from '../theme';
import api from '../api/axios';
import TealHeader from '../components/TealHeader';
import { BellIcon, RecycleIcon, MapPinIcon, StarOutlineIcon, StarIcon, ShieldCheckIcon, TrophyIcon } from '../components/Icons';
import { CollectionIcon, ReportIcon } from '../components/TabIcons';

const TABS = ['Notifications', 'My Reports'];

export default function MyReportsScreen({ navigation, route }) {
  const { language, profile } = useZone();
  const en = language === 'en';
  const { zone } = useZone();
  const [activeTab, setActiveTab] = useState(route?.params?.tab || 'My Reports');
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Switch tab when navigated with params
  useEffect(() => {
    if (route?.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route?.params?.tab]);

  const fetchReports = useCallback(async () => {
    try {
      if (profile?.phone) {
        const { data } = await api.get(`/reports/user/${profile.phone}`);
        setReports(data);
      }
    } catch {
      // offline fallback
    }
    setLoading(false);
  }, [profile?.phone]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get('/announcements', { params: { zone } });
      setAnnouncements(data);
    } catch {
      setAnnouncements([]);
    }
  }, [zone]);

  // Refetch every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchReports();
      fetchAnnouncements();
    }, [fetchReports, fetchAnnouncements])
  );

  const statusConfig = {
    pending: { label: en ? 'Pending' : 'En attente', color: colors.warning },
    reviewed: { label: en ? 'Under Review' : 'En cours', color: '#3b82f6' },
    collected: { label: en ? 'Collected' : 'Collecté', color: colors.accent },
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TealHeader
        title={en ? 'Updates' : 'Mises à jour'}
        subtitle={en ? 'Stay updated with your local impact' : 'Restez informé de votre impact local'}
      />

      {/* Tabs */}
      <View style={[styles.tabsRow, { borderBottomColor: colors.cardBorder }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.accent }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === tab && { color: colors.text, fontWeight: '700' }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'My Reports' ? (
        <FlatList
          data={reports}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
          ListHeaderComponent={
            <>
              {/* Community Level Badge */}
              {(() => {
                const count = reports.length;
                const levels = [
                  { min: 50, title: en ? 'Zone Leader' : 'Leader de Zone', Icon: TrophyIcon, color: '#F59E0B', gradient: ['#d97706', '#b45309'] },
                  { min: 25, title: en ? 'Eco Hero' : 'Éco Héros', Icon: TrophyIcon, color: '#F59E0B', gradient: ['#F59E0B', '#d97706'] },
                  { min: 10, title: en ? 'Community Champion' : 'Champion Communautaire', Icon: ShieldCheckIcon, color: '#22c55e', gradient: ['#22c55e', '#15803d'] },
                  { min: 3, title: en ? 'Active Reporter' : 'Reporter Actif', Icon: StarIcon, color: '#F59E0B', gradient: ['#22c55e', '#166534'] },
                  { min: 0, title: en ? 'New Member' : 'Nouveau Membre', Icon: StarOutlineIcon, color: '#9ca3af', gradient: ['#6b7280', '#4b5563'] },
                ];
                const level = levels.find(l => count >= l.min);
                const levelNum = levels.length - levels.indexOf(level);
                return (
                  <LinearGradient
                    colors={level.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroBadge}
                  >
                    <View style={styles.heroBadgeIcon}>
                      <level.Icon size={24} color="#fff" />
                    </View>
                    <View style={styles.heroBadgeInfo}>
                      <Text style={styles.heroBadgeTitle}>{level.title}</Text>
                      <Text style={styles.heroBadgeSub}>
                        Level {levelNum} · {count} {count === 1 ? 'report' : 'reports'}
                      </Text>
                    </View>
                  </LinearGradient>
                );
              })()}

              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RECENT REPORTS</Text>
            </>
          }
          renderItem={({ item }) => {
            const sc = statusConfig[item.status] || statusConfig.pending;
            return (
              <View style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {item.photo ? (
                  <Image source={{ uri: item.photo }} style={styles.reportPhoto} />
                ) : (
                  <View style={[styles.reportImagePlaceholder, { backgroundColor: colors.background }]}>
                    <CollectionIcon size={28} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportLocation, { color: colors.text }]}>{item.location}</Text>
                  <Text style={[styles.reportDate, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={[styles.reportStatus, { color: sc.color }]}>{sc.label}</Text>
              </View>
            );
          }}
          ListFooterComponent={
            reports.length > 0 ? (
              <View style={styles.impactCard}>
                <View style={styles.impactOverlay}>
                  <CollectionIcon size={40} color="#fff" />
                  <Text style={styles.impactText}>
                    {en
                      ? `Your reports helped collect ${reports.length} bins this month 🏆`
                      : `Vos signalements ont aidé à collecter ${reports.length} bacs ce mois-ci 🏆`}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.empty}>
                <View style={{ marginBottom: 8 }}><ReportIcon size={28} color={colors.textMuted} /></View>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>{en ? 'No reports yet' : 'Aucun signalement'}</Text>
                <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('ReportBin')}>
                  <Text style={styles.reportBtnText}>{en ? 'Report a Bin' : 'Signaler un Bac'}</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          renderItem={({ item }) => {
            const typeConfig = {
              urgent: { bg: '#fef2f2', border: '#fca5a5', color: colors.critical, label: 'URGENT' },
              warning: { bg: '#fefce8', border: '#fde047', color: colors.warning, label: 'WARNING' },
              info: { bg: '#f0fdf4', border: '#86efac', color: colors.accent, label: 'INFO' },
            };
            const tc = typeConfig[item.type] || typeConfig.info;
            const timeAgo = (() => {
              const mins = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000);
              if (mins < 60) return `${mins}m ago`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `${hrs}h ago`;
              return `${Math.floor(hrs / 24)}d ago`;
            })();
            return (
              <View style={[styles.announcementCard, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                <View style={styles.announcementHeader}>
                  <View style={[styles.announcementTypeBadge, { backgroundColor: tc.color + '20' }]}>
                    <Text style={[styles.announcementTypeText, { color: tc.color }]}>{tc.label}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{timeAgo}</Text>
                </View>
                <Text style={[styles.announcementTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.announcementMessage, { color: colors.textSecondary }]}>{item.message}</Text>
                {item.zone !== 'all' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <MapPinIcon size={11} color={colors.textMuted} />
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.zone}</Text>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.notificationsEmpty}>
              <View style={{ marginBottom: 16 }}><BellIcon size={44} color={colors.textMuted} /></View>
              <Text style={[styles.notificationsEmptyText, { color: colors.text }]}>
                {en ? 'You\'re all caught up!' : 'Vous êtes à jour!'}
              </Text>
              <Text style={[styles.notificationsEmptySub, { color: colors.textSecondary }]}>
                {en
                  ? 'No new announcements from the admin. Here are some tips:'
                  : 'Pas de nouvelles annonces. Voici quelques conseils:'}
              </Text>
              <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
                  {en ? 'Report overflowing bins to help collectors prioritize' : 'Signalez les bacs débordants pour aider les collecteurs'}
                </Text>
                <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
                  {en ? 'Set reminders in the Schedule tab for collection days' : 'Activez les rappels dans l\'onglet Calendrier'}
                </Text>
                <Text style={[styles.tipItem, { color: colors.textSecondary }]}>
                  {en ? 'Sort your waste into General, Organic, and Recyclable bins' : 'Triez vos déchets en Général, Organique et Recyclable'}
                </Text>
              </View>
            </View>
          }
        />
      )}

      {/* Floating Action Button — always visible on My Reports tab */}
      {activeTab === 'My Reports' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ReportBin')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: colors.text, fontWeight: '700' },

  // Hero Badge
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  heroBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeInfo: { flex: 1 },
  heroBadgeTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  heroBadgeSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Section
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // Report Cards
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    ...shadows.card,
  },
  reportPhoto: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  reportImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: { flex: 1 },
  reportLocation: { fontSize: 14, fontWeight: '600', color: colors.text },
  reportDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  reportStatus: { fontSize: 12, fontWeight: '600' },

  // Impact Card
  impactCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a472a',
    marginTop: 10,
  },
  impactOverlay: {
    padding: 20,
    alignItems: 'center',
  },
  impactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },
  reportBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  reportBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Notifications Empty
  notificationsEmpty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  notificationsEmptyText: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  notificationsEmptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  tipsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: '100%',
  },
  tipItem: {
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    marginBottom: 8,
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '600', marginTop: -2 },

  // Announcement Cards
  announcementCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementTypeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  announcementTypeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  announcementMessage: {
    fontSize: 13,
    lineHeight: 19,
  },
});
