import { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Clock, CheckCircle, XCircle, Hourglass, IdCard } from 'lucide-react';
import api from '../api/axios';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Hourglass },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Residents apply from the community app ("Become a Collector"); admins review them here
export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  // Sign-in details for a newly created collector, shown once
  const [credentials, setCredentials] = useState(null);
  // Sign-in emails typed in for older applications that were submitted without one, by application id
  const [emails, setEmails] = useState({});

  const fetchApplications = async () => {
    try {
      const { data } = await api.get('/applications');
      setApplications(data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const replace = (updated) =>
    setApplications((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));

  const approve = async (app) => {
    setBusyId(app._id);
    setError('');
    try {
      const body = app.email ? {} : { email: (emails[app._id] || '').trim() };
      const { data } = await api.post(`/applications/${app._id}/create-collector`, body);
      replace(data.application);
      setCredentials({ name: data.collector.name, email: data.collector.email, temporaryPassword: data.temporaryPassword });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve this application.');
    }
    setBusyId(null);
  };

  const reject = async (app) => {
    if (!window.confirm(`Reject ${app.name}'s application?`)) return;
    setBusyId(app._id);
    setError('');
    try {
      const { data } = await api.put(`/applications/${app._id}`, { status: 'rejected' });
      replace(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject this application.');
    }
    setBusyId(null);
  };

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };
  const visible = applications.filter((a) => filter === 'all' || a.status === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Collector Applications</h1>
        <p className="text-sm text-gray-500">Residents who applied to join the collection team from the community app</p>
      </div>

      {credentials && (
        <div className="mb-6 p-4 rounded-xl border border-green-200 bg-green-50 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">{credentials.name} is now a collector</p>
            <p className="text-xs text-green-700 mt-0.5">
              Give {credentials.name} these sign-in details for the EcoPulse Collector app. They'll choose their own
              password when they first sign in. The temporary password won't be shown again.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 min-w-0">
            <div className="bg-white rounded-lg border border-green-200 px-3 py-2 min-w-0">
              <p className="text-[10px] text-gray-400 font-medium uppercase">Email</p>
              <p className="text-sm font-semibold text-gray-900 break-all">{credentials.email}</p>
            </div>
            <div className="bg-white rounded-lg border border-green-200 px-3 py-2">
              <p className="text-[10px] text-gray-400 font-medium uppercase">Temporary password</p>
              <p className="text-sm font-bold text-green-700 font-mono tracking-wider select-all">{credentials.temporaryPassword}</p>
            </div>
          </div>
          <button onClick={() => setCredentials(null)} className="text-xs text-green-700 hover:underline self-start sm:self-center">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-600 border border-card-border hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All' : f} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading applications...</div>
      ) : loadError ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Could not load applications.</p>
          <button onClick={fetchApplications} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white">
            Retry
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {filter === 'pending' ? 'No applications waiting for review' : 'No applications here'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((app) => {
            const sc = statusConfig[app.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            // Older applications have no email; the admin must supply the one they'll sign in with
            const needsEmail = !app.email;
            const typedEmail = (emails[app._id] || '').trim();
            return (
              <div key={app._id} className="bg-white rounded-xl border border-card-border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-sm font-bold">{app.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{app.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone size={11} className="shrink-0" /> {app.phone}
                      </p>
                      <p className={`text-xs flex items-center gap-1 min-w-0 ${needsEmail && app.status === 'pending' ? 'text-amber-700' : 'text-gray-400'}`}>
                        <Mail size={11} className="shrink-0" />
                        <span className="truncate">{app.email || 'No email'}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                    <StatusIcon size={12} />
                    {sc.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin size={12} /> Prefers {app.zone}</span>
                  <span className="flex items-center gap-1">
                    <IdCard size={12} /> {app.hasLicense ? "Has a driver's licence" : "No driver's licence"}
                  </span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(app.createdAt)}</span>
                </div>

                {app.motivation && (
                  <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-lg p-3">“{app.motivation}”</p>
                )}

                {app.status === 'pending' && needsEmail && (
                  <div className="mt-4">
                    <label htmlFor={`app-email-${app._id}`} className="block text-xs font-medium text-gray-500 mb-1.5">
                      Sign-in email for the Collector app
                    </label>
                    <input
                      id={`app-email-${app._id}`}
                      type="email"
                      autoComplete="off"
                      placeholder="e.g. name@ecopulse.cm"
                      value={emails[app._id] || ''}
                      onChange={(e) => setEmails((prev) => ({ ...prev, [app._id]: e.target.value }))}
                      className="w-full px-3 py-2 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">This application was sent without an email. Add one to approve it.</p>
                  </div>
                )}

                {app.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => reject(app)}
                      disabled={busyId === app._id}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border border-card-border text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approve(app)}
                      disabled={busyId === app._id || (needsEmail && !typedEmail)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
                    >
                      {busyId === app._id ? 'Working…' : 'Approve & create account'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
