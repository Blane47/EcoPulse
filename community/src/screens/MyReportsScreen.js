import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useZone } from '../context/ZoneContext';
import { colors, shadows } from '../theme';
import api from '../api/axios';
import { BellIcon, RecycleIcon, MapPinIcon, StarOutlineIcon, StarIcon, ShieldCheckIcon, TrophyIcon, ArrowLeftIcon, UserIcon, WarningIcon } from '../components/Icons';
import { CollectionIcon, ReportIcon } from '../components/TabIcons';

const BLUE = '#2563eb';

const TABS = ['Notifications', 'My Reports'];

export default function MyReportsScreen({ navigation, route }) {
  const { language, profile } = useZone();
  const en = language === 'en';
  const { zone } = useZone();
  const [activeTab, setActiveTab] = useState(route?.params?.tab || 'My Reports');
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportsError, setReportsError] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState(false);

  // Switch tab when navigated with params
  useEffect(() => {
    if (route?.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route?.params?.tab]);

  const fetchReports = useCallback(async () => {
    try {
      if (profile?.phone) {
        const { data } = await api.get('/reports/mine');
        setReports(data);
      }
      setReportsError(false);
    } catch {
      setReportsError(true);
    }
    setLoading(false);
  }, [profile?.phone]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get('/announcements', { params: { zone } });
      setAnnouncements(data);
      setAnnouncementsError(false);
    } catch {
      setAnnouncements([]);
      setAnnouncementsError(true);
    }
  }, [zone]);

  // Refetch every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchReports();
      fetchAnnouncements();
    }, [fetchReports, fetchAnnouncements])
  );

  const collectedCount = reports.filter((r) => r.status === 'collected').length;

  const statusConfig = {
    pending: { label: en ? 'Pending' : 'En attente', color: colors.warning },
    reviewed: { label: en ? 'Under Review' : 'En cours', color: '#3b82f6' },
    assigned: { label: en ? 'Collector Assigned' : 'Collecteur Assigné', color: '#8b5cf6' },
    awaiting_review: { label: en ? 'Cleanup under review' : 'Nettoyage en vérification', color: '#d97706' },
    collected: { label: en ? 'Collected' : 'Collecté', color: colors.accent },
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* App bar */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}><ArrowLeftIcon size={22} color={colors.text} /></TouchableOpacity>
          <Text style={styles.appBarTitle}>{en ? 'Updates' : 'Mises à jour'}</Text>
        </View>
        <View style={styles.avatar}><UserIcon size={18} color="#fff" /></View>
      </View>

      {/* Segmented tabs */}
      <View style={styles.segment}>
        {[
          { key: 'My Reports', label: en ? 'My Reports' : 'Signalements', Icon: WarningIcon },
          { key: 'Notifications', label: en ? 'Alerts' : 'Alertes', Icon: BellIcon },
        ].map((t) => {
          const on = activeTab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[styles.segBtn, on && styles.segActive]} onPress={() => setActiveTab(t.key)} activeOpacity={0.8}>
              <t.Icon size={16} color={on ? BLUE : colors.textSecondary} />
              <Text style={[styles.segText, on && styles.segTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
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
                  <Image source={{ uri: item.photo }} style={styles.reportPhoto} accessibilityLabel={en ? 'Your photo' : 'Votre photo'} />
                ) : (
                  <View style={[styles.reportImagePlaceholder, { backgroundColor: colors.background }]}>
                    <CollectionIcon size={28} color={colors.textMuted} />
                  </View>
                )}
                {/* Collector's photo of the cleaned spot, shared once the municipality approved it */}
                {item.proof?.photo ? (
                  <View>
                    <Image source={{ uri: item.proof.photo }} style={[styles.reportPhoto, styles.afterPhoto]} accessibilityLabel={en ? 'Cleaned spot' : 'Endroit nettoyé'} />
                    <Text style={styles.afterLabel}>{en ? 'AFTER' : 'APRÈS'}</Text>
                  </View>
                ) : null}
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportLocation, { color: colors.text }]}>{item.location}</Text>
                  <Text style={[styles.reportDate, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={[styles.reportStatus, { color: sc.color }]}>{sc.label}</Text>
              </View>
            );
          }}
          ListFooterComponent={
            collectedCount > 0 ? (
              <View style={styles.impactCard}>
                <View style={styles.impactOverlay}>
                  <CollectionIcon size={40} color="#fff" />
                  <Text style={styles.impactText}>
                    {en
                      ? `Your reports got ${collectedCount} ${collectedCount === 1 ? 'spot' : 'spots'} cleaned`
                      : `Vos signalements ont permis de nettoyer ${collectedCount} ${collectedCount === 1 ? 'endroit' : 'endroits'}`}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading && (reportsError ? (
              <View style={styles.empty}>
                <Text style={[styles.errorTitle, { color: colors.text }]}>{en ? 'Could not load your reports' : 'Impossible de charger vos signalements'}</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {en ? 'Check your internet connection and try again.' : 'Vérifiez votre connexion internet et réessayez.'}
                </Text>
                <TouchableOpacity style={styles.reportBtn} onPress={() => { setLoading(true); fetchReports(); }}>
                  <Text style={styles.reportBtnText}>{en ? 'Retry' : 'Réessayer'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.empty}>
                <View style={{ marginBottom: 8 }}><ReportIcon size={28} color={colors.textMuted} /></View>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>{en ? 'No reports yet' : 'Aucun signalement'}</Text>
                <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('ReportBin')}>
                  <Text style={styles.reportBtnText}>{en ? 'Report a Bin' : 'Signaler un Bac'}</Text>
                </TouchableOpacity>
              </View>
            ))
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
            announcementsError ? (
              <View style={styles.notificationsEmpty}>
                <Text style={[styles.notificationsEmptyText, { color: colors.text }]}>
                  {en ? 'Could not load announcements' : 'Impossible de charger les annonces'}
                </Text>
                <Text style={[styles.notificationsEmptySub, { color: colors.textSecondary }]}>
                  {en ? 'Check your internet connection and try again.' : 'Vérifiez votre connexion internet et réessayez.'}
                </Text>
                <TouchableOpacity style={styles.reportBtn} onPress={fetchAnnouncements}>
                  <Text style={styles.reportBtnText}>{en ? 'Retry' : 'Réessayer'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
            )
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

  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f9' },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  appBarTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginHorizontal: 16, marginTop: 14, marginBottom: 6 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
  segActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  segText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  segTextActive: { color: BLUE },

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
  afterPhoto: { borderWidth: 2, borderColor: '#22c55e' },
  afterLabel: {
    position: 'absolute',
    bottom: 3,
    alignSelf: 'center',
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: '#16a34a',
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
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
    backgroundColor: '#0b3a66',
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
  errorTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 6 },
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
