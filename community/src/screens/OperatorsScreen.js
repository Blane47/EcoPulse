import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import {
  StarIcon, StarOutlineIcon, RecycleIcon, MapPinIcon, ChevronDownIcon, TruckIcon,
  CheckBadgeIcon, BoltIcon, AdjustmentsIcon, InfoIcon, ClockIcon, ArrowRightIcon,
} from '../components/Icons';
import { CalendarIcon as CalIcon } from '../components/TabIcons';
import {
  getAvailableOperators, createPickup, getMyPickups, cancelPickup, estimateFee, ratePickup,
} from '../api/operators';

const BLUE = '#2563eb';
const BLUE_DARK = '#1d4ed8';
const AMBER_BG = '#fef3c7';
const AMBER_TX = '#b45309';

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
  requested: { color: AMBER_TX, bg: AMBER_BG, en: 'Requested', fr: 'Demandé' },
  accepted: { color: BLUE, bg: '#dbeafe', en: 'Accepted', fr: 'Accepté' },
  en_route: { color: BLUE, bg: '#dbeafe', en: 'On the way', fr: 'En route' },
  picked_up: { color: '#7c3aed', bg: '#ede9fe', en: 'Picked up', fr: 'Ramassé' },
  completed: { color: '#15803d', bg: '#dcfce7', en: 'Completed', fr: 'Terminé' },
  cancelled: { color: colors.textMuted, bg: '#f3f4f6', en: 'Cancelled', fr: 'Annulé' },
  declined: { color: colors.critical, bg: colors.criticalLight, en: 'Declined', fr: 'Refusé' },
};

const fcfa = (n) => `${Number(n || 0).toLocaleString()} FCFA`;

export default function OperatorsScreen({ navigation }) {
  const { zone, language, clearZone } = useZone();
  const en = language === 'en';

  const [view, setView] = useState('available'); // 'available' | 'mine'
  const [operators, setOperators] = useState([]);
  const [myPickups, setMyPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState(null);
  const [wasteType, setWasteType] = useState('household');
  const [loadSize, setLoadSize] = useState('medium');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(null);
  const [stars, setStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      if (view === 'available') setOperators(await getAvailableOperators(zone));
      else setMyPickups(await getMyPickups());
    } catch (err) {
      console.error('Operators load error:', err);
    } finally {
      setLoading(false);
    }
  }, [view, zone]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openRequest = (op) => { setSelected(op); setWasteType('household'); setLoadSize('medium'); setNote(''); };

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await createPickup({ operator: selected._id, wasteType, loadSize, note: note.trim(), location: { zone, address: '' } });
      setSelected(null);
      Alert.alert(
        en ? 'Request sent' : 'Demande envoyée',
        en ? 'The operator has been notified. Track it under “My requests”.' : "L'opérateur a été notifié. Suivez-la dans « Mes demandes »."
      );
      setView('mine');
    } catch (err) {
      Alert.alert(en ? 'Could not send request' : 'Envoi impossible', err.response?.data?.message || (en ? 'Please try again.' : 'Veuillez réessayer.'));
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
          text: en ? 'Cancel it' : 'Annuler', style: 'destructive',
          onPress: async () => {
            try { await cancelPickup(pickup._id); await load(); }
            catch (err) { Alert.alert(en ? 'Could not cancel' : 'Annulation impossible', err.response?.data?.message || ''); }
          },
        },
      ]
    );
  };

  const openRating = (pickup) => { setRating(pickup); setStars(5); setRatingComment(''); };

  const submitRating = async () => {
    if (!rating) return;
    setRatingSubmitting(true);
    try {
      await ratePickup(rating._id, { stars, comment: ratingComment.trim() });
      setRating(null);
      await load();
    } catch (err) {
      Alert.alert(en ? 'Could not submit rating' : 'Évaluation impossible', err.response?.data?.message || (en ? 'Please try again.' : 'Veuillez réessayer.'));
    } finally {
      setRatingSubmitting(false);
    }
  };

  const fee = selected ? estimateFee(selected, wasteType, loadSize) : 0;

  return (
    <View style={styles.container}>
      {/* White app bar */}
      <View style={styles.appBar}>
        <View style={styles.brandRow}>
          <RecycleIcon size={22} color={BLUE} strokeWidth={3} />
          <Text style={styles.wordmark}>ECOPULSE</Text>
        </View>
        <TouchableOpacity style={styles.locPill} onPress={clearZone} activeOpacity={0.7}>
          <MapPinIcon size={14} color={BLUE} />
          <Text style={styles.locText}>{zone}</Text>
          <ChevronDownIcon size={12} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <View style={styles.pageHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{en ? 'On-demand pickup' : 'Ramassage à la demande'}</Text>
            <Text style={styles.pageSub}>{en ? `Private services near you · ${zone}` : `Services privés près de vous · ${zone}`}</Text>
          </View>
          <TouchableOpacity style={styles.tuneBtn} onPress={onRefresh} activeOpacity={0.7}>
            <AdjustmentsIcon size={18} color={BLUE} />
          </TouchableOpacity>
        </View>

        {/* Segmented control */}
        <View style={styles.segment}>
          <TouchableOpacity style={[styles.segBtn, view === 'available' && styles.segActive]} onPress={() => setView('available')} activeOpacity={0.8}>
            <BoltIcon size={15} color={view === 'available' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.segText, view === 'available' && styles.segTextActive]}>{en ? 'On-demand' : 'À la demande'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segBtn, view === 'mine' && styles.segActive]} onPress={() => setView('mine')} activeOpacity={0.8}>
            <CalIcon size={15} color={view === 'mine' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.segText, view === 'mine' && styles.segTextActive]}>{en ? 'My requests' : 'Mes demandes'}</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />}

        {/* AVAILABLE */}
        {!loading && view === 'available' && (
          <>
            {/* Zone status banner */}
            <View style={styles.zoneBanner}>
              <View style={styles.zoneBannerIcon}><BoltIcon size={15} color="#0284c7" /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowStart}>
                  <Text style={styles.zoneBannerTitle}>{en ? 'Active Zone Status' : 'Statut de la zone'}</Text>
                  <View style={styles.capacityPill}>
                    <Text style={styles.capacityText}>{operators.length > 0 ? (en ? 'High capacity' : 'Capacité élevée') : (en ? 'Low capacity' : 'Faible capacité')}</Text>
                  </View>
                </View>
                <Text style={styles.zoneBannerBody}>
                  {operators.length} {en ? `registered private haulers active in ${zone} today.` : `transporteurs privés actifs à ${zone} aujourd'hui.`}
                </Text>
              </View>
            </View>

            {operators.length === 0 && (
              <Text style={styles.empty}>{en ? `No operators serve ${zone} yet. Pull to refresh.` : `Aucun opérateur ne dessert ${zone}. Tirez pour actualiser.`}</Text>
            )}

            {operators.map((op) => {
              const available = op.acceptingRequests !== false;
              return (
                <View key={op._id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.rowStart, { flex: 1 }]}>
                      <View style={styles.opIcon}><TruckIcon size={24} color={BLUE} /></View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.rowStartTight}>
                          <Text style={styles.bizName}>{op.businessName}</Text>
                          <CheckBadgeIcon size={16} color={BLUE} />
                        </View>
                        <Text style={styles.desc} numberOfLines={1}>{op.description || (en ? 'On-demand pickup service' : 'Service de ramassage à la demande')}</Text>
                      </View>
                    </View>
                    <View style={styles.feePill}><Text style={styles.feePillText}>{fcfa(op.baseFee)}</Text></View>
                  </View>

                  {/* Rating + availability */}
                  <View style={styles.metaDivider}>
                    <View style={styles.rowStartTight}>
                      <StarIcon size={15} color="#f59e0b" />
                      <Text style={styles.ratingNum}>{op.reviewCount ? op.rating?.toFixed(1) : '—'}</Text>
                      <Text style={styles.ratingCount}>{op.reviewCount ? `(${op.reviewCount} ${en ? 'reviews' : 'avis'})` : (en ? 'New operator' : 'Nouvel opérateur')}</Text>
                    </View>
                    <View style={[styles.availPill, available ? styles.availOn : styles.availOff]}>
                      <View style={[styles.availDot, { backgroundColor: available ? '#10b981' : '#94a3b8' }]} />
                      <Text style={[styles.availText, { color: available ? '#047857' : '#475569' }]}>{available ? (en ? 'Available now' : 'Disponible') : (en ? 'Busy' : 'Occupé')}</Text>
                    </View>
                  </View>

                  {/* Meta info strip */}
                  <View style={styles.metaStrip}>
                    <View style={styles.rowStartTight}>
                      <TruckIcon size={14} color={colors.textMuted} />
                      <Text style={styles.metaText}>{(op.vehicles || op.fleetSize || 0)} {en ? 'vehicles' : 'véhicules'}</Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <View style={styles.rowStartTight}>
                      <ClockIcon size={13} color={colors.textMuted} />
                      <Text style={styles.metaText}>{op.pickupsCompleted || 0} {en ? 'pickups done' : 'ramassages'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.requestBtn, !available && styles.requestBtnOff]}
                    onPress={() => available && openRequest(op)}
                    disabled={!available}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.requestBtnText, !available && { color: '#94a3b8' }]}>
                      {available ? (en ? 'Request pickup' : 'Demander') : (en ? 'Currently at capacity' : 'Actuellement complet')}
                    </Text>
                    {available && <ArrowRightIcon size={15} color="#fff" />}
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Info footer */}
            {operators.length > 0 && (
              <View style={styles.infoCard}>
                <View style={styles.infoIcon}><InfoIcon size={18} color={BLUE} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>{en ? 'Did you know?' : 'Le saviez-vous ?'}</Text>
                  <Text style={styles.infoBody}>
                    {en ? 'All contracted operators deliver to the authorized Mile 4 sorting centre. Keep recyclables segregated to earn EcoCredits.'
                       : 'Tous les opérateurs livrent au centre de tri agréé de Mile 4. Triez vos recyclables pour gagner des EcoCredits.'}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* MY REQUESTS */}
        {!loading && view === 'mine' && (
          <>
            {myPickups.length === 0 && (
              <Text style={styles.empty}>{en ? 'No pickup requests yet.' : 'Aucune demande de ramassage.'}</Text>
            )}
            {myPickups.map((p) => {
              const st = STATUS_STYLE[p.status] || STATUS_STYLE.requested;
              const canCancel = ['requested', 'accepted', 'en_route'].includes(p.status);
              return (
                <View key={p._id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.rowStart, { flex: 1 }]}>
                      <View style={styles.opIcon}><TruckIcon size={22} color={BLUE} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bizName}>{p.operator?.businessName || (en ? 'Operator' : 'Opérateur')}</Text>
                        <Text style={styles.desc}>
                          {WASTE_TYPES.find((w) => w.key === p.wasteType)?.[en ? 'en' : 'fr'] || p.wasteType}{'  ·  '}{fcfa(p.fee)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{en ? st.en : st.fr}</Text>
                    </View>
                  </View>
                  {!!p.collector?.name && <Text style={[styles.desc, { marginTop: 10 }]}>{en ? 'Collector: ' : 'Collecteur : '}{p.collector.name}</Text>}
                  {canCancel && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(p)} activeOpacity={0.85}>
                      <Text style={styles.cancelBtnText}>{en ? 'Cancel request' : 'Annuler'}</Text>
                    </TouchableOpacity>
                  )}
                  {p.status === 'completed' && (
                    p.rating?.stars ? (
                      <View style={[styles.rowStartTight, { marginTop: 12 }]}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          n <= p.rating.stars ? <StarIcon key={n} size={16} color="#f59e0b" /> : <StarOutlineIcon key={n} size={16} color={colors.textMuted} />
                        ))}
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>{en ? 'Your rating' : 'Votre note'}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.rateBtn} onPress={() => openRating(p)} activeOpacity={0.85}>
                        <StarIcon size={16} color="#fff" />
                        <Text style={styles.rateBtnText}>{en ? 'Rate this pickup' : 'Évaluer'}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              );
            })}
          </>
        )}
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
                <TouchableOpacity key={w.key} style={[styles.chip, wasteType === w.key && styles.chipActive]} onPress={() => setWasteType(w.key)}>
                  <Text style={[styles.chipText, wasteType === w.key && styles.chipTextActive]}>{en ? w.en : w.fr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{en ? 'Load size' : 'Quantité'}</Text>
            <View style={styles.chipWrap}>
              {LOAD_SIZES.map((l) => (
                <TouchableOpacity key={l.key} style={[styles.chip, loadSize === l.key && styles.chipActive]} onPress={() => setLoadSize(l.key)}>
                  <Text style={[styles.chipText, loadSize === l.key && styles.chipTextActive]}>{en ? l.en : l.fr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{en ? 'Note (optional)' : 'Note (facultatif)'}</Text>
            <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder={en ? 'Gate colour, landmark…' : 'Couleur du portail, repère…'} placeholderTextColor={colors.textMuted} />

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{en ? 'Estimated fee' : 'Frais estimés'}</Text>
              <Text style={styles.feeValue}>{fcfa(fee)}</Text>
            </View>
            <Text style={styles.feeHint}>{en ? 'Cash on pickup. Final fee confirmed by the collector.' : 'Paiement à la collecte. Frais confirmés par le collecteur.'}</Text>

            <TouchableOpacity style={[styles.requestBtn, { marginTop: 18 }, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting} activeOpacity={0.9}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.requestBtnText}>{en ? 'Confirm Request' : 'Confirmer'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setSelected(null)}><Text style={styles.ghostBtnText}>{en ? 'Cancel' : 'Annuler'}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rating modal */}
      <Modal visible={!!rating} transparent animationType="slide" onRequestClose={() => setRating(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{rating?.operator?.businessName || (en ? 'Rate pickup' : 'Évaluer')}</Text>
            <Text style={styles.sheetSub}>{en ? 'How was your pickup?' : 'Comment était votre ramassage?'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 18 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setStars(n)} activeOpacity={0.7}>
                  {n <= stars ? <StarIcon size={36} color="#f59e0b" /> : <StarOutlineIcon size={36} color={colors.textMuted} />}
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]} value={ratingComment} onChangeText={setRatingComment} placeholder={en ? 'Add a comment (optional)' : 'Ajouter un commentaire (facultatif)'} placeholderTextColor={colors.textMuted} multiline />
            <TouchableOpacity style={[styles.requestBtn, { marginTop: 14 }, ratingSubmitting && { opacity: 0.6 }]} onPress={submitRating} disabled={ratingSubmitting} activeOpacity={0.9}>
              {ratingSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.requestBtnText}>{en ? 'Submit Rating' : "Envoyer l'évaluation"}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setRating(null)}><Text style={styles.ghostBtnText}>{en ? 'Cancel' : 'Annuler'}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  rowStart: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowStartTight: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f9' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordmark: { fontSize: 19, fontWeight: '800', color: BLUE, letterSpacing: 1.5 },
  locPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef2f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  locText: { fontSize: 13, fontWeight: '600', color: colors.text },

  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0b1f3a', letterSpacing: -0.3 },
  pageSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  tuneBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },

  segment: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 14 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
  segActive: { backgroundColor: BLUE },
  segText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  segTextActive: { color: '#fff' },

  zoneBanner: { flexDirection: 'row', gap: 10, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 14, padding: 12, marginBottom: 14 },
  zoneBannerIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  zoneBannerTitle: { fontSize: 12, fontWeight: '800', color: '#0c4a6e' },
  capacityPill: { backgroundColor: '#d1fae5', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  capacityText: { fontSize: 10, fontWeight: '700', color: '#065f46' },
  zoneBannerBody: { fontSize: 11, color: '#0369a1', marginTop: 3, lineHeight: 15 },

  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontSize: 14, lineHeight: 20 },

  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#eef2f9', padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  opIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  bizName: { fontSize: 16, fontWeight: '800', color: '#0b1f3a' },
  desc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  feePill: { backgroundColor: AMBER_BG, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  feePillText: { fontSize: 12, fontWeight: '800', color: AMBER_TX },

  metaDivider: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f9' },
  ratingNum: { fontSize: 13, fontWeight: '800', color: colors.text },
  ratingCount: { fontSize: 12, color: colors.textMuted },
  availPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  availOn: { backgroundColor: '#ecfdf5' },
  availOff: { backgroundColor: '#f1f5f9' },
  availDot: { width: 7, height: 7, borderRadius: 4 },
  availText: { fontSize: 11, fontWeight: '700' },

  metaStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10 },
  metaText: { fontSize: 11, color: colors.textSecondary },
  metaDot: { color: '#cbd5e1' },

  requestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BLUE, borderRadius: 12, paddingVertical: 12, marginTop: 14 },
  requestBtnOff: { backgroundColor: '#f1f5f9' },
  requestBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  infoCard: { flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe', borderRadius: 16, padding: 14, marginTop: 4, marginBottom: 8 },
  infoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontSize: 12, fontWeight: '800', color: '#0b1f3a', marginBottom: 2 },
  infoBody: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },

  statusPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cancelBtn: { borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fef2f2', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  cancelBtnText: { color: colors.critical, fontSize: 13, fontWeight: '700' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BLUE, borderRadius: 12, paddingVertical: 11, marginTop: 12 },
  rateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginTop: 14, marginBottom: 8, textTransform: 'uppercase' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.background },
  chipActive: { backgroundColor: BLUE, borderColor: BLUE },
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
