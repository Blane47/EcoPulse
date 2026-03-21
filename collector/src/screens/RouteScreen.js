import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Linking, Platform, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, getColors, gradients, shadows } from '../theme';
import { useAuth } from '../context/AuthContext';
import { navigateToBin, verifiedCollect } from '../utils/collectBin';
import api from '../api/axios';
import GradientBrand from '../components/GradientBrand';

const FILTERS = ['All', 'Critical', 'Warning', 'Collected'];

export default function RouteScreen({ navigation }) {
  const { darkMode } = useAuth();
  const c = getColors(darkMode);
  const [bins, setBins] = useState([]);
  const [collected, setCollected] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState('All');
  const [collectingId, setCollectingId] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const { data } = await api.get('/collectors/me/route');
        setBins(data.bins || []);
      } catch {
        setBins([
          { _id: '1', binId: 'BIN-001', location: 'UB Main Gate, Molyko', fillLevel: 92, status: 'critical', zone: 'Molyko', distance: '0.3km', coordinates: { lat: 4.1548, lng: 9.2985 } },
          { _id: '2', binId: 'BIN-042', location: 'Bonduma Junction', fillLevel: 68, status: 'warning', zone: 'Bonduma', distance: '0.7km', coordinates: { lat: 4.1585, lng: 9.2868 } },
          { _id: '3', binId: 'BIN-108', location: 'Molyko Junction (T-Junction)', fillLevel: 35, status: 'optimal', zone: 'Molyko', distance: '1.1km', coordinates: { lat: 4.1562, lng: 9.2942 } },
          { _id: '4', binId: 'BIN-023', location: 'Great Soppo Market', fillLevel: 78, status: 'warning', zone: 'Great Soppo', distance: '1.4km', coordinates: { lat: 4.1630, lng: 9.2790 } },
          { _id: '5', binId: 'BIN-077', location: 'Bonduma Health Centre', fillLevel: 88, status: 'critical', zone: 'Bonduma', distance: '1.8km', coordinates: { lat: 4.1592, lng: 9.2845 } },
          { _id: '6', binId: 'BIN-033', location: 'Soppo Likoko Junction', fillLevel: 52, status: 'optimal', zone: 'Great Soppo', distance: '2.2km', coordinates: { lat: 4.1645, lng: 9.2755 } },
        ]);
      }
    };
    fetchRoute();
  }, []);

  const handleCollect = async (bin) => {
    setCollectingId(bin._id);
    const result = await verifiedCollect(bin);
    if (result.success) {
      setCollected((prev) => new Set([...prev, bin.binId]));
    }
    setCollectingId(null);
  };

  const getStatusLabel = (status, isCollected) => {
    if (isCollected) return 'CLEARED';
    if (status === 'critical') return 'CAPACITY FULL';
    if (status === 'warning') return 'FILL WARNING';
    if (status === 'optimal') return 'OPTIMAL';
    return 'STEADY';
  };

  const getStatusColor = (status, isCollected) => {
    if (isCollected) return colors.accent;
    if (status === 'critical') return colors.critical;
    if (status === 'warning') return colors.warning;
    return colors.textMuted;
  };

  const getStatusBg = (status, isCollected) => {
    if (isCollected) return colors.accentLight;
    if (status === 'critical') return colors.criticalLight;
    if (status === 'warning') return colors.warningLight;
    return '#f3f4f6';
  };

  const filteredBins = bins.filter((bin) => {
    const isCollectedBin = collected.has(bin.binId);
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Critical') return bin.status === 'critical' && !isCollectedBin;
    if (activeFilter === 'Warning') return bin.status === 'warning' && !isCollectedBin;
    if (activeFilter === 'Collected') return isCollectedBin;
    return true;
  });

  const filterColor = (filter) => {
    if (filter === 'Critical') return colors.critical;
    if (filter === 'Warning') return colors.warning;
    if (filter === 'Collected') return colors.accent;
    return colors.primary;
  };

  const openInMaps = () => {
    const url = Platform.OS === 'ios'
      ? 'maps:?q=Buea+Cameroon'
      : 'geo:4.1597,9.2920?q=Buea+Cameroon';
    Linking.openURL(url).catch(() => {});
  };

  return (
    <LinearGradient colors={darkMode ? gradients.screenBgDark : gradients.screenBg} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <GradientBrand fontSize={18} />
          <Text style={[styles.headerMenu, { color: c.textSecondary }]}>☰</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]}>My Route Today</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>{bins.length} bins · Sorted by priority</Text>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterPill,
                { backgroundColor: c.cardGlass, borderColor: c.cardBorder },
                isActive && { backgroundColor: filterColor(filter), borderColor: filterColor(filter) },
              ]}
              activeOpacity={0.7}
            >
              {!isActive && filter !== 'All' && (
                <View style={[styles.filterDot, { backgroundColor: filterColor(filter) }]} />
              )}
              <Text style={[styles.filterText, { color: c.textSecondary }, isActive && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bin List */}
      <FlatList
        data={filteredBins}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
        renderItem={({ item }) => {
          const done = collected.has(item.binId);
          const statusLbl = getStatusLabel(item.status, done);
          const statusClr = getStatusColor(item.status, done);
          const statusBgColor = getStatusBg(item.status, done);
          const isCollecting = collectingId === item._id;

          if (done) {
            return (
              <View style={[styles.binCardDone, { backgroundColor: c.accentLight, borderColor: c.accent }]}>
                <View style={styles.binRowDone}>
                  <View style={styles.binInfo}>
                    <Text style={styles.binIdDone}>{item.binId}</Text>
                    <Text style={styles.binLocationDone}>{item.location}</Text>
                  </View>
                  <View style={styles.collectedBadge}>
                    <Text style={styles.collectedBadgeText}>✓ Collected</Text>
                  </View>
                </View>
              </View>
            );
          }

          return (
            <TouchableOpacity
              style={[styles.binCard, { backgroundColor: c.cardGlass, borderColor: c.cardBorder }]}
              onPress={() => navigation.navigate('BinDetail', { id: item._id })}
              activeOpacity={0.7}
            >
              <View style={styles.binRow}>
                <View style={styles.binInfo}>
                  <Text style={[styles.binId, { color: c.textSecondary }]}>{item.binId}</Text>
                  <Text style={[styles.binLocation, { color: c.text }]}>{item.location}</Text>
                  <Text style={[styles.binDistance, { color: c.textMuted }]}>📍 {item.distance || '0.3km'} away</Text>
                </View>
                <View style={styles.binRight}>
                  <Text style={[styles.fillLevel, { color: statusClr }]}>{item.fillLevel}%</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
                    <Text style={[styles.statusText, { color: statusClr }]}>{statusLbl}</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.navigateBtn} onPress={() => navigateToBin(item)} activeOpacity={0.8}>
                  <Text style={styles.navigateBtnText}>📍 Navigate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.collectButton}
                  onPress={() => handleCollect(item)}
                  activeOpacity={0.8}
                  disabled={isCollecting}
                >
                  <LinearGradient colors={gradients.greenButton} style={styles.collectGradient}>
                    {isCollecting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.collectButtonText}>✓ Collect</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <>
            {/* Map Preview with real image */}
            <View style={styles.mapPreview}>
              <Image
                source={require('../assets/images/map-aerial.png')}
                style={styles.mapImage}
                resizeMode="cover"
              />
            </View>

            {/* Open in Maps */}
            <TouchableOpacity onPress={openInMaps} activeOpacity={0.8}>
              <LinearGradient colors={['#0f1623', '#1a2332']} style={styles.openMapsButton}>
                <Text style={styles.openMapsText}>Open in Maps 🗺️</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 55 },
  header: { paddingHorizontal: 20, marginBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerBrand: { fontSize: 22, fontWeight: '900', color: '#1a3c3c', letterSpacing: 5, fontFamily: 'monospace' },
  headerMenu: { fontSize: 20, color: colors.textSecondary },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardGlass,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
    ...shadows.card,
  },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },

  // Bin Cards
  binCard: {
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.08)',
    padding: 16,
    marginBottom: 10,
    ...shadows.card,
  },
  binCardDone: {
    backgroundColor: colors.accentLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 16,
    marginBottom: 10,
    opacity: 0.75,
  },
  binRowDone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  binIdDone: { fontSize: 12, fontWeight: '600', color: colors.accent, marginBottom: 2 },
  binLocationDone: { fontSize: 15, fontWeight: '600', color: colors.accentDark },
  collectedBadge: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  collectedBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  binRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  binInfo: { flex: 1 },
  binId: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 },
  binLocation: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  binDistance: { fontSize: 12, color: colors.textMuted },
  binRight: { alignItems: 'flex-end' },
  fillLevel: { fontSize: 24, fontWeight: '800' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // Action Buttons Row
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  navigateBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  navigateBtnText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  collectButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  collectGradient: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  collectButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Map Preview
  mapPreview: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    marginTop: 10,
    height: 180,
    ...shadows.cardHover,
  },
  mapImage: {
    width: '100%',
    height: 250,
    position: 'absolute',
    bottom: 0,
    borderRadius: 18,
  },

  // Open in Maps
  openMapsButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 6,
    ...shadows.card,
  },
  openMapsText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
