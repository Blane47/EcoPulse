import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useZone } from '../context/ZoneContext';
import { colors, shadows } from '../theme';
import TealHeader from '../components/TealHeader';
import {
  getAvailableOperators, createPickup, getMyPickups, cancelPickup, estimateFee,
} from '../api/operators';

const WASTE_TYPES = [
  { key: 'household', en: 'Household', fr: 'Ménager' },
  { key: 'bulky', en: 'Bulky', fr: 'Encombrant' },
  { key: 'recyclables', en: 'Recyclables', fr: 'Recyclables' },
  { key: 'garden', en: 'Garden', fr: 'Jardin' },
];
const LOAD_SIZES = [
  { key: 'small', en: 'Small', fr: 'Petit' },
  { key: 'medium', en: 'Medium', fr: 'Moyen' },
  { key: 'large', en: 'Large', fr: 'Grand' },
];

const STATUS_STYLE = {
  requested: { color: colors.warning, bg: colors.warningLight, en: 'Requested', fr: 'Demandé' },
  accepted: { color: '#2563eb', bg: '#dbeafe', en: 'Accepted', fr: 'Accepté' },
  en_route: { color: '#2563eb', bg: '#dbeafe', en: 'On the way', fr: 'En route' },
  picked_up: { color: '#7c3aed', bg: '#ede9fe', en: 'Picked up', fr: 'Ramassé' },
  completed: { color: colors.accent, bg: colors.accentLight, en: 'Completed', fr: 'Terminé' },
  cancelled: { color: colors.textMuted, bg: '#f3f4f6', en: 'Cancelled', fr: 'Annulé' },
  declined: { color: colors.critical, bg: colors.criticalLight, en: 'Declined', fr: 'Refusé' },
};

const fcfa = (n) => `${Number(n || 0).toLocaleString()} FCFA`;

export default function OperatorsScreen() {
  const { zone, language, profile } = useZone();
  const en = language === 'en';

  const [view, setView] = useState('available'); // 'available' | 'mine'
  const [operators, setOperators] = useState([]);
  const [myPickups, setMyPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Request modal
  const [selected, setSelected] = useState(null);
  const [wasteType, setWasteType] = useState('household');
  const [loadSize, setLoadSize] = useState('medium');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      if (view === 'available') {
        setOperators(await getAvailableOperators(zone));
      } else {
        setMyPickups(await getMyPickups());
      }
    } catch (err) {
      console.error('Operators load error:', err);
    } finally {
      setLoading(false);
    }
  }, [view, zone]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openRequest = (op) => {
    setSelected(op);
    setWasteType('household');
    setLoadSize('medium');
    setNote('');
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await createPickup({
        operator: selected._id,
        wasteType,
        loadSize,
        note: note.trim(),
        location: { zone, address: '' },
      });
      setSelected(null);
      Alert.alert(
        en ? 'Request sent' : 'Demande envoyée',
        en ? 'The operator has been notified. Track it under “My requests”.'
           : "L'opérateur a été notifié. Suivez-la dans « Mes demandes »."
      );
      setView('mine');
    } catch (err) {
      Alert.alert(
        en ? 'Could not send request' : 'Envoi impossible',
        err.response?.data?.message || (en ? 'Please try again.' : 'Veuillez réessayer.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = (pickup) => {
    Alert.alert(
      en ? 'Cancel request?' : 'Annuler la demande?',
      en ? 'This cannot be undone.' : 'Cette action est irréversible.',
      [
        { text: en ? 'Keep' : 'Garder', style: 'cancel' },
        {
          text: en ? 'Cancel it' : 'Annuler',
          style: 'destructive',
          onPress: async () => {
            try { await cancelPickup(pickup._id); await load(); }
            catch (err) {
              Alert.alert(en ? 'Could not cancel' : 'Annulation impossible',
                err.response?.data?.message || '');
            }
          },
        },
      ]
    );
  };

  const fee = selected ? estimateFee(selected, wasteType, loadSize) : 0;

  return (
    <View style={styles.container}>
      <TealHeader title={en ? 'On-Demand Pickup' : 'Ramassage à la Demande'} />

      {/* Toggle */}
      <View style={styles.toggleRow}>
        {[
          { key: 'available', label: en ? 'Operators' : 'Opérateurs' },
          { key: 'mine', label: en ? 'My requests' : 'Mes demandes' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.toggleBtn, view === t.key && styles.toggleBtnActive]}
            onPress={() => setView(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, view === t.key && styles.toggleTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}

        {/* Available operators */}
        {!loading && view === 'available' && operators.length === 0 && (
          <Text style={styles.empty}>
            {en ? `No operators serve ${zone} yet. Pull to refresh.` : `Aucun opérateur ne dessert ${zone}. Tirez pour actualiser.`}
          </Text>
        )}
        {!loading && view === 'available' && operators.map((op) => (
          <View key={op._id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizName}>{op.businessName}</Text>
                <Text style={styles.sub}>
                  {op.reviewCount ? `★ ${op.rating?.toFixed(1)} (${op.reviewCount})` : (en ? 'New operator' : 'Nouvel opérateur')}
                  {'  ·  '}{op.pickupsCompleted || 0} {en ? 'pickups' : 'ramassages'}
                </Text>
              </View>
              <View style={styles.feePill}>
                <Text style={styles.feePillText}>{en ? 'from' : 'dès'} {fcfa(op.baseFee)}</Text>
              </View>
            </View>
            {!!op.description && <Text style={styles.desc}>{op.description}</Text>}
            <View style={styles.tagRow}>
              {(op.zonesServed || []).map((z) => (
                <Text key={z} style={styles.tag}>{z}</Text>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => openRequest(op)} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{en ? 'Request Pickup' : 'Demander un Ramassage'}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* My requests */}
        {!loading && view === 'mine' && myPickups.length === 0 && (
          <Text style={styles.empty}>
            {en ? 'No pickup requests yet.' : 'Aucune demande de ramassage.'}
          </Text>
        )}
        {!loading && view === 'mine' && myPickups.map((p) => {
          const st = STATUS_STYLE[p.status] || STATUS_STYLE.requested;
          const canCancel = ['requested', 'accepted', 'en_route'].includes(p.status);
          return (
            <View key={p._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bizName}>{p.operator?.businessName || (en ? 'Operator' : 'Opérateur')}</Text>
                  <Text style={styles.sub}>
                    {WASTE_TYPES.find((w) => w.key === p.wasteType)?.[en ? 'en' : 'fr'] || p.wasteType}
                    {'  ·  '}{fcfa(p.fee)}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.color }]}>{en ? st.en : st.fr}</Text>
                </View>
              </View>
              {!!p.collector?.name && (
                <Text style={styles.desc}>{en ? 'Collector: ' : 'Collecteur : '}{p.collector.name}</Text>
              )}
              {canCancel && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(p)} activeOpacity={0.85}>
                  <Text style={styles.cancelBtnText}>{en ? 'Cancel' : 'Annuler'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Request modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{selected?.businessName}</Text>
            <Text style={styles.sheetSub}>{en ? 'What are we picking up?' : 'Que ramassons-nous?'}</Text>

            <Text style={styles.fieldLabel}>{en ? 'Waste type' : 'Type de déchet'}</Text>
            <View style={styles.chipWrap}>
              {WASTE_TYPES.map((w) => (
                <TouchableOpacity
                  key={w.key}
                  style={[styles.chip, wasteType === w.key && styles.chipActive]}
                  onPress={() => setWasteType(w.key)}
                >
                  <Text style={[styles.chipText, wasteType === w.key && styles.chipTextActive]}>{en ? w.en : w.fr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{en ? 'Load size' : 'Quantité'}</Text>
            <View style={styles.chipWrap}>
              {LOAD_SIZES.map((l) => (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.chip, loadSize === l.key && styles.chipActive]}
                  onPress={() => setLoadSize(l.key)}
                >
                  <Text style={[styles.chipText, loadSize === l.key && styles.chipTextActive]}>{en ? l.en : l.fr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{en ? 'Note (optional)' : 'Note (facultatif)'}</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder={en ? 'Gate colour, landmark…' : 'Couleur du portail, repère…'}
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{en ? 'Estimated fee' : 'Frais estimés'}</Text>
              <Text style={styles.feeValue}>{fcfa(fee)}</Text>
            </View>
            <Text style={styles.feeHint}>
              {en ? 'Cash on pickup. Final fee confirmed by the collector.' : 'Paiement à la collecte. Frais confirmés par le collecteur.'}
            </Text>

            <TouchableOpacity style={[styles.primaryBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting} activeOpacity={0.85}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{en ? 'Confirm Request' : 'Confirmer la Demande'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setSelected(null)}>
              <Text style={styles.ghostBtnText}>{en ? 'Cancel' : 'Annuler'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  toggleRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  toggleTextActive: { color: '#fff' },

  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 50, fontSize: 14, lineHeight: 20 },

  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 14, ...shadows.soft },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bizName: { fontSize: 16, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 10, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },

  feePill: { backgroundColor: colors.accentLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  feePillText: { fontSize: 11, fontWeight: '700', color: colors.accentDark },

  primaryBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancelBtn: { borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fef2f2', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  cancelBtnText: { color: colors.critical, fontSize: 13, fontWeight: '700' },

  statusPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginTop: 14, marginBottom: 8, textTransform: 'uppercase' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.background },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text, backgroundColor: colors.background },

  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  feeLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  feeValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  feeHint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  ghostBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 6 },
  ghostBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});
