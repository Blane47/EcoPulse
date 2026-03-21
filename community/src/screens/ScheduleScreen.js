import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useZone } from '../context/ZoneContext';
import { colors, getColors } from '../theme';
import api from '../api/axios';

// Try to import expo-notifications (fails gracefully in Expo Go)
let Notifications = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // expo-notifications not available in Expo Go
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_MAP = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const rows = [];
  let week = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    week.push({ day: prevDays - i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    week.push({ day: d, current: true });
    if (week.length === 7) { rows.push(week); week = []; }
  }
  let nextDay = 1;
  while (week.length > 0 && week.length < 7) {
    week.push({ day: nextDay++, current: false });
  }
  if (week.length) rows.push(week);
  return rows;
}

// Get the next occurrence of a given weekday
function getNextDateForDay(dayName, time) {
  const now = new Date();
  const targetDay = DAY_MAP[dayName];
  if (targetDay === undefined) return null;

  const currentDay = now.getDay();
  let daysAhead = targetDay - currentDay;
  if (daysAhead <= 0) daysAhead += 7;

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysAhead);

  // Parse time like "7:00 AM"
  const match = time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1]);
    const mins = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    nextDate.setHours(hours, mins, 0, 0);
  }

  return nextDate;
}

async function requestPermissions() {
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function scheduleReminder(item, zone) {
  const collectionDate = getNextDateForDay(item.day, item.time);
  if (!collectionDate) return null;

  const reminderDate = new Date(collectionDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(19, 0, 0, 0);

  if (reminderDate <= new Date()) return null;

  // If notifications available, schedule a real one
  if (Notifications) {
    try {
      const types = (item.wasteTypes || []).join(' + ');
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Collection Tomorrow - ${zone}`,
          body: `${types} collection at ${item.time}. Remember to place your bins out by 6:30 AM.`,
          sound: true,
        },
        trigger: { date: reminderDate },
      });
      return id;
    } catch {
      // Fall through to saved preference
    }
  }

  // Fallback: just save the preference (no push in Expo Go)
  return 'saved';
}

async function cancelReminder(notifId) {
  if (notifId && notifId !== 'saved' && Notifications) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notifId);
    } catch {}
  }
}

export default function ScheduleScreen({ navigation }) {
  const { zone, language, darkMode } = useZone();
  const c = getColors(darkMode);
  const en = language === 'en';
  const [schedule, setSchedule] = useState([]);
  const [reminders, setReminders] = useState({});

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const defaultSchedule = [
    { _id: '1', day: 'Thursday', time: '7:00 AM', wasteTypes: ['General', 'Recyclable'], dateNum: 20 },
    { _id: '2', day: 'Monday', time: '7:00 AM', wasteTypes: ['Organic'], dateNum: 24 },
    { _id: '3', day: 'Thursday', time: '7:00 AM', wasteTypes: ['General', 'Recyclable'], dateNum: 27 },
  ];

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const { data } = await api.get(`/schedule/${zone}`);
        setSchedule(data.length ? data : defaultSchedule);
      } catch {
        setSchedule(defaultSchedule);
      }
    };
    fetchSchedule();
  }, [zone]);

  // Load saved reminders from storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(`reminders_${zone}`);
        if (saved) setReminders(JSON.parse(saved));
      } catch {}
    })();
  }, [zone]);

  const toggleReminder = async (item) => {
    const key = item._id || item.day;
    const isOn = !!reminders[key];

    if (!isOn) {
      // Turning ON
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          en ? 'Notifications Disabled' : 'Notifications Désactivées',
          en ? 'Please enable notifications in your device settings.' : 'Veuillez activer les notifications dans les paramètres.'
        );
        return;
      }

      const notifId = await scheduleReminder(item, zone);
      if (!notifId) {
        Alert.alert(
          en ? 'Already Passed' : 'Déjà Passé',
          en ? 'The reminder time has already passed for this week.' : 'L\'heure du rappel est déjà passée cette semaine.'
        );
        return;
      }

      const updated = { ...reminders, [key]: notifId };
      setReminders(updated);
      await AsyncStorage.setItem(`reminders_${zone}`, JSON.stringify(updated));
    } else {
      // Turning OFF
      await cancelReminder(reminders[key]);
      const updated = { ...reminders };
      delete updated[key];
      setReminders(updated);
      await AsyncStorage.setItem(`reminders_${zone}`, JSON.stringify(updated));
    }
  };

  const collectionDays = new Set(schedule.map((s) => s.dateNum).filter(Boolean));
  const calendarRows = getCalendarDays(viewYear, viewMonth);
  const today = now.getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={[styles.headerTitle, { color: c.text }]}>{en ? 'Schedule' : 'Calendrier'}</Text>
            <Text style={[styles.headerSub, { color: c.textMuted }]}>ECOPULSE</Text>
          </View>
        </View>
        <View style={[styles.zoneBadge, { backgroundColor: c.accentLight }]}>
          <Text style={styles.zoneBadgeDot}>📍</Text>
          <Text style={[styles.zoneBadgeText, { color: c.accent }]}>{zone}</Text>
        </View>
      </View>

      {/* Banner Image */}
      <View style={styles.bannerImage}>
        <Text style={styles.bannerEmoji}>🏙️</Text>
      </View>

      {/* Calendar */}
      <View style={[styles.calendarCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={styles.calendarHeader}>
          <Text style={[styles.calendarMonth, { color: c.text }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <View style={styles.calendarNav}>
            <TouchableOpacity onPress={prevMonth}>
              <Text style={[styles.navArrow, { color: c.textSecondary }]}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth}>
              <Text style={[styles.navArrow, { color: c.textSecondary }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeaderRow}>
          {DAYS.map((d) => (
            <Text key={d} style={[styles.dayHeader, { color: c.textMuted }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        {calendarRows.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((cell, ci) => {
              const isToday = cell.current && cell.day === today && viewMonth === now.getMonth() && viewYear === now.getFullYear();
              const hasCollection = cell.current && collectionDays.has(cell.day);
              return (
                <View key={ci} style={styles.dayCell}>
                  <View style={[
                    styles.dayCellInner,
                    isToday && { borderWidth: 2, borderColor: c.accent },
                  ]}>
                    <Text style={[
                      styles.dayText,
                      { color: c.text },
                      !cell.current && { color: c.textMuted },
                      isToday && { fontWeight: '700', color: c.accent },
                    ]}>
                      {cell.day}
                    </Text>
                  </View>
                  {hasCollection && <View style={[styles.collectionDot, { backgroundColor: c.accent }]} />}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Upcoming Collections */}
      <View style={styles.upcomingSection}>
        <Text style={[styles.upcomingTitle, { color: c.textMuted }]}>
          {en ? 'UPCOMING COLLECTIONS' : 'PROCHAINES COLLECTES'}
        </Text>

        {schedule.map((item, index) => {
          const key = item._id || item.day;
          const isActive = index === 0;
          return (
            <View
              key={key}
              style={[
                styles.collectionCard,
                { backgroundColor: c.card, borderColor: c.cardBorder },
                isActive && { backgroundColor: c.accent, borderColor: c.accent },
              ]}
            >
              <View style={[styles.dateBox, { backgroundColor: c.background }, isActive && styles.dateBoxActive]}>
                <Text style={[styles.dateBoxDay, { color: c.textMuted }, isActive && styles.dateBoxDayActive]}>
                  {item.day?.slice(0, 3).toUpperCase()}
                </Text>
                <Text style={[styles.dateBoxNum, { color: c.text }, isActive && styles.dateBoxNumActive]}>
                  {item.dateNum || (20 + index * 3)}
                </Text>
              </View>
              <View style={styles.collectionInfo}>
                <Text style={[styles.collectionType, { color: c.text }, isActive && { color: '#fff' }]}>
                  {(item.wasteTypes || []).join(' + ')}
                </Text>
                <Text style={[styles.collectionTime, { color: c.textSecondary }, isActive && { color: 'rgba(255,255,255,0.7)' }]}>
                  {item.time}
                </Text>
                {!!reminders[key] && (
                  <Text style={[styles.reminderLabel, { color: c.accent }, isActive && { color: 'rgba(255,255,255,0.8)' }]}>
                    🔔 {en ? 'Reminder set' : 'Rappel activé'}
                  </Text>
                )}
              </View>
              <Switch
                value={!!reminders[key]}
                onValueChange={() => toggleReminder(item)}
                trackColor={{ false: c.cardBorder, true: isActive ? 'rgba(255,255,255,0.3)' : c.accentLight }}
                thumbColor={reminders[key] ? (isActive ? '#fff' : c.accent) : '#f4f3f4'}
              />
            </View>
          );
        })}
      </View>

      {/* Reminder Note */}
      <View style={[styles.reminderCard, { backgroundColor: c.accentLight }]}>
        <Text style={styles.reminderIcon}>♻️</Text>
        <Text style={[styles.reminderText, { color: c.text }]}>
          {en
            ? 'Toggle reminders to get notified the evening before collection day.'
            : 'Activez les rappels pour être notifié la veille du jour de collecte.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 55 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 10, color: colors.textMuted, letterSpacing: 1.5 },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 4,
  },
  zoneBadgeDot: { fontSize: 10 },
  zoneBadgeText: { fontSize: 12, fontWeight: '600', color: colors.accent },

  // Banner
  bannerImage: {
    height: 100,
    backgroundColor: '#8b9dad',
    marginHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bannerEmoji: { fontSize: 50 },

  // Calendar
  calendarCard: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonth: { fontSize: 18, fontWeight: '800', color: colors.text },
  calendarNav: { flexDirection: 'row', gap: 16 },
  navArrow: { fontSize: 24, color: colors.textSecondary, fontWeight: '300' },

  dayHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },

  weekRow: { flexDirection: 'row', marginBottom: 4 },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCellInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 14, color: colors.text },
  dayTextMuted: { color: colors.textMuted },
  todayCircle: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  todayText: { fontWeight: '700', color: colors.accent },
  collectionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginTop: 2,
  },

  // Upcoming
  upcomingSection: { paddingHorizontal: 20, marginBottom: 16 },
  upcomingTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 8,
  },
  collectionCardActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dateBox: {
    width: 44,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dateBoxActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dateBoxDay: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  dateBoxDayActive: { color: 'rgba(255,255,255,0.7)' },
  dateBoxNum: { fontSize: 18, fontWeight: '800', color: colors.text },
  dateBoxNumActive: { color: '#fff' },
  collectionInfo: { flex: 1 },
  collectionType: { fontSize: 14, fontWeight: '700', color: colors.text },
  collectionTime: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  reminderLabel: { fontSize: 10, color: colors.accent, marginTop: 3, fontWeight: '600' },

  // Reminder
  reminderCard: {
    marginHorizontal: 20,
    backgroundColor: colors.accentLight,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderIcon: { fontSize: 22 },
  reminderText: { fontSize: 13, color: colors.text, flex: 1, lineHeight: 19 },
});
