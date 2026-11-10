import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, LogOut, MapPin, Star, Package, RefreshCw, Settings } from 'lucide-react';
import { useOperatorAuth } from '../../context/OperatorAuthContext';
import {
  getMe, getJobs, getMyCollectors, acceptJob, advanceJob, updateOperatorProfile,
} from '../../api/operatorPortal';

const STATUS = {
  requested: { label: 'Requested', c: '#f59e0b' },
  accepted: { label: 'Accepted', c: '#2563eb' },
  en_route: { label: 'On the way', c: '#2563eb' },
  picked_up: { label: 'Picked up', c: '#7c3aed' },
  completed: { label: 'Completed', c: '#22c55e' },
  cancelled: { label: 'Cancelled', c: '#64748b' },
  declined: { label: 'Declined', c: '#ef4444' },
};
const ADVANCE = { accepted: 'en_route', en_route: 'picked_up', picked_up: 'completed' };
const ADVANCE_LABEL = { en_route: 'Start Route', picked_up: 'Mark Picked Up', completed: 'Complete Job' };
const WASTE = { household: 'Household', bulky: 'Bulky', recyclables: 'Recyclables', garden: 'Garden' };
const money = (n) => `${Number(n || 0).toLocaleString()} FCFA`;

function Badge({ status }) {
  const s = STATUS[status] || STATUS.requested;
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: `${s.c}22`, color: s.c }}>
      {s.label}
    </span>
  );
}

export default function OperatorDashboard() {
  const { operator, onLogout, refresh } = useOperatorAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [assign, setAssign] = useState({}); // jobId -> collectorId
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const accepting = operator?.acceptingRequests !== false;

  const load = useCallback(async () => {
    try {
      const [js, cs, me] = await Promise.all([getJobs(), getMyCollectors(), getMe().catch(() => null)]);
      setJobs(Array.isArray(js) ? js : []);
      setCollectors(Array.isArray(cs) ? cs : []);
      if (me) refresh(me);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your jobs.');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => { load(); }, [load]);

  const doAccept = async (job) => {
    const collectorId = assign[job._id] || collectors[0]?._id;
    if (!collectorId) { setError('Add a collector to your team before accepting jobs.'); return; }
    setBusyId(job._id);
    try { await acceptJob(job._id, collectorId); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Could not accept the job.'); }
    finally { setBusyId(null); }
  };

  const doDecline = async (job) => {
    setBusyId(job._id);
    try { await advanceJob(job._id, 'declined'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Could not decline the job.'); }
    finally { setBusyId(null); }
  };

  const doAdvance = async (job) => {
    const next = ADVANCE[job.status];
    if (!next) return;
    setBusyId(job._id);
    try { await advanceJob(job._id, next); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Could not update the job.'); }
    finally { setBusyId(null); }
  };

  const toggleAccepting = async () => {
    if (!operator?._id) return;
    try {
      const updated = await updateOperatorProfile(operator._id, { acceptingRequests: !accepting });
      refresh(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update availability.');
    }
  };

  const incoming = jobs.filter((j) => j.status === 'requested');
  const active = jobs.filter((j) => ['accepted', 'en_route', 'picked_up'].includes(j.status));
  const closed = jobs.filter((j) => ['completed', 'cancelled', 'declined'].includes(j.status));

  const JobCard = ({ job, children }) => (
    <div className="bg-white rounded-xl border border-card-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-gray-900">{job.residentName || 'Resident'}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {WASTE[job.wasteType] || job.wasteType} · {job.loadSize} · {money(job.fee)}
          </div>
        </div>
        <Badge status={job.status} />
      </div>
      {(job.location?.address || job.location?.zone) && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
          <MapPin size={12} /> {job.location?.address || job.location?.zone}
        </div>
      )}
      {job.note && <div className="text-xs text-gray-500 italic mt-1">“{job.note}”</div>}
      {job.collector?.name && <div className="text-xs text-gray-600 mt-2">Collector: {job.collector.name}</div>}
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-card-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Truck size={20} />
            </div>
            <div>
              <div className="font-bold text-gray-900 leading-tight">{operator?.businessName || 'Operator'}</div>
              <div className="text-xs text-gray-500">Operator Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAccepting}
              className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
                accepting ? 'bg-accent/10 text-accent border-accent/30' : 'bg-gray-100 text-gray-500 border-card-border'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${accepting ? 'bg-accent' : 'bg-gray-400'}`} />
              {accepting ? 'Accepting jobs' : 'Not accepting'}
            </button>
            <button onClick={() => navigate('/operator/settings')} className="text-gray-400 hover:text-accent" title="Profile & pricing">
              <Settings size={18} />
            </button>
            <button onClick={onLogout} className="text-gray-400 hover:text-red-500" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { k: 'Incoming', v: incoming.length },
            { k: 'Active', v: active.length },
            { k: 'Rating', v: operator?.reviewCount ? operator.rating?.toFixed(1) : '—', icon: Star },
            { k: 'Completed', v: operator?.pickupsCompleted || 0, icon: Package },
          ].map((c) => (
            <div key={c.k} className="bg-white rounded-xl border border-card-border p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-400">{c.k}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{c.v}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Jobs</h2>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {loading && <div className="text-center py-16 text-gray-400">Loading…</div>}

        {!loading && (
          <div className="grid md:grid-cols-3 gap-5">
            {/* Incoming */}
            <section>
              <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Incoming ({incoming.length})</h3>
              <div className="space-y-3">
                {incoming.length === 0 && <p className="text-sm text-gray-400">No new requests.</p>}
                {incoming.map((job) => (
                  <JobCard key={job._id} job={job}>
                    <div className="mt-3 space-y-2">
                      <select
                        value={assign[job._id] || collectors[0]?._id || ''}
                        onChange={(e) => setAssign((a) => ({ ...a, [job._id]: e.target.value }))}
                        className="w-full text-sm border border-card-border rounded-lg px-2 py-2 bg-white"
                      >
                        {collectors.length === 0 && <option value="">No collectors on your team</option>}
                        {collectors.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}{c.onDuty ? ' · on duty' : ''}</option>
                        ))}
                      </select>
                      <button
                        disabled={busyId === job._id || collectors.length === 0}
                        onClick={() => doAccept(job)}
                        className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Accept & Assign
                      </button>
                      <button
                        disabled={busyId === job._id}
                        onClick={() => doDecline(job)}
                        className="w-full py-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </JobCard>
                ))}
              </div>
            </section>

            {/* Active */}
            <section>
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Active ({active.length})</h3>
              <div className="space-y-3">
                {active.length === 0 && <p className="text-sm text-gray-400">Nothing in progress.</p>}
                {active.map((job) => (
                  <JobCard key={job._id} job={job}>
                    <button
                      disabled={busyId === job._id}
                      onClick={() => doAdvance(job)}
                      className="w-full mt-3 py-2 border border-accent text-accent rounded-lg text-sm font-medium hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                    >
                      {ADVANCE_LABEL[ADVANCE[job.status]]}
                    </button>
                  </JobCard>
                ))}
              </div>
            </section>

            {/* Closed */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Completed ({closed.length})</h3>
              <div className="space-y-3">
                {closed.length === 0 && <p className="text-sm text-gray-400">No finished jobs yet.</p>}
                {closed.slice(0, 12).map((job) => <JobCard key={job._id} job={job} />)}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
