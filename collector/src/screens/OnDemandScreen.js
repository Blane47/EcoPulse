import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
  Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import {
  MapPinIcon, CheckIcon, BellIcon, ArrowLeftIcon, RecycleIcon, TruckIcon,
  PhoneIcon, NavigationIcon, InfoIcon, ChevronRightIcon,
} from '../components/Icons';
import { getAssignedPickups, advancePickup, setDuty } from '../api/pickups';

const BLUE = '#2563eb';
const NEXT = {
  accepted: { to: 'en_route', en: 'Start — On My Way', fr: 'Démarrer' },
  en_route: { to: 'picked_up', en: 'Mark as picked up', fr: 'Marquer ramassé' },
  picked_up: { to: 'completed', en: 'Complete & confirm cash', fr: 'Terminer' },
};
const STATUS = {
  accepted: { color: BLUE, bg: '#dbeafe', en: 'Assigned', fr: 'Assigné' },
  en_route: { color: '#15803d', bg: '#ecfdf5', en: 'En route', fr: 'En route' },
  picked_up: { color: '#7c3aed', bg: '#ede9fe', en: 'Picked up', fr: 'Ramassé' },
};
const WASTE = { household: { en: 'Household', fr: 'Ménager' }, bulky: { en: 'Bulky', fr: 'Encombrant' }, recyclables: { en: 'Recyclables', fr: 'Recyclables' }, garden: { en: 'Garden', fr: 'Jardin' } };
const fcfa = (n) => `${Number(n || 0).toLocaleString()} FCFA`;
const initials = (name) => (name || 'R').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function OnDemandScreen({ navigation }) {
  const { user, language, updateUser } = useAuth();
  const en = language === 'en';

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onDuty, setOnDuty] = useState(!!user?.onDuty);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try { setJobs(await getAssignedPickups()); }
    catch (err) { console.error('Assigned pickups error:', err); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { setOnDuty(!!user?.onDuty); }, [user?.onDuty]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleDuty = async () => {
    const next = !onDuty;
    setOnDuty(next);
    try { const { onDuty: saved } = await setDuty(next); if (user) updateUser({ ...user, onDuty: saved }); }
    catch { setOnDuty(!next); Alert.alert(en ? 'Could not update' : 'Mise à jour impossible'); }
  };

  const advance = async (job) => {
    const step = NEXT[job.status];
    if (!step) return;
    setBusyId(job._id);
    try { await advancePickup(job._id, step.to); await load(); }
    catch (err) { Alert.alert(en ? 'Could not update job' : 'Mise à jour impossible', err.response?.data?.message || ''); }
    finally { setBusyId(null); }
  };

  const openMaps = (job) => {
    const addr = job.location?.address || job.location?.zone || '';
    const gps = job.location?.coordinates;
    const q = gps ? `${gps.lat},${gps.lng}` : encodeURIComponent(`${addr}, Buea, Cameroon`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const active = jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled' && j.status !== 'declined');
  const primary = active.find((j) => j.status === 'en_route' || j.status === 'picked_up') || active.find((j) => j.status === 'accepted');
  const queued = active.filter((j) => j._id !== primary?._id);
  const doneToday = jobs.filter((j) => j.status === 'completed');
  const earned = doneToday.reduce((s, j) => s + (j.fee || 0), 0);

  return (
    <View style={styles.screen}>
      {/* App bar */}
      <View style={styles.appBar}>
        <View style={[styles.rowTight, { flex: 1 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}><ArrowLeftIcon size={22} color={colors.text} /></TouchableOpacity>
          <View style={styles.brandIcon}><RecycleIcon size={18} color="#fff" strokeWidth={3} /></View>
          <View style={{ flex: 1 }}>
            <View style={styles.rowTight}>
              <Text style={styles.brandName}>EcoPulse</Text>
              <View style={styles.jobsBadge}><Text style={styles.jobsBadgeText}>JOBS</Text></View>
            </View>
            <Text style={styles.brandSub} numberOfLines={1}>{user?.operatorName || (en ? 'Operator' : 'Opérateur')} · {user?.name || 'Hauler'}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.dutyPill, onDuty ? styles.dutyOn : styles.dutyOff]} onPress={toggleDuty} activeOpacity={0.8}>
          <View style={[styles.dutyDot, { backgroundColor: onDuty ? '#16a34a' : '#94a3b8' }]} />
          <Text style={[styles.dutyText, { color: onDuty ? '#15803d' : '#475569' }]}>{onDuty ? (en ? 'Active' : 'Actif') : (en ? 'Off' : 'Hors')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Notifications')}>
          <BellIcon size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />}

        {!loading && !primary && (
          <View style={styles.emptyCard}>
            <TruckIcon size={28} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{onDuty ? (en ? 'No active jobs right now' : 'Aucun travail actif') : (en ? "You're off duty" : 'Hors service')}</Text>
            <Text style={styles.emptySub}>{onDuty ? (en ? 'New dispatches from your operator appear here.' : 'Les nouvelles missions apparaîtront ici.') : (en ? 'Go Active to receive dispatches.' : 'Passez en Actif pour recevoir des missions.')}</Text>
          </View>
        )}

        {/* Active pickup */}
        {primary && (() => {
          const st = STATUS[primary.status] || STATUS.accepted;
          const step = NEXT[primary.status];
          const addr = primary.location?.address || primary.location?.zone || '';
          return (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <View style={styles.rowTight}><View style={styles.livePulse} /><Text style={styles.sectionTitle}>{en ? 'Current Active Pickup' : 'Ramassage actif'}</Text></View>
                <Text style={styles.tripId}>#{(primary._id || '').slice(-6).toUpperCase()}</Text>
              </View>

              <View style={styles.card}>
                {/* Customer row */}
                <View style={styles.rowBetween}>
                  <View style={styles.rowTight}>
                    <View style={styles.custAvatar}><Text style={styles.custAvatarText}>{initials(primary.residentName)}</Text></View>
                    <View>
                      <Text style={styles.custName}>{primary.residentName || (en ? 'Resident' : 'Résident')}</Text>
                      <Text style={styles.custSub}>{WASTE[primary.wasteType]?.[en ? 'en' : 'fr'] || primary.wasteType} · {primary.loadSize || ''}</Text>
                    </View>
                  </View>
                  <View style={styles.rowTight}>
                    {!!primary.phone && (
                      <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${primary.phone}`)} activeOpacity={0.8}><PhoneIcon size={16} color={BLUE} /></TouchableOpacity>
                    )}
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                      <Text style={[styles.statusText, { color: st.color }]}>{en ? st.en : st.fr}</Text>
                    </View>
                  </View>
                </View>

                {/* Location box */}
                <View style={styles.locBox}>
                  <View style={styles.rowStartTop}>
                    <MapPinIcon size={16} color={colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locText}>{addr || (en ? 'Pickup location' : 'Lieu de ramassage')}</Text>
                      {!!primary.note && (
                        <View style={[styles.rowTight, { marginTop: 3 }]}><InfoIcon size={13} color="#b45309" /><Text style={styles.noteText}>{primary.note}</Text></View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.navBtn} onPress={() => openMaps(primary)} activeOpacity={0.85}>
                    <NavigationIcon size={18} color={BLUE} /><Text style={styles.navBtnText}>{en ? 'Navigate' : 'Naviguer'}</Text>
                  </TouchableOpacity>
                  {step && (
                    <TouchableOpacity style={[styles.advanceBtn, busyId === primary._id && { opacity: 0.6 }]} onPress={() => advance(primary)} disabled={busyId === primary._id} activeOpacity={0.9}>
                      {busyId === primary._id ? <ActivityIndicator color="#fff" /> : (
                        <><CheckIcon size={16} color="#fff" strokeWidth={2.5} /><Text style={styles.advanceBtnText}>{en ? step.en : step.fr}</Text></>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Payment banner */}
                <View style={styles.payBanner}>
                  <View style={styles.rowTight}>
                    <View style={styles.payIcon}><Text style={styles.payIconText}>₣</Text></View>
                    <View>
                      <Text style={styles.payTitle}>{en ? 'Confirm cash payment' : 'Confirmer paiement'}</Text>
                      <Text style={styles.paySub}>{en ? 'Collect on pickup' : 'À la collecte'}</Text>
                    </View>
                  </View>
                  <View style={styles.payAmount}><Text style={styles.payAmountText}>{fcfa(primary.fee)}</Text></View>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Queued nearby */}
        {queued.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.rowTight}><Text style={styles.sectionTitle}>{en ? 'Queued' : 'En file'}</Text><View style={styles.countPill}><Text style={styles.countPillText}>{queued.length} {en ? 'available' : 'dispo'}</Text></View></View>
            </View>
            {queued.map((job) => (
              <View key={job._id} style={styles.queueCard}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTight}><MapPinIcon size={14} color={colors.textMuted} /><Text style={styles.queueLoc}>{job.location?.address || job.location?.zone || (en ? 'Pickup' : 'Ramassage')}</Text></View>
                  <Text style={styles.queueMeta}>{WASTE[job.wasteType]?.[en ? 'en' : 'fr'] || job.wasteType}</Text>
                  <View style={[styles.rowTight, { marginTop: 4 }]}>
                    <View style={styles.feeChip}><Text style={styles.feeChipText}>{fcfa(job.fee)}</Text></View>
                    <Text style={styles.queueDot}>·</Text>
                    <Text style={styles.queueCash}>{en ? 'Cash' : 'Espèces'}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.queueBtn} onPress={() => advance(job)} disabled={busyId === job._id} activeOpacity={0.85}>
                  {busyId === job._id ? <ActivityIndicator color={BLUE} size="small" /> : <Text style={styles.queueBtnText}>{en ? 'Start' : 'Démarrer'}</Text>}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Today's earnings strip */}
        <View style={styles.earnStrip}>
          <View style={styles.rowTight}>
            <View style={styles.earnIcon}><CheckIcon size={14} color="#fff" strokeWidth={3} /></View>
            <View>
              <Text style={styles.earnLabel}>{en ? "TODAY'S SHIFT" : 'AUJOURD\'HUI'}</Text>
              <Text style={styles.earnJobs}>{doneToday.length} {en ? 'jobs completed' : 'terminés'}</Text>
            </View>
          </View>
          <View style={styles.rowTight}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.earnAmount}>{fcfa(earned)}</Text>
              <Text style={styles.earnSub}>{en ? 'earned' : 'gagné'}</Text>
            </View>
            <ChevronRightIcon size={18} color="#166534" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  rowTight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowStartTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },

  appBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f9' },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  brandIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 16, fontWeight: '800', color: BLUE },
  jobsBadge: { backgroundColor: '#dbeafe', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  jobsBadgeText: { fontSize: 9, fontWeight: '800', color: BLUE },
  brandSub: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  dutyPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  dutyOn: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  dutyOff: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  dutyDot: { width: 7, height: 7, borderRadius: 4 },
  dutyText: { fontSize: 11, fontWeight: '800' },
  bellBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  section: { marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  tripId: { fontSize: 11, color: colors.textMuted },
  countPill: { backgroundColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  countPillText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4e9f2', padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  custAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  custAvatarText: { fontSize: 13, fontWeight: '800', color: BLUE },
  custName: { fontSize: 14, fontWeight: '700', color: colors.text },
  custSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  callBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  locBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e4e9f2', borderRadius: 10, padding: 10 },
  locText: { fontSize: 13, fontWeight: '600', color: colors.text },
  noteText: { fontSize: 12, color: '#b45309', flex: 1 },

  actionRow: { flexDirection: 'row', gap: 10 },
  navBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#e4e9f2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  navBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  advanceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: BLUE, borderRadius: 12, paddingVertical: 11 },
  advanceBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  payBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 10 },
  payIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  payIconText: { fontSize: 15, fontWeight: '800', color: '#b45309' },
  payTitle: { fontSize: 12, fontWeight: '800', color: '#92400e' },
  paySub: { fontSize: 11, color: '#b45309' },
  payAmount: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  payAmountText: { fontSize: 13, fontWeight: '800', color: '#b45309' },

  queueCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e4e9f2', padding: 12, marginBottom: 10 },
  queueLoc: { fontSize: 13, fontWeight: '700', color: colors.text },
  queueMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginLeft: 20 },
  feeChip: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 20 },
  feeChipText: { fontSize: 11, fontWeight: '800', color: '#92400e' },
  queueDot: { color: '#cbd5e1' },
  queueCash: { fontSize: 11, color: colors.textSecondary, backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  queueBtn: { borderWidth: 1, borderColor: BLUE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  queueBtnText: { fontSize: 13, fontWeight: '800', color: BLUE },

  earnStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 4 },
  earnIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  earnLabel: { fontSize: 10, fontWeight: '800', color: '#15803d', letterSpacing: 0.5 },
  earnJobs: { fontSize: 13, fontWeight: '700', color: '#166534' },
  earnAmount: { fontSize: 15, fontWeight: '800', color: '#15803d' },
  earnSub: { fontSize: 10, color: '#166534' },

  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', padding: 30, marginTop: 10, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
