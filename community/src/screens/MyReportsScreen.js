import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import api from '../api/axios';

const TABS = ['Notifications', 'My Reports'];

export default function MyReportsScreen({ navigation }) {
  const { language, profile } = useZone();
  const en = language === 'en';
  const [activeTab, setActiveTab] = useState('My Reports');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Refetch every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [fetchReports])
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.brandText}>EcoPulse</Text>
        </View>
        <TouchableOpacity>
          <Text style={{ fontSize: 18 }}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>
        {en ? 'Updates / Notifications' : 'Mises à jour / Notifications'}
      </Text>
      <Text style={styles.pageSubtitle}>
        {en ? 'Stay updated with your local impact' : 'Restez informé de votre impact local'}
      </Text>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'My Reports' ? (
        <FlatList
          data={reports}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          ListHeaderComponent={
            <>
              {/* Community Hero Badge */}
              <LinearGradient
                colors={['#22c55e', '#15803d']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroBadge}
              >
                <View style={styles.heroBadgeIcon}>
                  <Text style={{ fontSize: 24 }}>♻️</Text>
                </View>
                <View style={styles.heroBadgeInfo}>
                  <Text style={styles.heroBadgeTitle}>
                    {en ? 'Community Hero' : 'Héros Communautaire'} 🏆
                  </Text>
                  <Text style={styles.heroBadgeSub}>
                    Level 4 Active Contributor
                  </Text>
                </View>
              </LinearGradient>

              <Text style={styles.sectionTitle}>RECENT REPORTS</Text>
            </>
          }
          renderItem={({ item }) => {
            const sc = statusConfig[item.status] || statusConfig.pending;
            return (
              <View style={styles.reportCard}>
                <View style={styles.reportImagePlaceholder}>
                  <Text style={{ fontSize: 28 }}>🗑️</Text>
                </View>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportLocation}>{item.location}</Text>
                  <Text style={styles.reportDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={[styles.reportStatus, { color: sc.color }]}>{sc.label}</Text>
              </View>
            );
          }}
          ListFooterComponent={
            reports.length > 0 ? (
              <View style={styles.impactCard}>
                <View style={styles.impactOverlay}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>🚛</Text>
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
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
                <Text style={styles.emptyText}>{en ? 'No reports yet' : 'Aucun signalement'}</Text>
                <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('ReportBin')}>
                  <Text style={styles.reportBtnText}>{en ? 'Report a Bin' : 'Signaler un Bac'}</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      ) : (
        <View style={styles.notificationsEmpty}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
          <Text style={styles.notificationsEmptyText}>
            {en ? 'No new notifications' : 'Pas de nouvelles notifications'}
          </Text>
          <Text style={styles.notificationsEmptySub}>
            {en
              ? "We'll notify you about collection updates in your zone"
              : 'Nous vous informerons des mises à jour de collecte dans votre zone'}
          </Text>
        </View>
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
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 55 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandText: { fontSize: 18, fontWeight: '800', color: colors.accent },

  pageTitle: { fontSize: 24, fontWeight: '800', color: colors.text, paddingHorizontal: 20 },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },

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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 10,
    gap: 12,
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
  notificationsEmptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 100,
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
});
