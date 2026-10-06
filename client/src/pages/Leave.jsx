import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, CalendarDays, Users, CheckCircle, XCircle, Hourglass, Ban } from 'lucide-react';
import api from '../api/axios';
import {
  formatRange, shortRange, leaveLength, pluralDays, leavePhase, timingText, leavePill,
} from '../utils/leave';

const pillIcons = { pending: Hourglass, approved: CheckCircle, declined: XCircle, cancelled: Ban, ended: Ban };

const tabs = [
  { key: 'pending', label: 'Pending', phases: ['pending'] },
  { key: 'active', label: 'Current & upcoming', phases: ['current', 'upcoming'] },
  { key: 'past', label: 'Past', phases: ['finished', 'declined', 'cancelled'] },
  { key: 'all', label: 'All' },
];

const emptyText = {
  pending: 'No leave requests waiting for review',
  active: 'No one is on leave or due to be',
  past: 'No past leave yet',
  all: 'No leave requests yet',
};

// "6 Oct" (with the year when it isn't this year) for timestamps such as when a request was sent
const formatStamp = (dateStr) => {
  const date = new Date(dateStr);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
};

// Collectors ask for time off from the Collector app; admins approve, decline or end it here
export default function Leave() {
  const [leaves, setLeaves] = useState([]);
  const [today, setToday] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  // Per request: API error, note being typed, and whether the note box is open on approved leave
  const [errors, setErrors] = useState({});
  const [notes, setNotes] = useState({});
  const [noteOpen, setNoteOpen] = useState({});
  // Confirmation after an action moves a card to another tab
  const [notice, setNotice] = useState('');

  const fetchLeaves = async () => {
    try {
      const { data } = await api.get('/leave');
      setLeaves(data.leaves);
      setToday(data.today);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Swap in the updated request, and refresh that collector (their status may have changed) on their other requests
  const replace = (updated) =>
    setLeaves((prev) => prev.map((l) => {
      if (l._id === updated._id) return updated;
      if (updated.collector && l.collector?._id === updated.collector._id) return { ...l, collector: updated.collector };
      return l;
    }));

  const run = async (leave, request, fallbackError, success) => {
    setBusyId(leave._id);
    setErrors((prev) => ({ ...prev, [leave._id]: '' }));
    try {
      const { data } = await request((notes[leave._id] || '').trim());
      replace(data);
      setNotes((prev) => ({ ...prev, [leave._id]: '' }));
      setNoteOpen((prev) => ({ ...prev, [leave._id]: false }));
      setNotice(success);
    } catch (err) {
      setErrors((prev) => ({ ...prev, [leave._id]: err.response?.data?.message || fallbackError }));
    }
    setBusyId(null);
  };

  const nameOf = (leave) => leave.collector?.name || 'This collector';
  const rangeOf = (leave) => formatRange(leave.startDate, leave.endDate, today);

  const review = (leave, decision) => {
    if (decision === 'decline' && !window.confirm(`Decline ${nameOf(leave)}'s leave request (${rangeOf(leave)})?`)) return;
    run(
      leave,
      (note) => api.patch(`/leave/${leave._id}/review`, { decision, note }),
      `Could not ${decision} this request.`,
      `${decision === 'approve' ? 'Approved' : 'Declined'} ${nameOf(leave)}'s leave${decision === 'approve' ? '' : ' request'} (${rangeOf(leave)}). They've been notified.`,
    );
  };

  const end = (leave) => {
    const started = leavePhase(leave, today) === 'current';
    const question = started
      ? `End ${nameOf(leave)}'s leave early? They'll be notified and put back on duty from today.`
      : `Cancel ${nameOf(leave)}'s approved leave (${rangeOf(leave)})? They'll be notified.`;
    if (!window.confirm(question)) return;
    run(
      leave,
      (note) => api.patch(`/leave/${leave._id}/end`, { note }),
      'Could not end this leave.',
      `${started ? 'Ended' : 'Cancelled'} ${nameOf(leave)}'s leave. They've been notified.`,
    );
  };

  // Other collectors in the same zone who are (or may be) off on any of these days
  const alsoOff = (leave) => {
    if (!leave.collector) return [];
    return leaves.filter((o) =>
      o._id !== leave._id &&
      o.collector &&
      o.collector._id !== leave.collector._id &&
      o.collector.zone === leave.collector.zone &&
      ['pending', 'upcoming', 'current'].includes(leavePhase(o, today)) &&
      o.startDate <= leave.endDate &&
      o.endDate >= leave.startDate
    );
  };

  const inTab = (leave, tab) => !tab.phases || tab.phases.includes(leavePhase(leave, today));
  const counts = Object.fromEntries(tabs.map((t) => [t.key, leaves.filter((l) => inTab(l, t)).length]));
  const activeTab = tabs.find((t) => t.key === filter);
  const visible = leaves.filter((l) => inTab(l, activeTab));
  // Requests still to happen read soonest first; history stays newest first (the API's order)
  if (filter === 'pending' || filter === 'active') visible.sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <p className="text-sm text-gray-500">Time off collectors have asked for from the Collector app</p>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50 flex items-start gap-3" role="status">
          <p className="flex-1 min-w-0 text-sm text-green-700">{notice}</p>
          <button onClick={() => setNotice('')} className="text-xs text-green-700 hover:underline">Dismiss</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === t.key
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-600 border border-card-border hover:bg-gray-50'
            }`}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading leave requests...</div>
      ) : loadError ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Could not load leave requests.</p>
          <button onClick={fetchLeaves} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white">
            Retry
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-gray-500">{emptyText[filter]}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((leave) => {
            const c = leave.collector;
            const phase = leavePhase(leave, today);
            const pill = leavePill(leave);
            const PillIcon = pillIcons[pill.key] || Hourglass;
            const timing = timingText(leave, today);
            const others = ['pending', 'upcoming', 'current'].includes(phase) ? alsoOff(leave) : [];
            const busy = busyId === leave._id;
            // Approving leave whose last day has gone is refused by the server
            const expired = leave.endDate < today;
            const initials = c?.name ? c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
            return (
              <div key={leave._id} className="bg-white rounded-xl border border-card-border p-5 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {c?.avatar ? (
                      <img src={c.avatar} alt="" className="w-10 h-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 text-sm font-bold">{initials}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      {c ? (
                        <Link to={`/collectors/${c._id}`} className="block text-sm font-semibold text-gray-900 hover:text-accent truncate">
                          {c.name}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-gray-400">Removed collector</p>
                      )}
                      {c && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 min-w-0">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{c.zone || 'No zone'}{c.truck ? ` · ${c.truck}` : ''}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${pill.color}`}>
                    <PillIcon size={12} />
                    {pill.label}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-900 flex items-start gap-1.5">
                    <CalendarDays size={15} className="text-gray-400 shrink-0 mt-0.5" />
                    <span>
                      {rangeOf(leave)}
                      <span className="font-normal text-gray-400"> · {pluralDays(leaveLength(leave))}</span>
                    </span>
                  </p>
                  {timing && (
                    <p className={`text-xs mt-1 ml-[21px] ${phase === 'current' ? 'text-blue-600 font-medium' : expired && phase === 'pending' ? 'text-amber-700' : 'text-gray-500'}`}>
                      {timing}
                    </p>
                  )}
                </div>

                <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-lg p-3 break-words">“{leave.reason}”</p>

                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  <p className="flex items-center gap-1 text-gray-400"><Clock size={11} className="shrink-0" /> Requested {formatStamp(leave.createdAt)}</p>
                  {leave.reviewedAt && (
                    <p>
                      {leave.status === 'declined' ? 'Declined' : 'Approved'} by {leave.reviewedBy?.name || 'an admin'} on {formatStamp(leave.reviewedAt)}
                    </p>
                  )}
                  {leave.status === 'cancelled' && (
                    <p>
                      {leave.cancelledBy === 'collector'
                        ? 'Withdrawn by the collector'
                        : `${leave.startedAt ? 'Ended early' : 'Cancelled'} by ${leave.cancelledByUser?.name || 'an admin'}`}{' '}
                      on {formatStamp(leave.cancelledAt || leave.endedAt || leave.updatedAt)}
                    </p>
                  )}
                  {leave.reviewNote && <p className="text-gray-600 break-words">Note to the collector: “{leave.reviewNote}”</p>}
                </div>

                {others.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50 text-amber-700 text-xs flex items-start gap-2" role="note">
                    <Users size={14} className="shrink-0 mt-px" />
                    <p className="min-w-0">
                      <span className="font-semibold">Also off in {c.zone}:</span>{' '}
                      {others
                        .map((o) => `${o.collector.name} (${shortRange(o.startDate, o.endDate, today)}${o.status === 'pending' ? ', pending' : ''})`)
                        .join(', ')}
                    </p>
                  </div>
                )}

                {/* Actions sit at the bottom so they line up across a row of cards */}
                {leave.status === 'pending' && (
                  <div className="mt-auto pt-4">
                    <label htmlFor={`leave-note-${leave._id}`} className="block text-xs font-medium text-gray-500 mb-1.5">
                      Note to the collector <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      id={`leave-note-${leave._id}`}
                      rows={2}
                      maxLength={500}
                      value={notes[leave._id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [leave._id]: e.target.value }))}
                      className="w-full px-3 py-2 border border-card-border rounded-lg text-sm bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                    {expired && (
                      <p className="text-[11px] text-amber-700 mt-1">These dates have passed, so this request can only be declined.</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => review(leave, 'decline')}
                        disabled={busy}
                        className="flex-1 py-2 rounded-lg text-xs font-medium border border-card-border text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => review(leave, 'approve')}
                        disabled={busy || expired}
                        title={expired ? 'These dates have passed' : undefined}
                        className="flex-1 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
                      >
                        {busy ? 'Working…' : 'Approve'}
                      </button>
                    </div>
                  </div>
                )}

                {(phase === 'upcoming' || phase === 'current') && (
                  <div className="mt-auto pt-4">
                    {noteOpen[leave._id] && (
                      <>
                        <label htmlFor={`leave-note-${leave._id}`} className="block text-xs font-medium text-gray-500 mb-1.5">
                          Note to the collector <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <textarea
                          id={`leave-note-${leave._id}`}
                          rows={2}
                          maxLength={500}
                          autoFocus
                          value={notes[leave._id] || ''}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [leave._id]: e.target.value }))}
                          className="w-full px-3 py-2 mb-3 border border-card-border rounded-lg text-sm bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        />
                      </>
                    )}
                    <div className="flex items-center gap-3">
                      {!noteOpen[leave._id] && (
                        <button
                          onClick={() => setNoteOpen((prev) => ({ ...prev, [leave._id]: true }))}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Add a note
                        </button>
                      )}
                      <button
                        onClick={() => end(leave)}
                        disabled={busy}
                        className="ml-auto px-4 py-2 rounded-lg text-xs font-medium border border-card-border text-red-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {busy ? 'Working…' : phase === 'current' ? 'End leave early' : 'Cancel leave'}
                      </button>
                    </div>
                  </div>
                )}

                {errors[leave._id] && (
                  <p className="text-xs text-red-600 mt-2" role="alert">{errors[leave._id]}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
