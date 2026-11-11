import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ScrollView, Switch } from 'react-native';
import {
  BellIcon, MapPinIcon, ClockIcon, ChevronDownIcon, ChevronRightIcon, ArrowRightIcon,
  WarningIcon, TruckIcon, RecycleIcon, CheckIcon, NavigationIcon,
} from '../components/Icons';
import { CalendarIcon, CollectionIcon } from '../components/TabIcons';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import api from '../api/axios';
import { getMyPickups } from '../api/operators';

const DAY_MAP = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

const BLUE = '#2563eb';
const BLUE_DARK = '#1d4ed8';
const AMBER = '#d97706';

function getNextCollectionDate(dayName, time) {
  const now = new Date();
  const targetDay = DAY_MAP[dayName];
  if (targetDay === undefined) return null;
  const currentDay = now.getDay();
  let daysAhead = targetDay - currentDay;
  const match = time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let hours = 7, mins = 0;
  if (match) {
    hours = parseInt(match[1]);
    mins = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  }
  if (daysAhead === 0) {
    const todayCollection = new Date(now);
    todayCollection.setHours(hours, mins, 0, 0);
    if (todayCollection <= now) daysAhead = 7;
  } else if (daysAhead < 0) {
    daysAhead += 7;
  }
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysAhead);
  nextDate.setHours(hours, mins, 0, 0);
  return nextDate;
}

function formatCollectionDay(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

const money = (n) => `${Number(n || 0).toLocaleString()} FCFA`;

// Map pickup status to the 4-node tracker.
const TRACK_STEPS = ['Requested', 'Accepted', 'En route', 'Done'];
function pickupStep(status) {
  if (status === 'accepted') return 1;
  if (status === 'en_route' || status === 'picked_up') return 2;
  if (status === 'completed') return 3;
  return 0; // requested
}
const ACTIVE_PICKUP = ['requested', 'accepted', 'en_route', 'picked_up'];

function PickupTracker({ current }) {
  return (
    <View style={styles.tracker}>
      {TRACK_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={styles.trackCol}>
            {i > 0 && <View style={[styles.trackLine, { left: '-50%', backgroundColor: i <= current ? BLUE : colors.cardBorder }]} />}
            <View
              style={[
                styles.trackNode,
                done && { backgroundColor: BLUE, borderColor: BLUE },
                active && { backgroundColor: '#fff', borderColor: BLUE },
                !done && !active && { backgroundColor: '#eef2f9', borderColor: '#eef2f9' },
              ]}
            >
              {done ? (
                <CheckIcon size={13} color="#fff" strokeWidth={3} />
              ) : (
                <View style={[styles.trackDot, { backgroundColor: active ? BLUE : '#c3cad6' }]} />
              )}
            </View>
            <Text style={[styles.trackLabel, (done || active) && { color: active ? BLUE : colors.text, fontWeight: '700' }]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { zone, clearZone, language, profile } = useZone();
  const en = language === 'en';
  const [refreshing, setRefreshing] = useState(false);
  const [nextCollection, setNextCollection] = useState(null);
  const [nextCollectionDate, setNextCollectionDate] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [reminderOn, setReminderOn] = useState(true);
  const [pickup, setPickup] = useState(null);     // active on-demand pickup
  const [report, setReport] = useState(null);     // latest reported bin
  const [bins, setBins] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/bins', { params: { zone } });
      setBins(data.bins || []);
    } catch { setBins([]); }

    try {
      const { data } = await api.get(`/schedule/${zone}`);
      if (data.length) {
        let soonest = null, soonestDate = null;
        for (const item of data) {
          const d = getNextCollectionDate(item.day, item.time);
          if (d && (!soonestDate || d < soonestDate)) { soonest = item; soonestDate = d; }
        }
        if (soonest) { setNextCollection(soonest); setNextCollectionDate(soonestDate); }
      }
    } catch { /* schedule optional */ }

    try {
      const list = await getMyPickups();
      const active = (Array.isArray(list) ? list : []).find((p) => ACTIVE_PICKUP.includes(p.status));
      setPickup(active || (Array.isArray(list) ? list[0] : null) || null);
    } catch { setPickup(null); }

    try {
      const { data } = await api.get('/reports/mine');
      const sorted = (data || []).slice().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      setReport(sorted[0] || null);
    } catch { setReport(null); }
  }, [zone]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const checkUpdates = async () => {
      try {
        const lastSeen = await AsyncStorage.getItem('lastNotifCheck');
        const lastTime = lastSeen ? new Date(lastSeen).getTime() : 0;
        let hasNew = false;
        try {
          const { data: announcements } = await api.get('/announcements', { params: { zone } });
          hasNew = announcements.some((a) => new Date(a.createdAt).getTime() > lastTime);
        } catch { /* best-effort */ }
        if (!hasNew && profile?.phone) {
          try {
            const { data: reports } = await api.get('/reports/mine');
            hasNew = reports.some((r) => r.status !== 'pending' && new Date(r.updatedAt).getTime() > lastTime);
          } catch { /* best-effort */ }
        }
        setHasUnread(hasNew);
      } catch { /* silent */ }
    };
    checkUpdates();
    const interval = setInterval(checkUpdates, 15000);
    return () => clearInterval(interval);
  }, [profile?.phone, zone]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const openNotifications = async () => {
    await require('@react-native-async-storage/async-storage').default.setItem('lastNotifCheck', new Date().toISOString());
    setHasUnread(false);
    navigation.navigate('Reports', { tab: 'Notifications' });
  };

  const activeCount = (pickup && ACTIVE_PICKUP.includes(pickup.status) ? 1 : 0) + (report ? 1 : 0);

  // Up to 3 bins for the nearby-bins preview, with fill level + color.
  const fillOf = (b) => (typeof b.fillLevel === 'number' ? b.fillLevel : b.status === 'critical' ? 92 : b.status === 'warning' ? 68 : 24);
  const colorOf = (f) => (f >= 85 ? colors.critical : f >= 60 ? colors.warning : '#10b981');
  const previewBins = bins.slice(0, 3).map((b) => ({ fill: fillOf(b), label: b.label || b.location || 'Bin' }));
  while (previewBins.length < 3) previewBins.push({ fill: [24, 68, 92][previewBins.length], label: 'Bin' });
  const pinPos = [{ top: 22, left: 48 }, { top: 74, right: 96 }, { top: 34, right: 28 }];

  return (
    <View style={styles.screen}>
      {/* Top App Bar */}
      <View style={styles.appBar}>
        <View style={styles.brandRow}>
          <RecycleIcon size={22} color={BLUE} strokeWidth={3} />
          <Text style={styles.wordmark}>ECOPULSE</Text>
        </View>
        <View style={styles.appBarRight}>
          <TouchableOpacity style={styles.locPill} onPress={clearZone} activeOpacity={0.7}>
            <MapPinIcon size={14} color={BLUE} />
            <Text style={styles.locText}>{zone}</Text>
            <ChevronDownIcon size={12} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellBtn} onPress={openNotifications} activeOpacity={0.7}>
            <BellIcon size={20} color={colors.text} />
            {hasUnread && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>{en ? 'Hello' : 'Bonjour'}{profile?.name ? `, ${profile.name}` : ''}</Text>
        <Text style={styles.greetingSub}>{en ? `Let's keep ${zone} clean today.` : `Gardons ${zone} propre aujourd'hui.`}</Text>

        {/* Primary action: Report a full bin */}
        <TouchableOpacity style={styles.reportCard} activeOpacity={0.9} onPress={() => navigation.navigate('ReportBin')}>
          <View style={styles.rowBetween}>
            <View style={styles.rowStart}>
              <View style={styles.reportIcon}><WarningIcon size={24} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportTitle}>{en ? 'Report a full bin' : 'Signaler un bac plein'}</Text>
                <Text style={styles.reportSub}>{en ? 'Flag an overflowing bin or illegal dump' : 'Signalez un bac débordant ou un dépôt sauvage'}</Text>
              </View>
            </View>
            <View style={styles.reportChevron}><ChevronRightIcon size={18} color="#fff" /></View>
          </View>
          <View style={styles.reportFooter}>
            <Text style={styles.reportFooterText}>{en ? 'Direct alert to Municipal Council & HYSACAM' : 'Alerte directe au Conseil Municipal & HYSACAM'}</Text>
            <View style={styles.rowStart}>
              <Text style={styles.reportNow}>{en ? 'Report Now' : 'Signaler'}</Text>
              <ArrowRightIcon size={13} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        {/* On-demand pickup */}
        <TouchableOpacity style={styles.pickupCard} activeOpacity={0.9} onPress={() => navigation.navigate('Pickup')}>
          <View style={styles.newBadge}><Text style={styles.newBadgeText}>{en ? 'NEW' : 'NOUVEAU'}</Text></View>
          <View style={[styles.rowBetween, { paddingRight: 40 }]}>
            <View style={styles.rowStart}>
              <View style={styles.pickupIcon}><TruckIcon size={24} color={BLUE} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{en ? 'Request on-demand pickup' : 'Demander un ramassage'}</Text>
                <Text style={styles.cardSub}>
                  {en ? 'Private service to your door · ' : 'Service privé à domicile · '}
                  <Text style={{ color: AMBER, fontWeight: '700' }}>{en ? 'from 1,500 FCFA' : 'dès 1 500 FCFA'}</Text>
                </Text>
              </View>
            </View>
            <View style={styles.greyChevron}><ChevronRightIcon size={18} color={colors.text} /></View>
          </View>
        </TouchableOpacity>

        {/* Your activity */}
        {activeCount > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.rowStart}>
                <Text style={styles.sectionTitle}>{en ? 'Your activity' : 'Votre activité'}</Text>
                <View style={styles.activePill}><Text style={styles.activePillText}>{activeCount} {en ? 'active' : 'actifs'}</Text></View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Reports')}><Text style={styles.link}>{en ? 'View all' : 'Voir tout'}</Text></TouchableOpacity>
            </View>

            <View style={styles.card}>
              {pickup && ACTIVE_PICKUP.includes(pickup.status) && (
                <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Pickup')}>
                  <View style={styles.rowBetween}>
                    <View style={styles.rowStart}>
                      <View style={styles.activityIcon}><TruckIcon size={20} color={BLUE} /></View>
                      <View>
                        <Text style={styles.activityTitle}>
                          {(pickup.operator?.businessName || pickup.operator?.name || 'Operator')} · {pickup.status === 'en_route' ? (en ? 'En route' : 'En route') : pickup.status === 'picked_up' ? (en ? 'Picked up' : 'Ramassé') : pickup.status === 'accepted' ? (en ? 'Accepted' : 'Accepté') : (en ? 'Requested' : 'Demandé')}
                        </Text>
                        <Text style={styles.activitySub}>#{(pickup._id || '').slice(-6).toUpperCase()} · {money(pickup.fee)}</Text>
                      </View>
                    </View>
                    <View style={styles.etaPill}><Text style={styles.etaText}>{en ? 'Live' : 'En direct'}</Text></View>
                  </View>
                  <PickupTracker current={pickupStep(pickup.status)} />
                </TouchableOpacity>
              )}

              {pickup && ACTIVE_PICKUP.includes(pickup.status) && report && <View style={styles.divider} />}

              {report && (
                <TouchableOpacity activeOpacity={0.8} style={styles.rowBetween} onPress={() => navigation.navigate('Reports')}>
                  <View style={styles.rowStart}>
                    <View style={[styles.activityIcon, { backgroundColor: '#eef2f9' }]}><CollectionIcon size={20} color={BLUE} /></View>
                    <View>
                      <Text style={styles.activityTitle}>{report.label || report.location || (en ? 'Reported bin' : 'Bac signalé')}</Text>
                      <Text style={styles.activitySub}>{en ? 'Reported' : 'Signalé'} · {new Date(report.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, report.status === 'resolved' ? styles.statusDone : report.status === 'pending' ? styles.statusPending : styles.statusProgress]}>
                    <Text style={styles.statusPillText}>
                      {report.status === 'resolved' ? (en ? 'Resolved' : 'Résolu') : report.status === 'pending' ? (en ? 'Pending' : 'En attente') : (en ? 'In progress' : 'En cours')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Next collection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{en ? 'Next collection' : 'Prochaine collecte'}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Collections')} style={[styles.card, styles.rowBetween, { marginTop: 10 }]}>
            <View style={[styles.rowStart, { flex: 1 }]}>
              <View style={styles.activityIcon}><CalendarIcon size={20} color={BLUE} /></View>
              <View style={{ flex: 1 }}>
                <View style={[styles.rowStart, { flexWrap: 'wrap' }]}>
                  <View style={styles.hysacamBadge}><Text style={styles.hysacamText}>HYSACAM</Text></View>
                  <Text style={styles.collectionTime}>
                    {nextCollectionDate ? `${formatCollectionDay(nextCollectionDate)} · ${nextCollection?.time || ''}` : (en ? 'Not scheduled' : 'Non programmée')}
                  </Text>
                </View>
                <Text style={styles.cardSub}>{en ? `${zone} municipal sweep zone & roadside bins` : `Zone de balayage municipal ${zone}`}</Text>
              </View>
            </View>
            <Switch
              value={reminderOn}
              onValueChange={setReminderOn}
              trackColor={{ false: colors.cardBorder, true: BLUE }}
              thumbColor="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* Nearby bins */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{en ? 'Nearby bins' : 'Bacs à proximité'}</Text>
            <TouchableOpacity style={styles.rowStart} onPress={() => navigation.navigate('Map')}>
              <Text style={styles.link}>{en ? 'View map' : 'Voir la carte'}</Text>
              <ArrowRightIcon size={13} color={BLUE} />
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { padding: 0, overflow: 'hidden', marginTop: 10 }]}>
            {/* Stylized mini map */}
            <View style={styles.mapCanvas}>
              <View style={styles.mapLabel}><Text style={styles.mapLabelText}>{zone} · {en ? 'public bins' : 'bacs publics'}</Text></View>
              {previewBins.map((b, i) => {
                const c = colorOf(b.fill);
                return (
                  <View key={i} style={[styles.pin, pinPos[i]]}>
                    <View style={styles.pinPill}>
                      <View style={[styles.pinDot, { backgroundColor: c }]} />
                      <Text style={[styles.pinText, { color: b.fill >= 85 ? colors.critical : colors.text }]}>{b.fill}% {en ? 'Full' : 'Plein'}</Text>
                    </View>
                    <CollectionIcon size={16} color={c} />
                  </View>
                );
              })}
              <View style={styles.gpsDot}><View style={styles.gpsInner} /></View>
            </View>
            {/* Helper strip */}
            <View style={styles.mapStrip}>
              <View style={styles.rowStart}>
                <NavigationIcon size={15} color={BLUE} />
                <Text style={styles.mapStripText}>{bins.length} {en ? 'public bins nearby' : 'bacs publics à proximité'}</Text>
              </View>
              <TouchableOpacity style={styles.locateBtn} onPress={() => navigation.navigate('Map')}>
                <Text style={styles.locateText}>{en ? 'Locate Nearest' : 'Plus proche'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },

  // App bar
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 60, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eef2f9',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordmark: { fontSize: 19, fontWeight: '800', color: BLUE, letterSpacing: 1.5 },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eef2f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  locText: { fontSize: 13, fontWeight: '600', color: colors.text },
  bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef2f9', alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.critical, borderWidth: 1.5, borderColor: '#eef2f9' },

  greeting: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  greetingSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2, marginBottom: 18 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowStart: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Report card (primary blue)
  reportCard: { backgroundColor: BLUE, borderRadius: 16, padding: 16, marginBottom: 12 },
  reportIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  reportTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  reportSub: { fontSize: 12, color: '#dbe4ff', marginTop: 2 },
  reportChevron: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  reportFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  reportFooterText: { fontSize: 10, fontWeight: '600', color: '#dbe4ff', flex: 1 },
  reportNow: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Pickup card (white)
  pickupCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e4e9f2', marginBottom: 20 },
  pickupIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  newBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#fde68a' },
  newBadgeText: { fontSize: 10, fontWeight: '800', color: AMBER, letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  greyChevron: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eef2f9', alignItems: 'center', justifyContent: 'center' },

  // Sections
  section: { marginBottom: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  link: { fontSize: 13, fontWeight: '600', color: BLUE },
  activePill: { backgroundColor: '#dbeafe', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  activePillText: { fontSize: 11, fontWeight: '700', color: BLUE_DARK },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e4e9f2' },
  divider: { height: 1, backgroundColor: '#eef2f9', marginVertical: 14 },

  activityIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  activitySub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  etaPill: { backgroundColor: '#dbeafe', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  etaText: { fontSize: 11, fontWeight: '700', color: BLUE_DARK },

  // Tracker
  tracker: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  trackCol: { flex: 1, alignItems: 'center', position: 'relative' },
  trackLine: { position: 'absolute', top: 11, width: '100%', height: 2, zIndex: 0 },
  trackNode: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  trackDot: { width: 8, height: 8, borderRadius: 4 },
  trackLabel: { fontSize: 10, color: colors.textMuted, marginTop: 5 },

  statusPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusProgress: { backgroundColor: '#dbeafe' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusDone: { backgroundColor: '#dcfce7' },
  statusPillText: { fontSize: 11, fontWeight: '700', color: colors.text },

  // Next collection
  hysacamBadge: { backgroundColor: '#eef2f9', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#e4e9f2' },
  hysacamText: { fontSize: 10, fontWeight: '800', color: colors.textSecondary },
  collectionTime: { fontSize: 14, fontWeight: '700', color: colors.text },

  // Map
  mapCanvas: { height: 168, backgroundColor: '#e7edf6', position: 'relative' },
  mapLabel: { position: 'absolute', top: 8, left: 10, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#e4e9f2' },
  mapLabelText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  pin: { position: 'absolute', alignItems: 'center' },
  pinPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#e4e9f2', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  pinDot: { width: 7, height: 7, borderRadius: 4 },
  pinText: { fontSize: 11, fontWeight: '700' },
  gpsDot: { position: 'absolute', bottom: 28, left: 120, width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(37,99,235,0.25)', alignItems: 'center', justifyContent: 'center' },
  gpsInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: BLUE, borderWidth: 2, borderColor: '#fff' },
  mapStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderTopWidth: 1, borderTopColor: '#eef2f9', backgroundColor: '#fff' },
  mapStripText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  locateBtn: { backgroundColor: '#eef2f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  locateText: { fontSize: 12, fontWeight: '700', color: BLUE },
});
