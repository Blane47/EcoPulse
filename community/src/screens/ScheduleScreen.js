import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useZone } from '../context/ZoneContext';
import { colors, shadows } from '../theme';
import api from '../api/axios';
import TealHeader from '../components/TealHeader';
import { BellIcon, MapPinIcon, RecycleIcon } from '../components/Icons';

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
      const secondsUntil = Math.max(1, Math.floor((reminderDate.getTime() - Date.now()) / 1000));
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Collection Tomorrow - ${zone}`,
          body: `${types} collection at ${item.time}. Remember to place your bins out by 6:30 AM.`,
          sound: true,
        },
        trigger: { seconds: secondsUntil },
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

// Get all dates in a month that fall on a given weekday
function getDatesForDay(year, month, dayName) {
  const targetDay = DAY_MAP[dayName];
  if (targetDay === undefined) return [];
  const dates = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === targetDay) {
      dates.push(d);
    }
  }
  return dates;
}

const WASTE_COLORS = {
  General: '#22c55e',
  Organic: '#d97706',
  Recyclable: '#3b82f6',
};

export default function ScheduleScreen({ navigation }) {
  const { zone, language } = useZone();
  const en = language === 'en';
  const [schedule, setSchedule] = useState([]);
  const [reminders, setReminders] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const defaultSchedule = [
    { _id: '1', day: 'Monday', time: '7:00 AM - 11:00 AM', wasteTypes: ['General', 'Organic'] },
    { _id: '2', day: 'Wednesday', time: '7:00 AM - 11:00 AM', wasteTypes: ['Recyclable'] },
    { _id: '3', day: 'Friday', time: '7:00 AM - 12:00 PM', wasteTypes: ['General', 'Organic', 'Recyclable'] },
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
      // Turning ON — try notifications, fallback to saved preference
      let notifId = 'saved';

      if (Notifications) {
        const granted = await requestPermissions();
        if (granted) {
          const scheduled = await scheduleReminder(item, zone);
          if (scheduled) notifId = scheduled;
        }
      }

      const updated = { ...reminders, [key]: notifId };
      setReminders(updated);
      await AsyncStorage.setItem(`reminders_${zone}`, JSON.stringify(updated));

      const types = (item.wasteTypes || []).join(' + ');
      if (notifId !== 'saved') {
        Alert.alert('Reminder Set', `You'll be notified the evening before ${item.day}'s ${types} collection.`);
      } else {
        Alert.alert('Reminder Saved', `Reminder saved for ${item.day}'s ${types} collection. Notifications will work in the full app.`);
      }
    } else {
      // Turning OFF
      await cancelReminder(reminders[key]);
      const updated = { ...reminders };
      delete updated[key];
      setReminders(updated);
      await AsyncStorage.setItem(`reminders_${zone}`, JSON.stringify(updated));
    }
  };

  // Build a map of date -> schedule items for the viewed month
  const dateScheduleMap = {};
  schedule.forEach((item) => {
    const dates = getDatesForDay(viewYear, viewMonth, item.day);
    dates.forEach((d) => {
      if (!dateScheduleMap[d]) dateScheduleMap[d] = [];
      dateScheduleMap[d].push(item);
    });
  });
  const collectionDays = new Set(Object.keys(dateScheduleMap).map(Number));
  const calendarRows = getCalendarDays(viewYear, viewMonth);
  const today = now.getDate();

  // Get schedule for selected day
  const selectedDaySchedule = selectedDay ? (dateScheduleMap[selectedDay] || []) : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 120 }}>
      <TealHeader
        title={en ? 'Collection Schedule' : 'Calendrier de Collecte'}
        rightElement={
          <View style={{ backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><MapPinIcon size={13} color="#F59E0B" /><Text style={{ fontSize: 11, fontWeight: '700', color: '#F59E0B' }}>{zone}</Text></View>
          </View>
        }
      />

      {/* Calendar */}
      <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.calendarHeader}>
          <Text style={[styles.calendarMonth, { color: colors.text }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <View style={styles.calendarNav}>
            <TouchableOpacity onPress={prevMonth}>
              <Text style={[styles.navArrow, { color: colors.textSecondary }]}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth}>
              <Text style={[styles.navArrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeaderRow}>
          {DAYS.map((d) => (
            <Text key={d} style={[styles.dayHeader, { color: colors.textMuted }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        {calendarRows.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((cell, ci) => {
              const isToday = cell.current && cell.day === today && viewMonth === now.getMonth() && viewYear === now.getFullYear();
              const hasCollection = cell.current && collectionDays.has(cell.day);
              const isSelected = cell.current && cell.day === selectedDay;
              // Get unique waste types for this day's dots
              const dayTypes = cell.current && dateScheduleMap[cell.day]
                ? [...new Set(dateScheduleMap[cell.day].flatMap(s => s.wasteTypes || []))]
                : [];
              return (
                <TouchableOpacity
                  key={ci}
                  style={styles.dayCell}
                  onPress={() => cell.current ? setSelectedDay(cell.day === selectedDay ? null : cell.day) : null}
                  activeOpacity={0.6}
                >
                  <View style={[
                    styles.dayCellInner,
                    isToday && { borderWidth: 2, borderColor: colors.accent },
                    isSelected && { backgroundColor: colors.accent },
                    hasCollection && !isSelected && !isToday && { backgroundColor: 'rgba(34,197,94,0.08)' },
                  ]}>
                    <Text style={[
                      styles.dayText,
                      { color: colors.text },
                      !cell.current && { color: colors.textMuted },
                      isToday && { fontWeight: '700', color: colors.accent },
                      isSelected && { fontWeight: '700', color: '#fff' },
                      hasCollection && !isSelected && { fontWeight: '600' },
                    ]}>
                      {cell.day}
                    </Text>
                  </View>
                  {hasCollection && !isSelected && (
                    <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                      {dayTypes.map((t) => (
                        <View key={t} style={[styles.collectionDot, { backgroundColor: WASTE_COLORS[t] || colors.accent }]} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Waste Type Legend */}
      <View style={styles.legendRow}>
        {Object.entries(WASTE_COLORS).map(([type, color]) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{type}</Text>
          </View>
        ))}
      </View>

      {/* Selected Day Detail */}
      {selectedDay !== null && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={[styles.selectedDayCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.selectedDayTitle, { color: colors.text }]}>
              {MONTH_NAMES[viewMonth]} {selectedDay}, {viewYear}
            </Text>
            {selectedDaySchedule.length > 0 ? (
              selectedDaySchedule.map((item, i) => (
                <View key={i} style={styles.selectedDayItem}>
                  <View style={{ gap: 3 }}>
                    {(item.wasteTypes || []).map((t) => (
                      <View key={t} style={[styles.selectedDayDot, { backgroundColor: WASTE_COLORS[t] || colors.accent }]} />
                    ))}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedDayType, { color: colors.text }]}>
                      {(item.wasteTypes || []).join(' + ')}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.time}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                {en ? 'No collection scheduled for this day' : 'Pas de collecte prévue ce jour'}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Upcoming Collections */}
      <View style={styles.upcomingSection}>
        <Text style={[styles.upcomingTitle, { color: colors.textMuted }]}>
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
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                isActive && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
            >
              <View style={[styles.dateBox, { backgroundColor: colors.background }, isActive && styles.dateBoxActive]}>
                <Text style={[styles.dateBoxDay, { color: colors.textMuted }, isActive && styles.dateBoxDayActive]}>
                  {item.day?.slice(0, 3).toUpperCase()}
                </Text>
                <Text style={[styles.dateBoxNum, { color: colors.text }, isActive && styles.dateBoxNumActive]}>
                  {item.dateNum || (20 + index * 3)}
                </Text>
              </View>
              <View style={styles.collectionInfo}>
                <Text style={[styles.collectionType, { color: colors.text }, isActive && { color: '#fff' }]}>
                  {(item.wasteTypes || []).join(' + ')}
                </Text>
                <Text style={[styles.collectionTime, { color: colors.textSecondary }, isActive && { color: 'rgba(255,255,255,0.7)' }]}>
                  {item.time}
                </Text>
                {!!reminders[key] && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <BellIcon size={12} color={isActive ? 'rgba(255,255,255,0.8)' : colors.accent} />
                    <Text style={[styles.reminderLabel, { color: colors.accent, marginTop: 0 }, isActive && { color: 'rgba(255,255,255,0.8)' }]}>
                      {en ? 'Reminder set' : 'Rappel activé'}
                    </Text>
                  </View>
                )}
              </View>
              <Switch
                value={!!reminders[key]}
                onValueChange={() => toggleReminder(item)}
                trackColor={{ false: colors.cardBorder, true: isActive ? 'rgba(255,255,255,0.3)' : colors.accentLight }}
                thumbColor={reminders[key] ? (isActive ? '#fff' : colors.accent) : '#f4f3f4'}
              />
            </View>
          );
        })}
      </View>

      {/* Reminder Note */}
      <View style={[styles.reminderCard, { backgroundColor: colors.accentLight }]}>
        <RecycleIcon size={22} color={colors.accent} />
        <Text style={[styles.reminderText, { color: colors.text }]}>
          {en
            ? 'Toggle reminders to get notified the evening before collection day.'
            : 'Activez les rappels pour être notifié la veille du jour de collecte.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Calendar
  calendarCard: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    marginBottom: 20,
    ...shadows.card,
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

  // Legend
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Selected Day Card
  selectedDayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  selectedDayTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  selectedDayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  selectedDayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectedDayType: {
    fontSize: 14,
    fontWeight: '600',
  },
});
