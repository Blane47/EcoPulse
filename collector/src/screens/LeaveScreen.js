import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { colors, gradients, shadows } from '../theme';
import { CheckIcon, ClockIcon } from '../components/Icons';
import DateRangePicker from '../components/DateRangePicker';
import api from '../api/axios';
import {
  REASON_MIN, REASON_MAX, localToday, addDays, daysInclusive, formatDay, formatRange, formatRangeShort,
  dayCount, blocksDays, canCancel, currentLeave, nextLeave,
} from '../utils/leave';

const STATUS_STYLE = {
  pending: { bg: colors.amberLight, fg: '#b45309', en: 'Pending', fr: 'En attente' },
  approved: { bg: colors.accentLight, fg: colors.accentDark, en: 'Approved', fr: 'Approuvé' },
  declined: { bg: colors.criticalLight, fg: '#b91c1c', en: 'Declined', fr: 'Refusé' },
  cancelled: { bg: '#f3f4f6', fg: colors.textSecondary, en: 'Cancelled', fr: 'Annulé' },
};

// Ready-made reasons; tapping one fills the reason box
const QUICK_REASONS = [
  { en: 'Sick', fr: 'Maladie' },
  { en: 'Family reasons', fr: 'Raisons familiales' },
  { en: 'Personal reasons', fr: 'Raisons personnelles' },
  { en: 'Holiday', fr: 'Vacances' },
];
const QUICK_LABELS = {
  'Family reasons': { en: 'Family', fr: 'Famille' },
  'Personal reasons': { en: 'Personal', fr: 'Personnel' },
};

// Alert.alert has no buttons on the web preview, so the browser's confirm stands in there
function confirmAction({ title, message, confirm, keep, onConfirm }) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: keep, style: 'cancel' },
    { text: confirm, style: 'destructive', onPress: onConfirm },
  ]);
}

// Collectors ask for time off here and follow their requests; an admin answers on the dashboard.
export default function LeaveScreen() {
  const { user, updateUser, language } = useAuth();
  const en = language === 'en';
  const { notifications } = useNotifications();

  const [leaves, setLeaves] = useState([]);
  const [today, setToday] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [refreshing, setRefreshing] = useState(false);

  const [range, setRange] = useState({ start: null, end: null });
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(null); // the request just sent, for the thank-you box
  const [cancelling, setCancelling] = useState(null);

  // Latest user without making load() change on every profile update
  const userRef = useRef(user);
  userRef.current = user;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/leave/mine');
      setLeaves(data.leaves || []);
      setToday(data.today);
      setState('ready');
    } catch {
      setState((s) => (s === 'ready' ? s : 'error'));
    }
    // Keep the Home banner right: the server puts collectors on leave and back
    try {
      const { data: me } = await api.get('/auth/me');
      const u = userRef.current;
      if (u && me?.status && me.status !== u.status) await updateUser({ ...u, status: me.status });
    } catch {
      // Offline: the status catches up next time
    }
  }, [updateUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // An admin's answer arrives as a notification: show it straight away
  const latestLeaveNote = notifications.find((n) => n.type?.startsWith('leave_'))?._id;
  const firstNote = useRef(true);
  useEffect(() => {
    if (firstNote.current) { firstNote.current = false; return; }
    if (latestLeaveNote) load();
  }, [latestLeaveNote, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const day = today || localToday();
  const booked = leaves.filter((l) => blocksDays(l, day));
  const pending = leaves.filter((l) => l.status === 'pending');
  const onLeaveNow = currentLeave(leaves, day);
  const upcoming = nextLeave(leaves, day);
  const inactive = user?.status === 'inactive';

  const trimmed = reason.trim();
  const datesOk = !!(range.start && range.end);
  const reasonOk = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;
  const canSend = datesOk && reasonOk && !sending && !inactive;

  const pickRange = (next) => {
    setRange(next);
    setFormError('');
    setSent(null);
  };

  const pickQuick = (q) => {
    const text = en ? q.en : q.fr;
    const quickTexts = QUICK_REASONS.flatMap((r) => [r.en, r.fr]);
    // Replace an empty box or another ready-made reason; otherwise add to what's written
    setReason((r) => (!r.trim() || quickTexts.includes(r.trim()) ? text : `${r.trim()} — ${text}`.slice(0, REASON_MAX)));
    setFormError('');
    setSent(null);
  };

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setFormError('');
    try {
      const { data } = await api.post('/leave', { startDate: range.start, endDate: range.end, reason: trimmed });
      setSent(data);
      setRange({ start: null, end: null });
      setReason('');
      await load();
    } catch (err) {
      const message = err.response?.data?.message;
      if (!err.response) {
        setFormError(en
          ? 'Could not reach the server. Check your internet connection and try again.'
          : 'Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez.');
      } else if (err.response.status === 409) {
        setFormError(en
          ? 'You already have a leave request covering some of these days. Choose other days, or cancel the other request first.'
          : 'Vous avez déjà une demande de congé pour certains de ces jours. Choisissez d’autres jours, ou annulez d’abord l’autre demande.');
        // The reload marks those days on the calendar; start the choice again around them
        setRange({ start: null, end: null });
        load();
      } else if (err.response.status === 403) {
        setFormError(en
          ? 'Your account is deactivated. Contact the admin.'
          : 'Votre compte est désactivé. Contactez l’admin.');
      } else {
        setFormError(en
          ? message || 'Could not send your request. Please try again.'
          : 'Impossible d’envoyer votre demande. Vérifiez les dates et le motif, puis réessayez.');
      }
    }
    setSending(false);
  };

  const cancel = (leave) => {
    const approved = leave.status === 'approved';
    confirmAction({
      title: approved
        ? (en ? 'Cancel this leave?' : 'Annuler ce congé ?')
        : (en ? 'Cancel this request?' : 'Annuler cette demande ?'),
      message: `${formatRange(leave.startDate, leave.endDate, en, day)}${approved
        ? (en ? '\nYou will be expected at work on these days.' : '\nVous devrez travailler ces jours-là.')
        : ''}`,
      keep: en ? 'Keep it' : 'Garder',
      confirm: approved ? (en ? 'Cancel leave' : 'Annuler le congé') : (en ? 'Cancel request' : 'Annuler la demande'),
      onConfirm: async () => {
        setCancelling(leave._id);
        try {
          const { data } = await api.patch(`/leave/${leave._id}/cancel`);
          setLeaves((prev) => prev.map((l) => (l._id === data._id ? data : l)));
          if (sent?._id === leave._id) setSent(null);
        } catch (err) {
          const msg = !err.response
            ? (en ? 'Could not reach the server. Check your internet connection.' : 'Impossible de joindre le serveur. Vérifiez votre connexion internet.')
            : err.response.data?.message?.startsWith('This leave has started')
              ? (en ? 'This leave has started. Ask the admin to end it.' : 'Ce congé a commencé. Demandez à l’admin d’y mettre fin.')
              : (en ? err.response.data?.message || 'Could not cancel. Please try again.' : 'Impossible d’annuler. Veuillez réessayer.');
          Alert.alert(en ? 'Not cancelled' : 'Non annulé', msg);
          load();
        }
        setCancelling(null);
      },
    });
  };

  // ---- Top card: where the collector stands ----
  const statusCard = () => {
    let tone = 'idle';
    let title;
    let sub;
    if (onLeaveNow) {
      tone = 'away';
      title = en ? `You're on leave until ${formatDay(onLeaveNow.endDate, en, day)}` : `Vous êtes en congé jusqu’au ${formatDay(onLeaveNow.endDate, en, day)}`;
      sub = en ? `Back at work on ${formatDay(addDays(onLeaveNow.endDate, 1), en, day)}.` : `Retour au travail le ${formatDay(addDays(onLeaveNow.endDate, 1), en, day)}.`;
    } else if (user?.status === 'on-leave') {
      tone = 'away';
      title = en ? 'You are on leave' : 'Vous êtes en congé';
      sub = en ? 'The admin put you on leave. Ask them when you are back on duty.' : 'L’admin vous a mis en congé. Demandez-lui quand reprendre le service.';
    } else if (upcoming) {
      tone = 'next';
      const n = daysInclusive(day, upcoming.startDate) - 1;
      title = en
        ? `Next leave: ${formatRangeShort(upcoming.startDate, upcoming.endDate, en, day)} (approved)`
        : `Prochain congé : ${formatRangeShort(upcoming.startDate, upcoming.endDate, en, day)} (approuvé)`;
      sub = startsIn(n, en);
    } else if (pending.length) {
      tone = 'wait';
      title = en
        ? `Waiting for the admin: ${pending.length} ${pending.length === 1 ? 'request' : 'requests'}`
        : `En attente de l’admin : ${pending.length} ${pending.length === 1 ? 'demande' : 'demandes'}`;
      sub = en ? 'You will get a notification when they answer.' : 'Vous recevrez une notification dès qu’il répondra.';
    } else {
      title = en ? 'No leave planned' : 'Aucun congé prévu';
      sub = en ? 'Choose your dates below to ask for time off.' : 'Choisissez vos dates ci-dessous pour demander un congé.';
    }
    // Pending requests are still worth a line when the card is about something else
    const extra = (onLeaveNow || user?.status === 'on-leave' || upcoming) && pending.length
      ? (en
        ? `Waiting for the admin: ${pending.length} ${pending.length === 1 ? 'request' : 'requests'}`
        : `En attente de l’admin : ${pending.length} ${pending.length === 1 ? 'demande' : 'demandes'}`)
      : null;
    const toneStyle = TONES[tone];

    return (
      <View style={[styles.statusCard, { backgroundColor: toneStyle.bg, borderColor: toneStyle.border }]}>
        <View style={[styles.statusIcon, { backgroundColor: toneStyle.iconBg }]}>
          {tone === 'next' ? <CheckIcon size={22} color={toneStyle.fg} strokeWidth={2.5} />
            : tone === 'away' ? <Text style={{ fontSize: 20 }}>🏖️</Text>
              : <ClockIcon size={22} color={toneStyle.fg} strokeWidth={2} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusTitle, { color: toneStyle.fg }]}>{title}</Text>
          <Text style={styles.statusSub}>{sub}</Text>
          {extra && <Text style={[styles.statusSub, { fontWeight: '700', marginTop: 6 }]}>{extra}</Text>}
        </View>
      </View>
    );
  };

  // ---- One past or current request ----
  const requestCard = (leave) => {
    const s = STATUS_STYLE[leave.status] || STATUS_STYLE.cancelled;
    const days = daysInclusive(leave.startDate, leave.endDate);
    let timing = null;
    if (leave.status === 'pending') {
      timing = en ? 'Waiting for the admin to answer.' : 'En attente de la réponse de l’admin.';
    } else if (leave.status === 'approved') {
      if (leave.startDate > day) timing = startsIn(daysInclusive(day, leave.startDate) - 1, en);
      else if (leave.endDate >= day) {
        timing = en
          ? `On leave now — back on ${formatDay(addDays(leave.endDate, 1), en, day)}`
          : `En congé maintenant — retour le ${formatDay(addDays(leave.endDate, 1), en, day)}`;
      } else timing = en ? 'Finished' : 'Terminé';
    } else if (leave.status === 'cancelled') {
      if (leave.cancelledBy === 'admin') {
        timing = leave.endedAt
          ? (en ? 'Ended early by the admin' : 'Écourté par l’admin')
          : (en ? 'Cancelled by the admin' : 'Annulé par l’admin');
      } else timing = en ? 'You cancelled this request' : 'Vous avez annulé cette demande';
    }
    const busy = cancelling === leave._id;
    const live = leave.status === 'approved' && leave.startDate <= day && leave.endDate >= day;

    return (
      <View key={leave._id} style={[styles.requestCard, leave.status === 'cancelled' && { opacity: 0.85 }]}>
        <View style={styles.requestTop}>
          <View style={[styles.pill, { backgroundColor: s.bg }]}>
            <Text style={[styles.pillText, { color: s.fg }]}>{en ? s.en : s.fr}</Text>
          </View>
          <Text style={styles.requestDays}>{dayCount(days, en)}</Text>
        </View>
        <Text style={styles.requestDates}>{formatRange(leave.startDate, leave.endDate, en, day)}</Text>
        {!!leave.reason && <Text style={styles.requestReason}>{leave.reason}</Text>}
        {!!leave.reviewNote && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              <Text style={{ fontWeight: '700' }}>{en ? 'Note from the admin: ' : 'Note de l’admin : '}</Text>
              {leave.reviewNote}
            </Text>
          </View>
        )}
        {!!leave.cancelNote && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              <Text style={{ fontWeight: '700' }}>{en ? 'Why the admin cancelled: ' : 'Motif de l’annulation : '}</Text>
              {leave.cancelNote}
            </Text>
          </View>
        )}
        {!!timing && <Text style={[styles.timing, live && { color: '#b45309' }, leave.status === 'approved' && !live && leave.startDate > day && { color: colors.accentDark }]}>{timing}</Text>}
        {canCancel(leave, day) && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(leave)} disabled={busy} activeOpacity={0.7}>
            {busy ? <ActivityIndicator color={colors.critical} /> : (
              <Text style={styles.cancelText}>
                {leave.status === 'approved' ? (en ? 'Cancel leave' : 'Annuler le congé') : (en ? 'Cancel request' : 'Annuler la demande')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (state === 'loading') {
    return (
      <LinearGradient colors={gradients.screenBg} style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </LinearGradient>
    );
  }

  if (state === 'error') {
    return (
      <LinearGradient colors={gradients.screenBg} style={[styles.container, styles.center]}>
        <View style={styles.loadError}>
          <Text style={styles.loadErrorTitle}>{en ? "Couldn't load your leave" : 'Impossible de charger vos congés'}</Text>
          <Text style={styles.loadErrorText}>{en ? 'Check your internet connection and try again.' : 'Vérifiez votre connexion internet et réessayez.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setState('loading'); load(); }}>
            <Text style={styles.retryText}>{en ? 'Try again' : 'Réessayer'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const missing = !datesOk
    ? (range.start
      ? (en ? 'Tap the last day of your leave.' : 'Touchez le dernier jour de votre congé.')
      : (en ? 'Choose your dates on the calendar.' : 'Choisissez vos dates sur le calendrier.'))
    : !reasonOk
      ? (trimmed.length > REASON_MAX
        ? (en ? `Keep the reason under ${REASON_MAX} characters.` : `Le motif doit faire moins de ${REASON_MAX} caractères.`)
        : (en ? 'Write a short reason, or tap one above.' : 'Écrivez un court motif, ou touchez-en un ci-dessus.'))
      : null;

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        >
          {statusCard()}

          {/* Ask for leave */}
          <Text style={styles.sectionTitle}>{en ? 'Request leave' : 'Demander un congé'}</Text>
          <View style={styles.card}>
            {inactive && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{en ? 'Your account is deactivated, so you can’t ask for leave. Contact the admin.' : 'Votre compte est désactivé : vous ne pouvez pas demander de congé. Contactez l’admin.'}</Text>
              </View>
            )}

            <Text style={styles.step}>{en ? '1. Choose your days' : '1. Choisissez vos jours'}</Text>
            <DateRangePicker
              today={day}
              start={range.start}
              end={range.end}
              onChange={pickRange}
              language={language}
              booked={booked}
            />

            {range.start && (
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  {range.end
                    ? `${formatRange(range.start, range.end, en, day)} · ${dayCount(daysInclusive(range.start, range.end), en)}`
                    : `${formatDay(range.start, en, day)} – …`}
                </Text>
              </View>
            )}

            <Text style={[styles.step, { marginTop: 18 }]}>{en ? '2. Why do you need leave?' : '2. Pourquoi demandez-vous ce congé ?'}</Text>
            <View style={styles.chips}>
              {QUICK_REASONS.map((q) => {
                const text = en ? q.en : q.fr;
                const active = trimmed === text;
                const label = QUICK_LABELS[q.en] ? QUICK_LABELS[q.en][en ? 'en' : 'fr'] : text;
                return (
                  <TouchableOpacity
                    key={q.en}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => pickQuick(q)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={(t) => { setReason(t); if (formError) setFormError(''); if (sent) setSent(null); }}
              placeholder={en ? 'For example: my child is sick' : 'Par exemple : mon enfant est malade'}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={REASON_MAX}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{reason.length}/{REASON_MAX}</Text>

            {formError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            {sent && (
              <View style={styles.successBox}>
                <CheckIcon size={20} color={colors.accentDark} strokeWidth={2.5} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.successTitle}>{en ? 'Request sent' : 'Demande envoyée'}</Text>
                  <Text style={[styles.successText, { fontWeight: '700' }]}>{formatRange(sent.startDate, sent.endDate, en, day)}</Text>
                  <Text style={styles.successText}>
                    {en
                      ? 'The admin will answer soon — you will get a notification.'
                      : 'L’admin va répondre bientôt — vous recevrez une notification.'}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity onPress={send} disabled={!canSend} activeOpacity={0.85} style={[styles.button, !canSend && styles.buttonOff]}>
              <LinearGradient
                colors={canSend ? gradients.greenButton : ['#d1d5db', '#cbd5e1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonFill}
              >
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{en ? 'Send request' : 'Envoyer la demande'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
            {missing && !inactive && <Text style={styles.missing}>{missing}</Text>}
          </View>

          {/* Requests so far */}
          <Text style={styles.sectionTitle}>{en ? 'My requests' : 'Mes demandes'}</Text>
          {leaves.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{en ? 'You have not asked for leave yet.' : 'Vous n’avez encore demandé aucun congé.'}</Text>
            </View>
          ) : leaves.map(requestCard)}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function startsIn(n, en) {
  if (n <= 0) return en ? 'Starts today' : 'Commence aujourd’hui';
  if (n === 1) return en ? 'Starts tomorrow' : 'Commence demain';
  return en ? `Starts in ${n} days` : `Commence dans ${n} jours`;
}

const TONES = {
  away: { bg: '#fef3c7', border: '#fbbf24', fg: '#92400e', iconBg: 'rgba(255,255,255,0.7)' },
  next: { bg: '#f0fdf4', border: '#86efac', fg: '#166534', iconBg: colors.accentLight },
  wait: { bg: '#fffbeb', border: '#fcd34d', fg: '#92400e', iconBg: colors.amberLight },
  idle: { bg: colors.card, border: colors.cardBorder, fg: colors.text, iconBg: '#f3f4f6' },
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  scroll: { padding: 16, paddingBottom: 60 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 22,
    ...shadows.soft,
  },
  statusIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  statusSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 19 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 10, marginLeft: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 12,
    paddingTop: 16,
    marginBottom: 24,
    ...shadows.card,
  },
  step: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, marginLeft: 4 },

  summary: {
    marginTop: 6,
    backgroundColor: colors.accentLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryText: { fontSize: 15, fontWeight: '700', color: '#166534' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { borderColor: colors.accentDark, backgroundColor: colors.accentLight },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#166534', fontWeight: '700' },
  reasonInput: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: colors.text,
  },
  counter: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 4 },

  errorBox: {
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.criticalLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: { fontSize: 14, color: '#b91c1c', lineHeight: 20 },
  successBox: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    padding: 12,
  },
  successTitle: { fontSize: 15, fontWeight: '800', color: '#166534' },
  successText: { fontSize: 13, color: '#166534', marginTop: 2, lineHeight: 19 },

  button: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  buttonOff: { opacity: 0.9 },
  buttonFill: { height: 54, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  missing: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },

  requestCard: {
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  requestTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 13, fontWeight: '800' },
  requestDays: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  requestDates: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 10 },
  requestReason: { fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  noteBox: { marginTop: 10, backgroundColor: '#f8fafc', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: colors.textMuted, padding: 10 },
  noteText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  timing: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 8 },
  cancelBtn: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.critical },

  emptyCard: { backgroundColor: colors.cardGlass, borderRadius: 16, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  loadError: {
    backgroundColor: colors.criticalLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 20,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  loadErrorTitle: { fontSize: 15, fontWeight: '700', color: '#991b1b' },
  loadErrorText: { fontSize: 13, color: '#b91c1c', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  retryBtn: { marginTop: 14, backgroundColor: colors.critical, borderRadius: 12, paddingHorizontal: 24, minHeight: 44, justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
