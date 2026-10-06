// Leave dates are calendar days ('YYYY-MM-DD', Cameroon time) with both ends included.
// They're parsed as local midnight so a day never shifts in the viewer's time zone;
// `today` always comes from the API so "upcoming / now / past" matches the server.
export const toDate = (day) => new Date(`${day}T00:00:00`);

const pad = (n) => String(n).padStart(2, '0');

export const addDays = (day, n) => {
  const date = toDate(day);
  date.setDate(date.getDate() + n);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// b - a in whole days (rounding absorbs daylight-saving hours)
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);

export const leaveLength = (leave) => daysBetween(leave.startDate, leave.endDate) + 1;

export const pluralDays = (n) => `${n} day${n === 1 ? '' : 's'}`;

// Fixed names: toLocaleDateString('en-GB') writes September as "Sept" in newer browsers
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Mon 12 Oct", or "12 Oct" without the weekday; the year is added only when it isn't this year
export const formatDay = (day, today, { weekday = true } = {}) => {
  const date = toDate(day);
  const parts = [
    weekday && WEEKDAYS[date.getDay()],
    `${date.getDate()} ${MONTHS[date.getMonth()]}`,
    today && day.slice(0, 4) !== today.slice(0, 4) && day.slice(0, 4),
  ];
  return parts.filter(Boolean).join(' ');
};

// "Mon 12 Oct – Thu 15 Oct" (one day: "Mon 12 Oct")
export const formatRange = (start, end, today) =>
  start === end ? formatDay(start, today) : `${formatDay(start, today)} – ${formatDay(end, today)}`;

// Compact form for inline mentions: "12–14 Oct", "30 Sep – 2 Oct", "12 Oct"
export const shortRange = (start, end, today) => {
  if (start === end) return formatDay(start, today, { weekday: false });
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${Number(start.slice(8))}–${formatDay(end, today, { weekday: false })}`;
  }
  return `${formatDay(start, today, { weekday: false })} – ${formatDay(end, today, { weekday: false })}`;
};

// pending | declined | cancelled, or for approved leave: upcoming | current | finished
export const leavePhase = (leave, today) => {
  if (leave.status !== 'approved') return leave.status;
  if (leave.endedAt || leave.endDate < today) return 'finished';
  return leave.startDate > today ? 'upcoming' : 'current';
};

// "Starts in 3 days", "On leave now — back on Fri 16 Oct", "Ended 2 Oct"; null when it doesn't apply
export const timingText = (leave, today) => {
  const phase = leavePhase(leave, today);
  if (phase === 'current') return `On leave now — back on ${formatDay(addDays(leave.endDate, 1), today)}`;
  if (phase === 'finished') return `Ended ${formatDay(leave.endDate, today, { weekday: false })}`;
  if (phase !== 'pending' && phase !== 'upcoming') return null;
  if (leave.endDate < today) return 'These dates have passed';
  const days = daysBetween(today, leave.startDate);
  if (days > 1) return `Starts in ${days} days`;
  if (days === 1) return 'Starts tomorrow';
  if (days === 0) return 'Starts today';
  return `Was due to start ${formatDay(leave.startDate, today)}`;
};

// Status pill; cancelled leave that had already started reads as "Ended early"
export const leavePill = (leave) => {
  if (leave.status === 'cancelled' && leave.startedAt) return { key: 'ended', label: 'Ended early', color: 'bg-gray-100 text-gray-600' };
  return {
    pending: { key: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
    approved: { key: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
    declined: { key: 'declined', label: 'Declined', color: 'bg-red-100 text-red-700' },
    cancelled: { key: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
  }[leave.status] || { key: leave.status, label: leave.status, color: 'bg-gray-100 text-gray-600' };
};
