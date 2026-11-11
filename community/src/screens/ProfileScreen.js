import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import {
  RecycleIcon, UserIcon, MapPinIcon, GlobeIcon, BellIcon, LogoutIcon,
  ChevronRightIcon, InfoIcon, CheckBadgeIcon, TruckIcon, ClockIcon,
} from '../components/Icons';
import api from '../api/axios';
import { getMyPickups } from '../api/operators';

const BLUE = '#2563eb';
const initials = (name) => (name || '').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
const maskPhone = (p) => (p ? `${p.slice(0, 3)}•• ••• ${p.slice(-3)}` : '');

export default function ProfileScreen({ navigation }) {
  const { zone, clearZone, language, selectLanguage, profile, registerProfile, autoZone, toggleAutoZone, clearProfile } = useZone();
  const en = language === 'en';
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [notif, setNotif] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [stats, setStats] = useState({ pickups: 0, reports: 0, cleaned: 0 });

  const loadStats = useCallback(async () => {
    let pickups = 0, reports = 0, cleaned = 0;
    try { const p = await getMyPickups(); pickups = Array.isArray(p) ? p.length : 0; } catch { /* offline */ }
    try { const { data } = await api.get('/reports/mine'); reports = (data || []).length; cleaned = (data || []).filter((r) => r.status === 'resolved').length; } catch { /* offline */ }
    setStats({ pickups, reports, cleaned });
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  const credits = stats.reports * 10 + stats.cleaned * 15;

  const saveName = async () => {
    if (!name.trim()) { Alert.alert(en ? 'Name required' : 'Nom requis'); return; }
    try { await registerProfile({ name: name.trim(), phone: profile.phone }); setEditing(false); }
    catch { Alert.alert(en ? 'Could not save' : 'Enregistrement impossible', en ? 'Check your connection and try again.' : 'Vérifiez votre connexion.'); }
  };

  const signOut = () => {
    Alert.alert(
      en ? 'Log out' : 'Déconnexion',
      en ? 'Are you sure you want to log out?' : 'Voulez-vous vraiment vous déconnecter?',
      [
        { text: en ? 'Cancel' : 'Annuler', style: 'cancel' },
        { text: en ? 'Log out' : 'Déconnexion', style: 'destructive', onPress: async () => { await clearProfile(); await clearZone(); } },
      ]
    );
  };

  const Row = ({ icon, label, sub, value, onPress, last }) => (
    <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={onPress} activeOpacity={onPress ? 0.6 : 1} disabled={!onPress}>
      <View style={[styles.rowStart, { flex: 1 }]}>
        {icon}
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          {sub && <Text style={styles.rowSub}>{sub}</Text>}
        </View>
      </View>
      <View style={styles.rowStartTight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        <ChevronRightIcon size={16} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );

  const ToggleRow = ({ icon, label, sub, value, onValueChange, last }) => (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowStart, { flex: 1 }]}>
        {icon}
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          {sub && <Text style={styles.rowSub}>{sub}</Text>}
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.cardBorder, true: BLUE }} thumbColor="#fff" />
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* App bar */}
      <View style={styles.appBar}>
        <View style={styles.rowStart}>
          <View style={styles.brandIcon}><RecycleIcon size={20} color="#fff" strokeWidth={3} /></View>
          <View>
            <Text style={styles.brandName}>EcoPulse</Text>
            <Text style={styles.brandSub}>Buea Municipality</Text>
          </View>
        </View>
        <View style={styles.avatar}><UserIcon size={18} color="#fff" /></View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={[styles.rowStart, { flex: 1 }]}>
              <View style={styles.bigAvatar}>
                <Text style={styles.bigAvatarText}>{initials(profile?.name)}</Text>
                <View style={styles.verifiedBadge}><CheckBadgeIcon size={13} color="#fff" /></View>
              </View>
              {editing ? (
                <View style={{ flex: 1 }}>
                  <TextInput style={styles.nameInput} value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
                  <View style={styles.rowStartTight}>
                    <TouchableOpacity onPress={() => { setName(profile?.name || ''); setEditing(false); }}><Text style={styles.editCancel}>{en ? 'Cancel' : 'Annuler'}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={saveName}><Text style={styles.editSave}>{en ? 'Save' : 'Enregistrer'}</Text></TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{profile?.name || (en ? 'Resident' : 'Résident')}</Text>
                  <Text style={styles.profileMeta}>{zone}, Buea · {maskPhone(profile?.phone)}</Text>
                  <View style={[styles.rowStartTight, { marginTop: 2 }]}>
                    <CheckBadgeIcon size={13} color="#0369a1" />
                    <Text style={styles.profileSince}>{en ? 'Verified resident' : 'Résident vérifié'}</Text>
                  </View>
                </View>
              )}
            </View>
            {!editing && <TouchableOpacity onPress={() => setEditing(true)}><Text style={styles.editBtn}>{en ? 'Edit' : 'Modifier'}</Text></TouchableOpacity>}
          </View>
        </View>

        {/* EcoCredits */}
        <View style={styles.creditCard}>
          <View style={styles.rowBetween}>
            <View style={[styles.rowStart, { flex: 1 }]}>
              <View style={styles.creditIcon}><RecycleIcon size={20} color="#0369a1" strokeWidth={2.5} /></View>
              <View>
                <Text style={styles.creditValue}>{credits} EcoCredits</Text>
                <Text style={styles.creditSub}>{en ? `≈ ${(credits * 10).toLocaleString()} FCFA utility discount` : `≈ ${(credits * 10).toLocaleString()} FCFA de remise`}</Text>
              </View>
            </View>
            <View style={styles.rowStartTight}>
              <Text style={styles.redeem}>{en ? 'Redeem' : 'Utiliser'}</Text>
              <ChevronRightIcon size={15} color="#0369a1" />
            </View>
          </View>
          <View style={styles.creditFooter}>
            <Text style={styles.creditFooterText}>{en ? 'Earned for sorting & recycling waste' : 'Gagnés en triant vos déchets'}</Text>
            <Text style={styles.creditTier}>{en ? 'Tier: Green Citizen' : 'Niveau : Citoyen Vert'}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { v: stats.pickups, l: en ? 'Pickups' : 'Ramassages' },
            { v: stats.reports, l: en ? 'Reports' : 'Signalements' },
            { v: stats.cleaned, l: en ? 'Resolved' : 'Résolus', accent: true },
          ].map((s) => (
            <View key={s.l} style={styles.statCard}>
              <Text style={[styles.statValue, s.accent && { color: '#0369a1' }]}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Become a collector CTA */}
        <View style={styles.ctaCard}>
          <View style={styles.rowStartTight}>
            <View style={styles.ctaBadge}><Text style={styles.ctaBadgeText}>{en ? 'Earn with EcoPulse' : 'Gagnez avec EcoPulse'}</Text></View>
            <Text style={styles.ctaCertified}>{en ? 'Council Certified' : 'Certifié Conseil'}</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.ctaTitle}>{en ? 'Become a collector' : 'Devenir collecteur'}</Text>
              <Text style={styles.ctaBody}>{en ? 'Earn 3,500–12,000 FCFA daily collecting recyclables around Buea. Join a verified operator fleet.' : 'Gagnez 3 500–12 000 FCFA/jour en collectant des recyclables à Buea.'}</Text>
            </View>
            <View style={styles.ctaIcon}><TruckIcon size={24} color={BLUE} /></View>
          </View>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('ApplyCollector')} activeOpacity={0.9}>
            <Text style={styles.ctaBtnText}>{en ? 'Apply now' : 'Postuler'}</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text style={styles.groupLabel}>{en ? 'PREFERENCES' : 'PRÉFÉRENCES'}</Text>
        <View style={styles.group}>
          <Row icon={<MapPinIcon size={20} color={colors.textSecondary} />} label={en ? 'Default zone' : 'Zone par défaut'} value={zone} onPress={clearZone} />
          <Row icon={<GlobeIcon size={20} color={colors.textSecondary} />} label={en ? 'Language' : 'Langue'} value={en ? 'English' : 'Français'} onPress={() => selectLanguage(en ? 'fr' : 'en')} />
          <ToggleRow icon={<BellIcon size={20} color={colors.textSecondary} />} label={en ? 'Notifications' : 'Notifications'} sub={en ? 'SMS & push updates' : 'SMS & push'} value={notif} onValueChange={setNotif} />
          <ToggleRow icon={<MapPinIcon size={20} color={colors.textSecondary} />} label={en ? 'Auto-detect zone' : 'Détection auto'} sub={en ? 'Switch zone by GPS' : 'Zone par GPS'} value={autoZone} onValueChange={toggleAutoZone} last />
        </View>

        {/* App & support */}
        <Text style={styles.groupLabel}>{en ? 'APP & MUNICIPAL SUPPORT' : 'APP & SUPPORT'}</Text>
        <View style={styles.group}>
          <ToggleRow icon={<ClockIcon size={20} color={colors.textSecondary} />} label={en ? 'Collection reminders' : 'Rappels de collecte'} sub={en ? 'HYSACAM sweep alerts' : 'Alertes HYSACAM'} value={reminders} onValueChange={setReminders} />
          <Row icon={<InfoIcon size={20} color={colors.textSecondary} />} label={en ? 'About EcoPulse' : 'À propos'} onPress={() => Alert.alert('EcoPulse', en ? 'Smart waste platform for Buea Municipality.\nCommunity App v2.4.1' : 'Plateforme de gestion des déchets pour Buea.\nApp v2.4.1')} />
          <Row icon={<CheckBadgeIcon size={20} color={colors.textSecondary} />} label={en ? 'Terms & civic bye-laws' : 'Conditions & règlements'} onPress={() => Alert.alert(en ? 'Terms' : 'Conditions', en ? 'By using EcoPulse you agree to Buea municipal waste bye-laws.' : 'En utilisant EcoPulse vous acceptez les règlements municipaux.')} last />
        </View>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.8}>
          <View style={styles.rowStart}><LogoutIcon size={20} color={colors.critical} /><Text style={styles.logoutText}>{en ? 'Log out' : 'Déconnexion'}</Text></View>
          <ChevronRightIcon size={18} color={colors.critical} />
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.rowStartTight}>
            <CheckBadgeIcon size={14} color="#0369a1" />
            <Text style={styles.footerText}>EcoPulse · Buea Municipal Waste Platform · v2.4.1</Text>
          </View>
          <Text style={styles.footerSub}>Buea Municipal Council · Southwest Region, Cameroon</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  rowStart: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowStartTight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f9' },
  brandIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 16, fontWeight: '800', color: colors.text },
  brandSub: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', padding: 14, marginBottom: 12 },
  bigAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { fontSize: 18, fontWeight: '800', color: BLUE },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  profileName: { fontSize: 16, fontWeight: '800', color: colors.text },
  profileMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  profileSince: { fontSize: 11, color: colors.textSecondary },
  editBtn: { fontSize: 13, fontWeight: '700', color: BLUE, paddingHorizontal: 6 },
  nameInput: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: colors.text, backgroundColor: '#f8fafc', marginBottom: 8 },
  editCancel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, paddingVertical: 4, paddingRight: 14 },
  editSave: { fontSize: 13, fontWeight: '700', color: BLUE, paddingVertical: 4 },

  creditCard: { backgroundColor: '#e0f2fe', borderRadius: 16, padding: 14, marginBottom: 12 },
  creditIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  creditValue: { fontSize: 18, fontWeight: '800', color: '#0b1f3a' },
  creditSub: { fontSize: 11, color: '#0369a1', marginTop: 1 },
  redeem: { fontSize: 13, fontWeight: '700', color: '#0369a1' },
  creditFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(3,105,161,0.15)' },
  creditFooterText: { fontSize: 11, color: '#0c4a6e' },
  creditTier: { fontSize: 11, fontWeight: '700', color: '#0369a1' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f9', paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  ctaCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', padding: 14, marginBottom: 20 },
  ctaBadge: { backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  ctaBadgeText: { fontSize: 10, fontWeight: '700', color: '#b45309' },
  ctaCertified: { fontSize: 10, color: colors.textMuted },
  ctaTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  ctaBody: { fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
  ctaIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  ctaBtn: { backgroundColor: BLUE, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  ctaBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  groupLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', overflow: 'hidden', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  rowValue: { fontSize: 13, color: colors.textSecondary },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#fee2e2', padding: 16, marginBottom: 20 },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.critical },

  footer: { alignItems: 'center', paddingBottom: 10 },
  footerText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  footerSub: { fontSize: 11, color: colors.textMuted, marginTop: 3, textAlign: 'center' },
});
