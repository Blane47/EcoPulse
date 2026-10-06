import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows } from '../theme';
import { navigateToBin } from '../utils/collectBin';
import { MapPinIcon, CheckIcon } from '../components/Icons';
import { playSuccess } from '../utils/sounds';
import api from '../api/axios';

// A community report the admin assigned to this collector from the dashboard
export default function AssignedReportScreen({ route }) {
  const { id } = route.params;
  const [report, setReport] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [completing, setCompleting] = useState(false);

  const fetchReport = useCallback(async () => {
    setState('loading');
    try {
      const { data } = await api.get('/reports/assigned/me');
      const found = data.find((r) => r._id === id);
      setReport(found || null);
      setState(found ? 'ready' : 'missing');
    } catch {
      setState('error');
    }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const markCollected = () => {
    Alert.alert('Mark as collected?', 'Confirm the waste at this location has been cleared.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Collected',
        onPress: async () => {
          setCompleting(true);
          try {
            const { data } = await api.patch(`/reports/${id}/collected`);
            setReport(data);
            playSuccess();
          } catch (err) {
            Alert.alert(
              'Could not update',
              err.response?.data?.message || 'Check your internet connection and try again.'
            );
          }
          setCompleting(false);
        },
      },
    ]);
  };

  if (state === 'loading') {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </LinearGradient>
    );
  }

  if (state !== 'ready') {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.centered}>
        <Text style={styles.messageTitle}>
          {state === 'missing' ? 'Report no longer assigned' : 'Could not load report'}
        </Text>
        <Text style={styles.messageText}>
          {state === 'missing'
            ? 'This report was reassigned or removed by the admin.'
            : 'Check your internet connection and try again.'}
        </Text>
        {state === 'error' && (
          <TouchableOpacity style={styles.retryBtn} onPress={fetchReport}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  }

  const isCollected = report.status === 'collected';
  const hasCoords = !!(report.coordinates?.lat && report.coordinates?.lng);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.card}>
          {report.photo ? (
            <Image source={{ uri: report.photo }} style={styles.photo} resizeMode="cover" />
          ) : null}

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.location}>{report.location}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                <MapPinIcon size={12} color={colors.textSecondary} />
                <Text style={styles.zone}>{report.zone}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isCollected ? colors.accentLight : '#ede9fe' }]}>
              <Text style={[styles.statusText, { color: isCollected ? colors.accent : '#7c3aed' }]}>
                {isCollected ? 'Collected' : 'Assigned'}
              </Text>
            </View>
          </View>

          {!!report.note && (
            <View style={styles.noteBox}>
              <Text style={styles.detailLabel}>Resident's note</Text>
              <Text style={styles.noteText}>{report.note}</Text>
            </View>
          )}

          <View style={styles.detailsGrid}>
            {[
              { label: 'Reported by', value: report.reporterName || 'Resident' },
              { label: 'Reported', value: new Date(report.createdAt).toLocaleDateString() },
              { label: 'Assigned', value: report.assignedAt ? new Date(report.assignedAt).toLocaleDateString() : '—' },
              { label: 'Collected', value: report.collectedAt ? new Date(report.collectedAt).toLocaleDateString() : '—' },
            ].map((d) => (
              <View key={d.label} style={styles.detailItem}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.navigateBtn, !hasCoords && { opacity: 0.5 }]}
            onPress={() => navigateToBin(report)}
            disabled={!hasCoords}
            activeOpacity={0.8}
          >
            <View style={styles.navigateBtnInner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPinIcon size={16} color={colors.accent} />
                <Text style={styles.navigateBtnText}>Navigate</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.collectBtn, isCollected && { opacity: 0.5 }]}
            onPress={markCollected}
            disabled={completing || isCollected}
            activeOpacity={0.8}
          >
            <LinearGradient colors={isCollected ? ['#9ca3af', '#6b7280'] : gradients.greenButton} style={styles.collectGradient}>
              {completing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckIcon size={16} color="#fff" />
                  <Text style={styles.collectBtnText}>{isCollected ? 'Collected' : 'Mark Collected'}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    padding: 16,
    marginBottom: 20,
    ...shadows.cardHover,
  },
  photo: { width: '100%', height: 200, borderRadius: 14, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  location: { fontSize: 18, fontWeight: '700', color: colors.text },
  zone: { fontSize: 12, color: colors.textSecondary },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: '600' },
  noteBox: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  noteText: { fontSize: 14, color: colors.text, lineHeight: 20 },
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
  actionRow: { flexDirection: 'row', gap: 10 },
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
  collectGradient: { borderRadius: 16, padding: 18, alignItems: 'center' },
  collectBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
