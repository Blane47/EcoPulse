import { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { ChevronDownIcon } from './Icons';
import {
  MAX_LEAVE_DAYS, MAX_DAYS_AHEAD, WEEKDAYS_SHORT,
  toDay, addDays, daysInclusive, monthTitle, formatDayLong,
} from '../utils/leave';

const monthKey = (day) => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 });
const monthIndex = ({ year, month }) => year * 12 + month;

// Month calendar for picking leave: tap the first day, then the last day.
// Tapping a day before the first one starts again from there; tapping the first day
// again makes it a one-day leave. Past days and days already asked for can't be picked.
// Props: today ('YYYY-MM-DD'), start, end (or null), onChange({ start, end }), language,
// booked: [{ startDate, endDate }] pending/approved leave to keep clear of.
export default function DateRangePicker({ today, start, end, onChange, language, booked = [] }) {
  const en = language === 'en';
  const [shown, setShown] = useState(() => monthKey(start || today));
  const [message, setMessage] = useState('');

  const lastStart = addDays(today, MAX_DAYS_AHEAD - 1);
  const minMonth = monthIndex(monthKey(today));
  const maxMonth = monthIndex(monthKey(lastStart));
  const current = monthIndex(shown);

  // Keep the visible month in range if "today" moves on (e.g. after a refresh past midnight)
  useEffect(() => {
    if (current < minMonth) setShown(monthKey(today));
  }, [today]);

  // Clear the hint once the form is reset (after sending)
  useEffect(() => {
    if (!start) setMessage('');
  }, [start]);

  const isBooked = (day) => booked.some((b) => b.startDate <= day && b.endDate >= day);
  const overlapsBooked = (from, to) => booked.some((b) => b.startDate <= to && b.endDate >= from);
  const choosingEnd = !!start && !end;

  const weeks = useMemo(() => {
    const first = new Date(shown.year, shown.month, 1);
    const lead = (first.getDay() + 6) % 7;
    const count = new Date(shown.year, shown.month + 1, 0).getDate();
    const cells = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= count; d++) cells.push(toDay(new Date(shown.year, shown.month, d)));
    while (cells.length % 7) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [shown.year, shown.month]);

  const move = (delta) => {
    const next = Math.min(maxMonth, Math.max(minMonth, current + delta));
    setShown({ year: Math.floor(next / 12), month: next % 12 });
  };

  const pick = (day) => {
    setMessage('');
    if (choosingEnd && day >= start) {
      if (day !== start && overlapsBooked(start, day)) {
        setMessage(en
          ? 'You already asked for some of these days. Choose other days.'
          : 'Vous avez déjà demandé certains de ces jours. Choisissez d’autres jours.');
        return;
      }
      if (daysInclusive(start, day) > MAX_LEAVE_DAYS) {
        setMessage(en
          ? `Leave can be at most ${MAX_LEAVE_DAYS} days. Choose an earlier last day, or ask the admin about longer leave.`
          : `Un congé dure au plus ${MAX_LEAVE_DAYS} jours. Choisissez un dernier jour plus tôt, ou parlez à l’admin pour un congé plus long.`);
        return;
      }
      onChange({ start, end: day });
      return;
    }
    // New first day (nothing chosen yet, a range is already complete, or this day is before the first)
    if (day > lastStart) {
      setMessage(en
        ? 'Leave can be asked for up to a year ahead. Choose an earlier first day.'
        : 'Un congé peut être demandé jusqu’à un an à l’avance. Choisissez un premier jour plus tôt.');
      return;
    }
    onChange({ start: day, end: null });
  };

  const hint = message
    || (!start
      ? (en ? 'Tap the first day of your leave.' : 'Touchez le premier jour de votre congé.')
      : choosingEnd
        ? (en ? 'Now tap the last day. Tap the same day again for a one-day leave.' : 'Touchez maintenant le dernier jour. Touchez le même jour pour un congé d’un jour.')
        : (en ? 'To change the dates, tap a new first day.' : 'Pour changer les dates, touchez un nouveau premier jour.'));

  return (
    <View>
      {/* Month and arrows */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.navBtn, current <= minMonth && styles.navBtnOff]}
          onPress={() => move(-1)}
          disabled={current <= minMonth}
          accessibilityRole="button"
          accessibilityLabel={en ? 'Previous month' : 'Mois précédent'}
        >
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <ChevronDownIcon size={22} color={current <= minMonth ? colors.cardBorder : colors.accentDark} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthTitle(shown.year, shown.month, en)}</Text>
        <TouchableOpacity
          style={[styles.navBtn, current >= maxMonth && styles.navBtnOff]}
          onPress={() => move(1)}
          disabled={current >= maxMonth}
          accessibilityRole="button"
          accessibilityLabel={en ? 'Next month' : 'Mois suivant'}
        >
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
            <ChevronDownIcon size={22} color={current >= maxMonth ? colors.cardBorder : colors.accentDark} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Weekday names, Monday first */}
      <View style={styles.row}>
        {WEEKDAYS_SHORT[en ? 'en' : 'fr'].map((w, i) => (
          <Text key={w} style={[styles.weekday, i >= 5 && styles.weekend]}>{w}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((day, di) => {
            if (!day) return <View key={`e${di}`} style={styles.cell} />;
            const past = day < today;
            const taken = !past && isBooked(day);
            const disabled = past || taken;
            const isStart = day === start;
            const isEnd = day === (end || null);
            const inRange = start && end && day >= start && day <= end;
            const single = isStart && (end === start);
            // While choosing the last day, days too far away are faded (a tap explains why)
            const tooFar = choosingEnd && day > start && daysInclusive(start, day) > MAX_LEAVE_DAYS;
            const isToday = day === today;
            const selected = isStart || isEnd;

            return (
              <TouchableOpacity
                key={day}
                testID={`day-${day}`}
                style={styles.cell}
                onPress={() => pick(day)}
                disabled={disabled}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected }}
                accessibilityLabel={`${formatDayLong(day, en)}${taken ? (en ? ', already requested' : ', déjà demandé') : ''}`}
              >
                {inRange && !single && (
                  <View style={[
                    styles.band,
                    isStart && styles.bandStart,
                    isEnd && styles.bandEnd,
                  ]} />
                )}
                <View style={[
                  styles.dayCircle,
                  isToday && !selected && styles.todayCircle,
                  taken && styles.takenCircle,
                  selected && styles.selectedCircle,
                ]}>
                  <Text style={[
                    styles.dayText,
                    di >= 5 && styles.weekendText,
                    (past || tooFar) && styles.dayTextOff,
                    taken && styles.takenText,
                    isToday && styles.todayText,
                    inRange && !selected && styles.rangeText,
                    selected && styles.selectedText,
                  ]}>
                    {Number(day.slice(8))}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Key */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.todayCircle]} />
          <Text style={styles.legendText}>{en ? 'Today' : 'Aujourd’hui'}</Text>
        </View>
        {booked.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.takenCircle]} />
            <Text style={styles.legendText}>{en ? 'Already requested' : 'Déjà demandé'}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.hint, message && styles.hintError]} accessibilityLiveRegion="polite">{hint}</Text>
    </View>
  );
}

const CELL_HEIGHT = 46;
const CIRCLE = 40;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
  },
  navBtnOff: { backgroundColor: '#f3f4f6' },
  monthTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingVertical: 6,
  },
  weekend: { color: colors.textMuted },
  cell: { flex: 1, height: CELL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  // Light green strip joining the chosen days
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (CELL_HEIGHT - CIRCLE) / 2,
    height: CIRCLE,
    backgroundColor: colors.accentLight,
  },
  bandStart: { left: '50%' },
  bandEnd: { right: '50%' },
  dayCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: { borderWidth: 2, borderColor: colors.accent },
  takenCircle: { backgroundColor: colors.amberLight },
  selectedCircle: { backgroundColor: colors.accentDark, borderWidth: 0 },
  dayText: { fontSize: 16, fontWeight: '600', color: colors.text },
  weekendText: { color: colors.textSecondary },
  dayTextOff: { color: '#d1d5db', fontWeight: '400' },
  takenText: { color: '#b45309', textDecorationLine: 'line-through' },
  todayText: { fontWeight: '800', color: colors.accentDark },
  rangeText: { color: '#166534', fontWeight: '700' },
  selectedText: { color: '#fff', fontWeight: '800' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 16, height: 16, borderRadius: 8 },
  legendText: { fontSize: 12, color: colors.textSecondary },
  hint: { fontSize: 14, color: colors.textSecondary, marginTop: 10, lineHeight: 20, minHeight: 40 },
  hintError: { color: '#b91c1c', fontWeight: '600' },
});
