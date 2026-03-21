import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows } from '../theme';
import { navigateToBin, verifiedCollect } from '../utils/collectBin';
import api from '../api/axios';

export default function BinDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [bin, setBin] = useState(null);
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    const fetchBin = async () => {
      try {
        const { data } = await api.get(`/bins/${id}`);
        setBin(data);
      } catch {
        setBin({
          _id: id, binId: 'BIN-001', location: 'UB Main Gate, Molyko', zone: 'Molyko',
          type: 'General', fillLevel: 92, status: 'critical',
          coordinates: { lat: 4.1548, lng: 9.2985 },
          lastCollected: new Date(Date.now() - 86400000).toISOString(),
          assignedCollector: { name: 'Emmanuel Ngwa' },
        });
      }
    };
    fetchBin();
  }, [id]);

  const handleCollect = async () => {
    if (!bin) return;
    setCollecting(true);
    const result = await verifiedCollect(bin);
    if (result.success) {
      setBin((prev) => ({ ...prev, fillLevel: 0, status: 'optimal', lastCollected: new Date().toISOString() }));
    }
    setCollecting(false);
  };

  if (!bin) {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </LinearGradient>
    );
  }

  const sc = bin.status === 'critical' ? colors.critical : bin.status === 'warning' ? colors.warning : colors.accent;
  const scBg = bin.status === 'critical' ? colors.criticalLight : bin.status === 'warning' ? colors.warningLight : colors.accentLight;
  const isCollected = bin.status === 'optimal' || bin.fillLevel === 0;

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../assets/images/bin-icon.png')}
              style={styles.binImage}
              resizeMode="cover"
            />
            <View>
              <Text style={styles.binId}>{bin.binId}</Text>
              <Text style={styles.location}>📍 {bin.location}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: scBg }]}>
            <Text style={[styles.statusText, { color: sc }]}>{bin.status}</Text>
          </View>
        </View>

        <View style={[styles.fillCircle, { borderColor: sc }]}>
          <Text style={[styles.fillValue, { color: sc }]}>{bin.fillLevel}%</Text>
          <Text style={styles.fillLabel}>FILL LEVEL</Text>
        </View>

        {/* Capacity Bar */}
        <View style={styles.capacityBarContainer}>
          <View style={styles.capacityBar}>
            <LinearGradient
              colors={['#22c55e', '#f59e0b', '#ef4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.capacityFill, { width: `${bin.fillLevel}%` }]}
            />
          </View>
        </View>

        <View style={styles.detailsGrid}>
          {[
            { label: 'Type', value: bin.type },
            { label: 'Zone', value: bin.zone },
            { label: 'Last Collected', value: bin.lastCollected ? new Date(bin.lastCollected).toLocaleDateString() : 'Never' },
            { label: 'Collector', value: bin.assignedCollector?.name || '—' },
          ].map((d) => (
            <View key={d.label} style={styles.detailItem}>
              <Text style={styles.detailLabel}>{d.label}</Text>
              <Text style={styles.detailValue}>{d.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.navigateBtn} onPress={() => navigateToBin(bin)} activeOpacity={0.8}>
          <View style={styles.navigateBtnInner}>
            <Text style={styles.navigateBtnText}>📍 Navigate</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.collectBtn, isCollected && styles.collectBtnDisabled]}
          onPress={handleCollect}
          disabled={collecting || isCollected}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isCollected ? ['#9ca3af', '#6b7280'] : gradients.greenButton}
            style={styles.collectGradient}
          >
            {collecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.collectBtnText}>
                {isCollected ? 'Collected ✓' : '📸 Verify & Collect'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 20 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: colors.cardGlass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
    padding: 20,
    marginBottom: 20,
    ...shadows.cardHover,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  binImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  binId: { fontSize: 18, fontWeight: '700', color: colors.text },
  location: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  fillCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 5,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  fillValue: { fontSize: 34, fontWeight: '800' },
  fillLabel: { fontSize: 9, color: colors.textMuted, letterSpacing: 1, marginTop: 2 },
  capacityBarContainer: { marginBottom: 20 },
  capacityBar: {
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: { height: 8, borderRadius: 4 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.06)',
  },
  detailLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navigateBtn: { flex: 1 },
  navigateBtnInner: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  navigateBtnText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  collectBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  collectBtnDisabled: { opacity: 0.5 },
  collectGradient: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  collectBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
