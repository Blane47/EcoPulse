import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, shadows } from '../theme';
import { navigateToBin, verifiedCollect } from '../utils/collectBin';
import { MapPinIcon, CameraIcon, CheckIcon } from '../components/Icons';
import { playSuccess } from '../utils/sounds';
import api from '../api/axios';

const STATUS_FR = { critical: 'Critique', warning: 'Alerte', optimal: 'Optimal', empty: 'Vide' };
const TYPE_FR = { General: 'Général', Recyclable: 'Recyclable', Organic: 'Organique' };

export default function BinDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { language } = useAuth();
  const en = language === 'en';
  const [bin, setBin] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [collecting, setCollecting] = useState(false);

  const fetchBin = useCallback(async () => {
    setState('loading');
    try {
      const { data } = await api.get(`/bins/${id}`);
      setBin(data);
      setState('ready');
    } catch (err) {
      setState(err.response?.status === 404 ? 'missing' : 'error');
    }
  }, [id]);

  useEffect(() => { fetchBin(); }, [fetchBin]);

  const handleCollect = async () => {
    if (!bin) return;
    setCollecting(true);
    const result = await verifiedCollect(bin);
    if (result.success) {
      setBin((prev) => ({ ...prev, fillLevel: 0, status: 'optimal', lastCollected: new Date().toISOString() }));
      playSuccess();
    }
    setCollecting(false);
  };

  if (state === 'loading') {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </LinearGradient>
    );
  }

  if (state !== 'ready') {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.centered}>
        <Text style={styles.messageTitle}>
          {state === 'missing'
            ? (en ? 'Bin not found' : 'Bac introuvable')
            : (en ? 'Could not load bin' : 'Impossible de charger le bac')}
        </Text>
        <Text style={styles.messageText}>
          {state === 'missing'
            ? (en ? 'This bin was removed by the admin.' : "Ce bac a été supprimé par l'admin.")
            : (en ? 'Check your internet connection and try again.' : 'Vérifiez votre connexion internet et réessayez.')}
        </Text>
        {state === 'error' && (
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBin}>
            <Text style={styles.retryText}>{en ? 'Retry' : 'Réessayer'}</Text>
          </TouchableOpacity>
        )}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
              <MapPinIcon size={12} color={colors.textSecondary} />
              <Text style={styles.location}>{bin.location}</Text>
            </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: scBg }]}>
            <Text style={[styles.statusText, { color: sc }]}>{en ? bin.status : STATUS_FR[bin.status] || bin.status}</Text>
          </View>
        </View>

        <View style={[styles.fillCircle, { borderColor: sc }]}>
          <Text style={[styles.fillValue, { color: sc }]}>{bin.fillLevel}%</Text>
          <Text style={styles.fillLabel}>{en ? 'FILL LEVEL' : 'REMPLISSAGE'}</Text>
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
            { label: 'Type', value: en ? bin.type : TYPE_FR[bin.type] || bin.type },
            { label: 'Zone', value: bin.zone },
            {
              label: en ? 'Last Collected' : 'Dernière collecte',
              value: bin.lastCollected
                ? new Date(bin.lastCollected).toLocaleDateString(en ? 'en-GB' : 'fr-FR')
                : (en ? 'Never' : 'Jamais'),
            },
            { label: en ? 'Collector' : 'Collecteur', value: bin.assignedCollector?.name || '—' },
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPinIcon size={16} color={colors.accent} />
              <Text style={styles.navigateBtnText}>{en ? 'Navigate' : 'Y aller'}</Text>
            </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isCollected ? <CheckIcon size={16} color="#fff" /> : <CameraIcon size={16} color="#fff" />}
                <Text style={styles.collectBtnText}>
                  {isCollected ? (en ? 'Collected' : 'Collecté') : (en ? 'Verify & Collect' : 'Vérifier et collecter')}
                </Text>
              </View>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  messageTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  messageText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  retryBtn: { marginTop: 18, backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
