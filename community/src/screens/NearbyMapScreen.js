import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import api from '../api/axios';

const statusColors = { critical: colors.critical, warning: colors.warning, optimal: colors.accent };

export default function NearbyMapScreen() {
  const { zone, language } = useZone();
  const en = language === 'en';
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBins = async () => {
      try {
        const { data } = await api.get('/bins', { params: { zone } });
        const list = data.bins || data;
        setBins(Array.isArray(list) ? list : []);
      } catch {
        setBins([
          { _id: '1', binId: 'BIN-001', location: 'UB Junction', fillLevel: 89, status: 'critical', coordinates: { lat: 4.1597, lng: 9.2920 } },
          { _id: '2', binId: 'BIN-042', location: 'Mile 17', fillLevel: 62, status: 'warning', coordinates: { lat: 4.1550, lng: 9.2850 } },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchBins();
  }, [zone]);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.accent} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{en ? 'Nearby Bins' : 'Bacs à Proximité'} — {zone}</Text>
      </View>

      <View style={styles.legendRow}>
        {Object.entries(statusColors).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{status}</Text>
          </View>
        ))}
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 4.1597,
          longitude: 9.2920,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        {bins.filter((b) => b.coordinates?.lat).map((bin) => (
          <Marker
            key={bin._id}
            coordinate={{ latitude: bin.coordinates.lat, longitude: bin.coordinates.lng }}
            title={bin.binId}
            description={`${bin.location} — ${bin.fillLevel}%`}
            pinColor={statusColors[bin.status] || colors.accent}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  legendRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  map: { flex: 1 },
});
