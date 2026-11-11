import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import api from '../api/axios';
import {
  ArrowLeftIcon, MapPinIcon, ChevronDownIcon, TruckIcon, BellIcon, CheckIcon,
  RecycleIcon, InfoIcon, ChevronRightIcon, ArrowRightIcon, CheckBadgeIcon,
} from '../components/Icons';

const BLUE = '#2563eb';
const DAY_MAP = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
const ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

let Notifications = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }) });
} catch { /* not in Expo Go */ }

function getNextDateForDay(dayName, time) {
  const now = new Date();
  const targetDay = DAY_MAP[dayName];
  if (targetDay === undefined) return null;
  let daysAhead = targetDay - now.getDay();
  if (daysAhead < 0) daysAhead += 7;
  const d = new Date(now);
  d.setDate(now.getDate() + daysAhead);
  const m = time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (m) {
    let h = parseInt(m[1]); const mi = parseInt(m[2]); const p = m[3].toUpperCase();
    if (p === 'PM' && h !== 12) h += 12; if (p === 'AM' && h === 12) h = 0;
    d.setHours(h, mi, 0, 0);
  }
  return d;
}
async function requestPermissions() {
  if (!Notifications) return false;
  try { const { status: e } = await Notifications.getPermissionsAsync(); if (e === 'granted') return true; const { status } = await Notifications.requestPermissionsAsync(); return status === 'granted'; }
  catch { return false; }
}
async function scheduleReminder(item, zone) {
  const cd = getNextDateForDay(item.day, item.time);
  if (!cd) return null;
  const rd = new Date(cd); rd.setDate(rd.getDate() - 1); rd.setHours(19, 0, 0, 0);
  if (rd <= new Date()) return 'saved';
  if (Notifications) {
    try {
      const types = (item.wasteTypes || []).join(' + ');
      const secs = Math.max(1, Math.floor((rd.getTime() - Date.now()) / 1000));
      return await Notifications.scheduleNotificationAsync({ content: { title: `Collection Tomorrow - ${zone}`, body: `${types} collection at ${item.time}. Place bins out by 6:30 AM.`, sound: true }, trigger: { seconds: secs } });
    } catch { /* fall through */ }
  }
  return 'saved';
}
async function cancelReminder(id) {
  if (id && id !== 'saved' && Notifications) { try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* gone */ } }
}

const defaultSchedule = [
  { _id: '1', day: 'Monday', time: '7:00 AM - 10:00 AM', wasteTypes: ['General'] },
  { _id: '2', day: 'Wednesday', time: '7:00 AM - 10:30 AM', wasteTypes: ['General'] },
  { _id: '3', day: 'Friday', time: '7:00 AM - 10:00 AM', wasteTypes: ['General'] },
  { _id: '4', day: 'Saturday', time: '8:00 AM - 12:00 PM', wasteTypes: ['Recyclable'] },
];

export default function ScheduleScreen({ navigation }) {
  const { zone, language, clearZone } = useZone();
  const en = language === 'en';
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [reminders, setReminders] = useState({});
  const [notifPrefs, setNotifPrefs] = useState({ eve: true, morning: true, recycle: true });

  const fetchSchedule = useCallback(async () => {
    try { const { data } = await api.get(`/schedule/${zone}`); setSchedule(data.length ? data : defaultSchedule); }
    catch { setSchedule(defaultSchedule); }
  }, [zone]);
  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  useEffect(() => {
    (async () => { try { const s = await AsyncStorage.getItem(`reminders_${zone}`); if (s) setReminders(JSON.parse(s)); } catch { /* none */ } })();
  }, [zone]);

  const toggleReminder = async (item) => {
    const key = item._id || item.day;
    if (!reminders[key]) {
      let id = 'saved';
      if (Notifications) { if (await requestPermissions()) { const s = await scheduleReminder(item, zone); if (s) id = s; } }
      const up = { ...reminders, [key]: id }; setReminders(up);
      await AsyncStorage.setItem(`reminders_${zone}`, JSON.stringify(up));
    } else {
      await cancelReminder(reminders[key]);
      const up = { ...reminders }; delete up[key]; setReminders(up);
      await AsyncStorage.setItem(`reminders_${zone}`, JSON.stringify(up));
    }
  };

  const byDay = {};
  schedule.forEach((s) => { byDay[s.day] = s; });
  const todayIdx = new Date().getDay();
  const upcoming = [...schedule].sort((a, b) => getNextDateForDay(a.day, a.time) - getNextDateForDay(b.day, b.time));
  const nextItem = upcoming[0];
  const nextKey = nextItem && (nextItem._id || nextItem.day);
  const nextIdx = nextItem ? DAY_MAP[nextItem.day] : -1;
  const relLabel = (idx) => (idx === todayIdx ? (en ? 'Today' : "Aujourd'hui") : idx === (todayIdx + 1) % 7 ? (en ? 'Tomorrow' : 'Demain') : ORDER.find((d) => DAY_MAP[d] === idx));

  const types = (item) => (item.wasteTypes || ['General']).join(' + ');

  return (
    <View style={styles.screen}>
      {/* App bar */}
      <View style={styles.appBar}>
        <View style={styles.rowTight}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}><ArrowLeftIcon size={22} color={colors.text} /></TouchableOpacity>
          <Text style={styles.appBarTitle}>{en ? 'Schedule' : 'Calendrier'}</Text>
        </View>
        <TouchableOpacity style={styles.locPill} onPress={clearZone} activeOpacity={0.7}>
          <MapPinIcon size={14} color={BLUE} /><Text style={styles.locText}>{zone}</Text><ChevronDownIcon size={12} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Zone banner */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowTight}><View style={styles.sectorDot} /><Text style={styles.sectorText}>{en ? 'SANITATION SECTOR 4' : 'SECTEUR 4'}</Text></View>
            <View style={styles.enfrPill}><Text style={styles.enfrText}>EN / FR</Text></View>
          </View>
          <Text style={styles.sectorTitle}>{zone} {en ? 'Central Sector' : 'Secteur Central'}</Text>
          <Text style={styles.sectorSub}>{en ? 'Official HYSACAM truck routes & municipal roadside bins' : 'Routes HYSACAM & bacs municipaux'}</Text>
        </View>

        {/* Hero: next collection */}
        {nextItem && (
          <View style={styles.hero}>
            <View style={styles.heroBar} />
            <View style={{ flex: 1 }}>
              <View style={styles.rowBetween}>
                <View style={styles.routePill}><TruckIcon size={14} color="#0369a1" /><Text style={styles.routePillText}>{en ? 'HYSACAM Route' : 'Route HYSACAM'}</Text></View>
                <View style={styles.nextPill}><View style={styles.pulseDot} /><Text style={styles.nextPillText}>{en ? 'NEXT PICKUP' : 'PROCHAIN'}</Text></View>
              </View>
              <View style={[styles.rowTight, { marginTop: 10, alignItems: 'baseline' }]}>
                <Text style={styles.heroDay}>{relLabel(DAY_MAP[nextItem.day])}</Text>
                <Text style={styles.heroTime}>· {nextItem.time}</Text>
              </View>
              <Text style={styles.heroDesc}>{types(nextItem)} {en ? 'waste · Molyko sweep zone & roadside dumpsters' : '· zone de balayage Molyko'}</Text>
              <View style={styles.remindRow}>
                <View style={[styles.rowTight, { flex: 1 }]}>
                  <View style={styles.remindIcon}><BellIcon size={16} color="#b45309" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.remindTitle}>{en ? 'Remind me the evening before' : 'Me rappeler la veille'}</Text>
                    <Text style={styles.remindSub}>{en ? 'Alert via SMS + in-app chime' : 'Alerte SMS + son'}</Text>
                  </View>
                </View>
                <Switch value={!!reminders[nextKey]} onValueChange={() => toggleReminder(nextItem)} trackColor={{ false: colors.cardBorder, true: BLUE }} thumbColor="#fff" />
              </View>
              <View style={styles.tipRow}><InfoIcon size={15} color="#0369a1" /><Text style={styles.tipText}>{en ? 'HYSACAM trucks sound a horn on arrival. Wheel bins curbside by 6:30 AM.' : 'Les camions klaxonnent à l\'arrivée. Sortez les bacs avant 6h30.'}</Text></View>
            </View>
          </View>
        )}

        {/* Weekly timetable */}
        <Text style={styles.groupLabel}>{en ? 'WEEKLY TIMETABLE' : 'EMPLOI DU TEMPS'}</Text>
        <View style={styles.group}>
          {ORDER.map((day, i) => {
            const item = byDay[day];
            const idx = DAY_MAP[day];
            const isToday = idx === todayIdx;
            const isNext = item && nextKey === (item._id || item.day);
            const completed = item && idx < todayIdx;
            let badge = null, badgeStyle = null;
            if (isToday) { badge = en ? 'Today' : "Auj."; badgeStyle = styles.badgeToday; }
            else if (isNext) { badge = relLabel(idx); badgeStyle = styles.badgeNext; }
            else if (completed) { badge = en ? 'Done' : 'Fait'; badgeStyle = styles.badgeDone; }
            return (
              <View key={day} style={[styles.dayRow, i < ORDER.length - 1 && styles.dayRowBorder, !item && { opacity: 0.6 }]}>
                <View style={[styles.rowTight, { flex: 1 }]}>
                  <View style={[styles.dayIcon, isNext && { backgroundColor: BLUE }, isToday && { backgroundColor: '#e0f2fe' }]}>
                    {completed ? <CheckIcon size={15} color={colors.textSecondary} strokeWidth={2.5} />
                      : item ? <TruckIcon size={15} color={isNext ? '#fff' : isToday ? '#0369a1' : colors.textSecondary} />
                      : <RecycleIcon size={14} color={colors.textMuted} strokeWidth={2} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTight}>
                      <Text style={[styles.dayName, (isToday || isNext) && { fontWeight: '800' }]}>{en ? day : day}</Text>
                      {badge && <View style={badgeStyle}><Text style={styles.badgeText}>{badge}</Text></View>}
                    </View>
                    <Text style={styles.dayDesc} numberOfLines={1}>{item ? `${types(item)} · ${item.time}` : (en ? 'No municipal pickup · drop-off only' : 'Pas de collecte · dépôt uniquement')}</Text>
                  </View>
                </View>
                {item && <ChevronRightIcon size={16} color="#cbd5e1" />}
              </View>
            );
          })}
        </View>

        {/* Notification settings */}
        <Text style={styles.groupLabel}>{en ? 'SCHEDULE NOTIFICATIONS' : 'NOTIFICATIONS'}</Text>
        <View style={styles.group}>
          {[
            { k: 'eve', t: en ? 'Eve-of-collection reminder' : 'Rappel la veille', s: en ? 'At 8:00 PM the night before' : 'À 20h la veille' },
            { k: 'morning', t: en ? 'Morning horn alert' : 'Alerte du matin', s: en ? '1 hour before truck entry' : '1h avant le camion' },
            { k: 'recycle', t: en ? 'Recycling prep briefing' : 'Rappel recyclage', s: en ? 'Sorting reminders & EcoCredit values' : 'Tri & EcoCredits' },
          ].map((n, i, arr) => (
            <View key={n.k} style={[styles.dayRow, i < arr.length - 1 && styles.dayRowBorder]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.dayName}>{n.t}</Text>
                <Text style={styles.dayDesc}>{n.s}</Text>
              </View>
              <Switch value={notifPrefs[n.k]} onValueChange={(v) => setNotifPrefs((p) => ({ ...p, [n.k]: v }))} trackColor={{ false: colors.cardBorder, true: BLUE }} thumbColor="#fff" />
            </View>
          ))}
        </View>

        {/* On-demand cross-sell */}
        <View style={styles.crossCard}>
          <View style={styles.rowTight}>
            <View style={styles.crossIcon}><TruckIcon size={22} color={BLUE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.crossTitle}>{en ? 'Missed the truck or have bulky waste?' : 'Camion manqué ou déchets encombrants ?'}</Text>
              <Text style={styles.crossBody}>{en ? "Can't wait for HYSACAM? Request doorstep haulage from verified partners like Trash Vallet." : 'Demandez un ramassage à domicile par des partenaires vérifiés.'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.crossBtn} onPress={() => navigation.navigate('Pickup')} activeOpacity={0.9}>
            <Text style={styles.crossBtnText}>{en ? 'Request on-demand pickup' : 'Ramassage à la demande'}</Text>
            <View style={styles.rowTight}><Text style={styles.crossBtnPrice}>{en ? 'from 1,500 FCFA' : 'dès 1 500'}</Text><ArrowRightIcon size={14} color="#fff" /></View>
          </TouchableOpacity>
        </View>

        {/* Footnote */}
        <View style={styles.footer}>
          <View style={styles.rowTight}><CheckBadgeIcon size={14} color="#0369a1" /><Text style={styles.footerText}>{en ? 'Buea Council Sanitation Directorate & HYSACAM Buea' : 'Direction de l\'Assainissement de Buea & HYSACAM'}</Text></View>
          <Text style={styles.footerSub}>{en ? 'Keep Molyko clean and green' : 'Protégeons notre cité'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  rowTight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f9' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  appBarTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  locPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef2f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  locText: { fontSize: 13, fontWeight: '600', color: colors.text },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', padding: 14, marginBottom: 12 },
  sectorDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#0ea5e9' },
  sectorText: { fontSize: 11, fontWeight: '700', color: '#0369a1', letterSpacing: 0.5 },
  enfrPill: { backgroundColor: '#eef2f9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  enfrText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  sectorTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 8 },
  sectorSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  hero: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e4e9f2', padding: 14, paddingLeft: 10, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  heroBar: { width: 5, borderRadius: 3, backgroundColor: BLUE, marginRight: 12 },
  routePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e0f2fe', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  routePillText: { fontSize: 11, fontWeight: '700', color: '#0369a1' },
  nextPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE },
  nextPillText: { fontSize: 10, fontWeight: '800', color: BLUE, letterSpacing: 0.5 },
  heroDay: { fontSize: 22, fontWeight: '800', color: colors.text },
  heroTime: { fontSize: 18, fontWeight: '800', color: BLUE },
  heroDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  remindRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginTop: 12 },
  remindIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  remindTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  remindSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 },
  tipText: { fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 16 },

  groupLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', overflow: 'hidden', marginBottom: 20 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  dayRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dayIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eef2f9', alignItems: 'center', justifyContent: 'center' },
  dayName: { fontSize: 14, fontWeight: '600', color: colors.text },
  dayDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  badgeToday: { backgroundColor: '#e0f2fe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badgeNext: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badgeDone: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

  crossCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', padding: 14, marginBottom: 16 },
  crossIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  crossTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  crossBody: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  crossBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BLUE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12 },
  crossBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  crossBtnPrice: { color: '#dbeafe', fontSize: 12, fontWeight: '600' },

  footer: { alignItems: 'center', paddingBottom: 6 },
  footerText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  footerSub: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
});
