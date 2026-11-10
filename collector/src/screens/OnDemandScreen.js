import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
  Switch, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, shadows } from '../theme';
import TealHeader from '../components/TealHeader';
import { MapPinIcon, ClockIcon, CheckIcon } from '../components/Icons';
import { getAssignedPickups, advancePickup, setDuty } from '../api/pickups';

// The action a collector takes next for each status, and the status it moves to.
const NEXT = {
  accepted: { to: 'en_route', en: 'Start — On My Way', fr: 'Démarrer — En route' },
  en_route: { to: 'picked_up', en: 'Mark Picked Up', fr: 'Marquer ramassé' },
  picked_up: { to: 'completed', en: 'Complete Job', fr: 'Terminer' },
};

const STATUS = {
  accepted: { color: '#2563eb', bg: '#dbeafe', en: 'Accepted', fr: 'Accepté' },
  en_route: { color: '#2563eb', bg: '#dbeafe', en: 'On the way', fr: 'En route' },
  picked_up: { color: '#7c3aed', bg: '#ede9fe', en: 'Picked up', fr: 'Ramassé' },
  completed: { color: colors.accent, bg: colors.accentLight, en: 'Completed', fr: 'Terminé' },
};

const WASTE = {
  household: { en: 'Household', fr: 'Ménager' },
  bulky: { en: 'Bulky', fr: 'Encombrant' },
  recyclables: { en: 'Recyclables', fr: 'Recyclables' },
  garden: { en: 'Garden', fr: 'Jardin' },
};

const fcfa = (n) => `${Number(n || 0).toLocaleString()} FCFA`;

export default function OnDemandScreen() {
  const { user, language, updateUser } = useAuth();
  const en = language === 'en';

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onDuty, setOnDuty] = useState(!!user?.onDuty);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setJobs(await getAssignedPickups());
    } catch (err) {
      console.error('Assigned pickups error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { setOnDuty(!!user?.onDuty); }, [user?.onDuty]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleDuty = async (value) => {
    setOnDuty(value);
    try {
      const { onDuty: saved } = await setDuty(value);
      if (user) updateUser({ ...user, onDuty: saved });
    } catch (err) {
      setOnDuty(!value); // revert on failure
      Alert.alert(en ? 'Could not update' : 'Mise à jour impossible');
    }
  };

  const advance = async (job) => {
    const step = NEXT[job.status];
    if (!step) return;
    setBusyId(job._id);
    try {
      await advancePickup(job._id, step.to);
      await load();
    } catch (err) {
      Alert.alert(
        en ? 'Could not update job' : 'Mise à jour impossible',
        err.response?.data?.message || ''
      );
    } finally {
      setBusyId(null);
    }
  };

  const active = jobs.filter((j) => j.status !== 'completed');
  const doneToday = jobs.filter((j) => j.status === 'completed');

  return (
    <View style={styles.container}>
      <TealHeader title={en ? 'On-Demand Jobs' : 'Travaux à la Demande'} />

      {/* Duty toggle */}
      <View style={styles.dutyCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dutyTitle}>{en ? 'Accepting jobs' : 'Disponible'}</Text>
          <Text style={styles.dutySub}>
            {onDuty
              ? (en ? 'You appear available to your operator' : 'Vous êtes disponible pour votre opérateur')
              : (en ? "You're off duty — no new jobs" : 'Hors service — aucun nouveau travail')}
          </Text>
        </View>
        <Switch
          value={onDuty}
          onValueChange={toggleDuty}
          trackColor={{ false: colors.cardBorder, true: colors.accentLight }}
          thumbColor={onDuty ? colors.accent : '#f4f3f4'}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}

        {!loading && active.length === 0 && (
          <Text style={styles.empty}>
            {en ? 'No active jobs right now. Pull to refresh.' : 'Aucun travail actif. Tirez pour actualiser.'}
          </Text>
        )}

        {active.map((job) => {
          const st = STATUS[job.status] || STATUS.accepted;
          const step = NEXT[job.status];
          const addr = job.location?.address || job.location?.zone || '';
          return (
            <View key={job._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resident}>{job.residentName || (en ? 'Resident' : 'Résident')}</Text>
                  <Text style={styles.meta}>
                    {WASTE[job.wasteType]?.[en ? 'en' : 'fr'] || job.wasteType} · {fcfa(job.fee)}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.pillText, { color: st.color }]}>{en ? st.en : st.fr}</Text>
                </View>
              </View>

              {!!addr && (
                <View style={styles.row}>
                  <MapPinIcon size={14} color={colors.textSecondary} />
                  <Text style={styles.addr}>{addr}</Text>
                </View>
              )}
              {!!job.note && <Text style={styles.note}>“{job.note}”</Text>}

              <View style={styles.actions}>
                {!!job.phone && (
                  <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${job.phone}`)} activeOpacity={0.85}>
                    <Text style={styles.callBtnText}>{en ? 'Call' : 'Appeler'}</Text>
                  </TouchableOpacity>
                )}
                {step && (
                  <TouchableOpacity
                    style={[styles.advanceBtn, busyId === job._id && { opacity: 0.6 }]}
                    onPress={() => advance(job)}
                    disabled={busyId === job._id}
                    activeOpacity={0.85}
                  >
                    {busyId === job._id
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.advanceBtnText}>{en ? step.en : step.fr}</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {doneToday.length > 0 && (
          <>
            <View style={styles.doneHeaderRow}>
              <ClockIcon size={14} color={colors.textMuted} />
              <Text style={styles.doneHeader}>{en ? 'Completed' : 'Terminés'} ({doneToday.length})</Text>
            </View>
            {doneToday.map((job) => (
              <View key={job._id} style={[styles.card, styles.cardDone]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resident}>{job.residentName || (en ? 'Resident' : 'Résident')}</Text>
                    <Text style={styles.meta}>{WASTE[job.wasteType]?.[en ? 'en' : 'fr'] || job.wasteType} · {fcfa(job.fee)}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: colors.accentLight, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                    <CheckIcon size={12} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.pillText, { color: colors.accent }]}>{en ? 'Done' : 'Terminé'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  dutyCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 14, padding: 16,
    backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder,
    ...shadows.soft,
  },
  dutyTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  dutySub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 50, fontSize: 14, lineHeight: 20 },

  card: {
    backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder,
    padding: 16, marginBottom: 14, ...shadows.soft,
  },
  cardDone: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  resident: { fontSize: 16, fontWeight: '800', color: colors.text },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  addr: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  note: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', marginTop: 8 },

  pill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 11, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  callBtn: { paddingHorizontal: 18, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.accent },
  callBtnText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  advanceBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  advanceBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  doneHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 10 },
  doneHeader: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
});
