// Calendar days ('YYYY-MM-DD') in the municipality's time zone, so "today" doesn't
// depend on where the server runs.
const TIME_ZONE = process.env.APP_TIMEZONE || 'Africa/Douala';

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

const today = () => dayFormat.format(new Date());

// A real calendar day in YYYY-MM-DD form (rejects 2026-02-30)
const isDay = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// Days from start to end, counting both
const daysInclusive = (start, end) =>
  Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86400000) + 1;

const addDays = (day, n) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "12 Oct" or "12 Oct – 15 Oct" (English; apps format dates themselves)
const formatRange = (start, end) => {
  const fmt = (d) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
};

module.exports = { today, isDay, daysInclusive, addDays, formatRange };
