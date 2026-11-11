import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import {
  RecycleIcon, StarIcon, CheckIcon, LogoutIcon, ChevronRightIcon, CameraIcon,
  ClockIcon, BellIcon, ShieldCheckIcon, ChatBubbleIcon, TruckIcon,
} from '../components/Icons';
import api from '../api/axios';
import { shrinkPhoto } from '../utils/shrinkPhoto';
import { getAssignedPickups, setDuty } from '../api/pickups';

const BLUE = '#2563eb';
const fcfa = (n) => `${Number(n || 0).toLocaleString()} FCFA`;
const isToday = (d) => { const x = new Date(d); const n = new Date(); return x.toDateString() === n.toDateString(); };
const isThisWeek = (d) => { const x = new Date(d); const n = new Date(); const diff = (n - x) / 86400000; return diff >= 0 && diff < 7; };

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser, language, selectLanguage } = useAuth();
  const en = language === 'en';
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [onDuty, setOnDuty] = useState(!!user?.onDuty);

  const load = useCallback(async () => {
    try { setJobs(await getAssignedPickups()); } catch { /* municipal collector / offline */ }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOnDuty(!!user?.onDuty); }, [user?.onDuty]);

  const toggleDuty = async () => {
    const next = !onDuty; setOnDuty(next);
    try { const { onDuty: saved } = await setDuty(next); if (user) updateUser({ ...user, onDuty: saved }); }
    catch { setOnDuty(!next); }
  };

  const completed = jobs.filter((j) => j.status === 'completed');
  const today = completed.filter((j) => isToday(j.updatedAt || j.createdAt));
  const week = completed.filter((j) => isThisWeek(j.updatedAt || j.createdAt));
  const todayEarn = today.reduce((s, j) => s + (j.fee || 0), 0);
  const weekEarn = week.reduce((s, j) => s + (j.fee || 0), 0);
  const acceptance = jobs.length ? Math.round((jobs.filter((j) => j.status !== 'declined').length / jobs.length) * 100) : 100;

  const initials = (user?.name || 'C').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const name = user?.name || (en ? 'Collector' : 'Collecteur');
  const vehicle = user?.truck || user?.vehicle || (en ? 'No vehicle assigned' : 'Aucun véhicule');
  const rating = user?.rating ? Number(user.rating).toFixed(1) : null;

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(en ? 'Permission needed' : 'Autorisation requise', en ? 'Allow access to your photos.' : "Autorisez l'accès à vos photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    let base64;
    try { base64 = (await shrinkPhoto(result.assets[0], 512)).dataUrl; }
    catch { Alert.alert(en ? 'Photo problem' : 'Problème de photo'); return; }
    setUploading(true);
    try { await api.put('/collectors/me/avatar', { avatar: base64 }, { timeout: 30000 }); if (updateUser) updateUser({ ...user, avatar: base64 }); }
    catch { Alert.alert(en ? 'Upload failed' : "Échec de l'envoi"); }
    finally { setUploading(false); }
  };

  const Stat = ({ label, value, accent }) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: '#15803d' }]}>{value}</Text>
    </View>
  );

  const SettingRow = ({ icon, title, sub, onPress, danger, last }) => (
    <TouchableOpacity style={[styles.setRow, !last && styles.setRowBorder]} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.rowTight}>
        <View style={[styles.setIcon, danger && { backgroundColor: '#fee2e2' }]}>{icon}</View>
        <View>
          <Text style={[styles.setTitle, danger && { color: colors.critical }]}>{title}</Text>
          {sub && <Text style={styles.setSub}>{sub}</Text>}
        </View>
      </View>
      <ChevronRightIcon size={16} color={danger ? '#fca5a5' : '#cbd5e1'} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      {/* App bar */}
      <View style={styles.appBar}>
        <View style={styles.rowTight}><RecycleIcon size={24} color={BLUE} strokeWidth={3} /><Text style={styles.appBarTitle}>{en ? 'Profile' : 'Profil'}</Text></View>
        <View style={styles.langSwitch}>
          {['en', 'fr'].map((l) => (
            <TouchableOpacity key={l} style={[styles.langOpt, language === l && styles.langOptActive]} onPress={() => selectLanguage(l)}>
              <Text style={[styles.langText, language === l && { color: '#fff' }]}>{l.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={[styles.rowTight, { flex: 1 }]}>
              <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
                {user?.avatar ? <Image source={{ uri: user.avatar }} style={styles.avatarImg} /> : (
                  <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
                )}
                <View style={styles.camBadge}>{uploading ? <ActivityIndicator size="small" color="#fff" /> : <CameraIcon size={11} color="#fff" />}</View>
                <View style={styles.onlineDot} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTight}><Text style={styles.name}>{name}</Text><ShieldCheckIcon size={16} color={BLUE} /></View>
                <Text style={styles.vehicle} numberOfLines={1}>{user?.operatorName || (en ? 'Field Collector' : 'Collecteur')} · {vehicle}</Text>
                {rating && <View style={[styles.rowTight, { marginTop: 2, gap: 4 }]}><StarIcon size={14} color="#f59e0b" /><Text style={styles.ratingNum}>{rating}</Text>{user?.reviewCount ? <Text style={styles.ratingCount}>({user.reviewCount})</Text> : null}</View>}
              </View>
            </View>
            <TouchableOpacity style={[styles.dutyToggle, onDuty ? styles.dutyOn : styles.dutyOff]} onPress={toggleDuty} activeOpacity={0.8}>
              <View style={[styles.dutyKnob, onDuty ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                {onDuty ? <CheckIcon size={11} color="#16a34a" strokeWidth={3} /> : null}
              </View>
            </TouchableOpacity>
          </View>
          <Text style={[styles.dutyLabel, { color: onDuty ? '#15803d' : colors.textMuted }]}>{onDuty ? (en ? 'On duty' : 'En service') : (en ? 'Off duty' : 'Hors service')}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label={en ? 'Jobs today' : "Auj."} value={String(today.length)} />
          <Stat label={en ? 'This week' : 'Semaine'} value={String(week.length)} />
          <Stat label={en ? 'Acceptance' : 'Accept.'} value={`${acceptance}%`} accent />
          <Stat label={en ? 'Rating' : 'Note'} value={rating || '—'} />
        </View>

        {/* Earnings hero */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.earnLabel}>{en ? "Today's earnings" : "Gains du jour"}</Text>
              <View style={[styles.rowTight, { alignItems: 'baseline', gap: 4, marginTop: 2 }]}>
                <Text style={styles.earnValue}>{todayEarn.toLocaleString()}</Text><Text style={styles.earnUnit}>FCFA</Text>
              </View>
            </View>
            <View style={styles.weekChip}>
              <Text style={styles.weekChipLabel}>{en ? 'Week' : 'Semaine'}</Text>
              <Text style={styles.weekChipValue}>{fcfa(weekEarn)}</Text>
            </View>
          </View>
          <View style={styles.remitBox}>
            <View style={styles.rowTight}>
              <View style={styles.remitIcon}><Text style={styles.remitIconText}>₣</Text></View>
              <Text style={styles.remitLabel}>{en ? 'Cash to remit to operator' : 'Espèces à remettre'}</Text>
            </View>
            <View style={styles.rowTight}>
              <Text style={styles.remitAmount}>{fcfa(todayEarn)}</Text>
              <View style={styles.pendingPill}><Text style={styles.pendingText}>{en ? 'Pending' : 'En attente'}</Text></View>
            </View>
          </View>
          <TouchableOpacity style={styles.remitBtn} activeOpacity={0.9} onPress={() => Alert.alert(en ? 'Remit cash' : 'Remettre', en ? `Hand ${fcfa(todayEarn)} to your operator depot or transfer electronically.` : `Remettez ${fcfa(todayEarn)} au dépôt.`)}>
            <Text style={styles.remitBtnText}>{en ? 'Remit cash to depot' : 'Remettre au dépôt'}</Text>
            <ChevronRightIcon size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Recent jobs */}
        {completed.length > 0 && (
          <>
            <Text style={styles.groupLabel}>{en ? 'RECENT JOBS' : 'TRAVAUX RÉCENTS'}</Text>
            <View style={styles.group}>
              {completed.slice(0, 4).map((j, i, arr) => (
                <View key={j._id} style={[styles.jobRow, i < arr.length - 1 && styles.setRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobLoc} numberOfLines={1}>{j.location?.address || j.location?.zone || (en ? 'Pickup' : 'Ramassage')}</Text>
                    <Text style={styles.jobMeta} numberOfLines={1}>{j.wasteType} · {j.loadSize || ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.jobFee}>{fcfa(j.fee)}</Text>
                    <View style={styles.doneChip}><View style={styles.doneDot} /><Text style={styles.doneChipText}>{en ? 'Completed' : 'Terminé'}</Text></View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Vehicle & compliance */}
        <Text style={styles.groupLabel}>{en ? 'VEHICLE & COMPLIANCE' : 'VÉHICULE & CONFORMITÉ'}</Text>
        <View style={styles.group}>
          {[
            { t: en ? 'Driver License' : 'Permis', s: user?.licenseNo || 'BUA-DRV-2024', b: en ? 'Verified' : 'Vérifié' },
            { t: en ? 'Assigned Vehicle' : 'Véhicule', s: vehicle, b: en ? 'Active' : 'Actif' },
            { t: en ? 'Council Sector Permit' : 'Permis secteur', s: `${user?.zone || 'Molyko'} · Buea`, b: en ? 'Authorized' : 'Autorisé' },
          ].map((c, i, arr) => (
            <View key={c.t} style={[styles.setRow, i < arr.length - 1 && styles.setRowBorder]}>
              <View style={styles.rowTight}>
                <CheckIcon size={18} color="#16a34a" strokeWidth={2.5} />
                <View><Text style={styles.setTitle}>{c.t}</Text><Text style={styles.setSub}>{c.s}</Text></View>
              </View>
              <View style={styles.verifiedPill}><Text style={styles.verifiedText}>{c.b}</Text></View>
            </View>
          ))}
        </View>

        {/* Settings */}
        <Text style={styles.groupLabel}>{en ? 'SETTINGS' : 'PARAMÈTRES'}</Text>
        <View style={styles.group}>
          <SettingRow icon={<ClockIcon size={16} color={colors.text} />} title={en ? 'Availability & leave' : 'Disponibilité & congé'} sub={en ? 'Shift schedule & time off' : 'Horaire & congés'} onPress={() => navigation.navigate('Leave')} />
          <SettingRow icon={<BellIcon size={16} color={colors.text} />} title={en ? 'Notifications & alerts' : 'Notifications'} sub={en ? 'Dispatch sound & vibration' : 'Sons & vibrations'} onPress={() => navigation.navigate('Notifications')} />
          <SettingRow icon={<ShieldCheckIcon size={16} color={colors.text} />} title={en ? 'Change password' : 'Mot de passe'} sub={en ? 'Update your sign-in password' : 'Modifier le mot de passe'} onPress={() => navigation.navigate('ChangePassword')} />
          <SettingRow icon={<ChatBubbleIcon size={16} color={colors.text} />} title={en ? 'Help & operator dispatch' : 'Aide & dispatch'} sub={en ? 'Supervisor hotline' : 'Ligne superviseur'} onPress={() => navigation.navigate('Chat')} last />
        </View>

        {/* Log out */}
        <View style={styles.group}>
          <SettingRow icon={<LogoutIcon size={16} color={colors.critical} />} title={en ? 'Log out of EcoPulse' : 'Déconnexion'} danger last
            onPress={() => Alert.alert(en ? 'Sign Out' : 'Déconnexion', en ? 'Are you sure?' : 'Êtes-vous sûr ?', [{ text: en ? 'Cancel' : 'Annuler', style: 'cancel' }, { text: en ? 'Sign Out' : 'Déconnexion', style: 'destructive', onPress: logout }])}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  rowTight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f9' },
  appBarTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  langSwitch: { flexDirection: 'row', backgroundColor: '#eef2f9', borderRadius: 10, padding: 3 },
  langOpt: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  langOptActive: { backgroundColor: BLUE },
  langText: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', padding: 14, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatarText: { fontSize: 18, fontWeight: '800', color: BLUE },
  camBadge: { position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  vehicle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  ratingNum: { fontSize: 13, fontWeight: '700', color: colors.text },
  ratingCount: { fontSize: 12, color: colors.textMuted },
  dutyToggle: { width: 46, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  dutyOn: { backgroundColor: '#16a34a' },
  dutyOff: { backgroundColor: '#cbd5e1' },
  dutyKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dutyLabel: { fontSize: 11, fontWeight: '700', textAlign: 'right', marginTop: 6 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eef2f9', paddingVertical: 10, alignItems: 'center' },
  statLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },

  earnLabel: { fontSize: 12, color: colors.textSecondary },
  earnValue: { fontSize: 24, fontWeight: '800', color: '#15803d' },
  earnUnit: { fontSize: 13, fontWeight: '700', color: '#15803d' },
  weekChip: { backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'flex-end' },
  weekChipLabel: { fontSize: 10, color: colors.textSecondary },
  weekChipValue: { fontSize: 12, fontWeight: '700', color: colors.text },
  remitBox: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remitIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  remitIconText: { fontSize: 14, fontWeight: '800', color: '#b45309' },
  remitLabel: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  remitAmount: { fontSize: 14, fontWeight: '800', color: '#b45309' },
  pendingPill: { backgroundColor: '#fde68a', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  pendingText: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  remitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: BLUE, borderRadius: 12, paddingVertical: 12, marginTop: 10 },
  remitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  groupLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 8, marginLeft: 4, marginTop: 4 },
  group: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', overflow: 'hidden', marginBottom: 14 },
  jobRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  jobLoc: { fontSize: 13, fontWeight: '700', color: colors.text },
  jobMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  jobFee: { fontSize: 13, fontWeight: '800', color: colors.text },
  doneChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginTop: 3 },
  doneDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22c55e' },
  doneChipText: { fontSize: 10, fontWeight: '700', color: '#15803d' },

  setRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  setRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  setIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef2f9', alignItems: 'center', justifyContent: 'center' },
  setTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  setSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  verifiedPill: { backgroundColor: '#ecfdf5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
});
