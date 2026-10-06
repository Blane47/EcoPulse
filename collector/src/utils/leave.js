// Leave dates are whole calendar days, 'YYYY-MM-DD' in Cameroon time, start and end both
// included. They're handled as local dates (never new Date('YYYY-MM-DD'), which is UTC
// midnight and can show as the day before), and names are spelt out here rather than
// through Intl so English and French look the same on every phone.

export const MAX_LEAVE_DAYS = 60;
// The first day can be at most this many days after today (counting today)
export const MAX_DAYS_AHEAD = 365;
export const REASON_MIN = 3;
export const REASON_MAX = 500;

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
};
const MONTHS_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
};
// Monday first
export const WEEKDAYS_SHORT = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
};
const WEEKDAYS_LONG = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
};

const pad = (n) => String(n).padStart(2, '0');

export const parseDay = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const toDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// The phone's own date, only until the server's "today" has loaded
export const localToday = () => toDay(new Date());

export const addDays = (day, n) => {
  const date = parseDay(day);
  date.setDate(date.getDate() + n);
  return toDay(date);
};

// Days from start to end, counting both (Math.round absorbs daylight-saving hours)
export const daysInclusive = (start, end) => Math.round((parseDay(end) - parseDay(start)) / 86400000) + 1;

// Monday = 0 … Sunday = 6
export const weekdayIndex = (day) => (parseDay(day).getDay() + 6) % 7;

const lang = (en) => (en ? 'en' : 'fr');

export const monthTitle = (year, month, en) => {
  const name = MONTHS[lang(en)][month];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
};

// "Mon 20 Oct" / "lun. 20 oct." (the year is added when it isn't this year)
export function formatDay(day, en, today) {
  const date = parseDay(day);
  const l = lang(en);
  const weekday = en ? WEEKDAYS_SHORT.en[weekdayIndex(day)] : `${WEEKDAYS_LONG.fr[weekdayIndex(day)].slice(0, 3)}.`;
  const year = today && day.slice(0, 4) !== today.slice(0, 4) ? ` ${date.getFullYear()}` : '';
  return `${weekday} ${date.getDate()} ${MONTHS_SHORT[l][date.getMonth()]}${year}`;
}

// "Monday 20 October" / "lundi 20 octobre", for screen readers
export function formatDayLong(day, en) {
  const date = parseDay(day);
  return `${WEEKDAYS_LONG[lang(en)][weekdayIndex(day)]} ${date.getDate()} ${MONTHS[lang(en)][date.getMonth()]} ${date.getFullYear()}`;
}

// "Mon 20 Oct – Wed 22 Oct", or a single day
export const formatRange = (start, end, en, today) => (start === end
  ? formatDay(start, en, today)
  : `${formatDay(start, en, today)} – ${formatDay(end, en, today)}`);

// Compact: "20–22 Oct", "30 Oct – 2 Nov", "20 Oct"
export function formatRangeShort(start, end, en, today) {
  const l = lang(en);
  const s = parseDay(start);
  const e = parseDay(end);
  const year = today && end.slice(0, 4) !== today.slice(0, 4) ? ` ${e.getFullYear()}` : '';
  const month = (d) => MONTHS_SHORT[l][d.getMonth()];
  if (start === end) return `${s.getDate()} ${month(s)}${year}`;
  if (start.slice(0, 7) === end.slice(0, 7)) return `${s.getDate()}–${e.getDate()} ${month(e)}${year}`;
  const startYear = start.slice(0, 4) !== end.slice(0, 4) ? ` ${s.getFullYear()}` : '';
  return `${s.getDate()} ${month(s)}${startYear} – ${e.getDate()} ${month(e)}${year}`;
}

export const dayCount = (n, en) => (en ? `${n} ${n === 1 ? 'day' : 'days'}` : `${n} ${n === 1 ? 'jour' : 'jours'}`);

// Pending or approved leave that isn't over: these days can't be asked for again
export const blocksDays = (leave, today) =>
  (leave.status === 'pending' || leave.status === 'approved') && leave.endDate >= today;

// What the collector can still withdraw (the server allows the same)
export const canCancel = (leave, today) =>
  leave.status === 'pending' || (leave.status === 'approved' && leave.startDate > today);

// Approved leave covering today
export const currentLeave = (leaves, today) =>
  leaves.find((l) => l.status === 'approved' && l.startDate <= today && l.endDate >= today) || null;

// Soonest approved leave that hasn't started
export const nextLeave = (leaves, today) =>
  leaves
    .filter((l) => l.status === 'approved' && l.startDate > today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0] || null;
