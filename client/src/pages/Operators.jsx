import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Ban, Truck, Star, MapPin, Package, X, Phone, Mail, FileText, Calendar } from 'lucide-react';
import Badge from '../components/ui/Badge';
import {
  getOperators,
  approveOperator,
  rejectOperator,
  suspendOperator,
} from '../api/operators';

// Super-admin view: private waste-collection operators (e.g. "Trash Vallet") that
// self-register on the platform. The municipal council approves, rejects or suspends
// them here before they can receive on-demand resident pickup requests.

const STATUS_BADGE = {
  approved: 'success',
  pending: 'warning',
  suspended: 'danger',
  rejected: 'default',
};

const STATUS_LABEL = {
  approved: 'Approved',
  pending: 'Pending review',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'rejected', label: 'Rejected' },
];

const money = (n) => `${Number(n || 0).toLocaleString()} FCFA`;

export default function Operators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const fetchOperators = async () => {
    try {
      const data = await getOperators();
      setOperators(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Operators fetch error:', err);
      setError('Could not load operators. Make sure you are signed in as an administrator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const runAction = async (id, action) => {
    setBusyId(id);
    setError('');
    try {
      await action(id);
      await fetchOperators();
    } catch (err) {
      console.error('Operator action error:', err);
      setError(err.response?.data?.message || 'That action failed. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const counts = operators.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const shown = filter === 'all' ? operators : operators.filter((o) => o.status === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Private Operators</h1>
        <p className="text-sm text-gray-500">
          Review and manage private waste-collection businesses serving Buea Municipality
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <span className="px-3 py-1.5 bg-white border border-card-border rounded-full text-sm text-gray-600">
          Total: <strong>{operators.length}</strong>
        </span>
        <span className="px-3 py-1.5 bg-white border border-card-border rounded-full text-sm text-gray-600">
          Pending: <strong>{counts.pending || 0}</strong>
        </span>
        <span className="px-3 py-1.5 bg-white border border-card-border rounded-full text-sm text-gray-600">
          Approved: <strong>{counts.approved || 0}</strong>
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f.key
                ? 'bg-accent text-white border-accent'
                : 'bg-white text-gray-600 border-card-border hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {loading && <div className="text-center py-20 text-gray-400">Loading operators...</div>}
      {!loading && shown.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          {operators.length === 0 ? 'No operators have registered yet.' : 'No operators match this filter.'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((op) => (
          <div key={op._id} className="bg-white rounded-card border border-card-border p-5 flex flex-col hover:shadow-md transition-shadow">
            <button
              type="button"
              onClick={() => setDetail(op)}
              className="flex items-start justify-between mb-4 text-left w-full"
              title="View details"
            >
              <div className="flex items-center gap-3 min-w-0">
                {op.logoUrl ? (
                  <img src={op.logoUrl} alt={op.businessName} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <Truck size={22} />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate hover:text-accent transition-colors">{op.businessName}</h3>
                  <p className="text-xs text-gray-500 truncate">{op.ownerName}</p>
                </div>
              </div>
              <Badge variant={STATUS_BADGE[op.status] || 'default'}>{STATUS_LABEL[op.status] || op.status}</Badge>
            </button>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {(op.zonesServed || []).map((z) => (
                <span key={z} className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  <MapPin size={10} /> {z}
                </span>
              ))}
              {(op.zonesServed || []).length === 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">No zones set</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase">Base fee</p>
                <p className="text-sm font-bold text-gray-900">{money(op.baseFee)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase flex items-center justify-center gap-0.5">
                  <Star size={10} /> Rating
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {op.reviewCount ? `${op.rating?.toFixed(1)} (${op.reviewCount})` : '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase flex items-center justify-center gap-0.5">
                  <Package size={10} /> Pickups
                </p>
                <p className="text-sm font-bold text-gray-900">{op.pickupsCompleted || 0}</p>
              </div>
            </div>

            <div className="mt-auto flex gap-2">
              {op.status === 'pending' && (
                <>
                  <button
                    disabled={busyId === op._id}
                    onClick={() => runAction(op._id, approveOperator)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                  <button
                    disabled={busyId === op._id}
                    onClick={() => runAction(op._id, rejectOperator)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </>
              )}
              {op.status === 'approved' && (
                <button
                  disabled={busyId === op._id}
                  onClick={() => runAction(op._id, suspendOperator)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Ban size={15} /> Suspend
                </button>
              )}
              {(op.status === 'suspended' || op.status === 'rejected') && (
                <button
                  disabled={busyId === op._id}
                  onClick={() => runAction(op._id, approveOperator)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-accent text-accent rounded-lg text-sm font-medium hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={15} /> Re-approve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-card-border sticky top-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  {detail.logoUrl ? <img src={detail.logoUrl} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <Truck size={22} />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{detail.businessName}</h3>
                  <p className="text-xs text-gray-500">{detail.ownerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE[detail.status] || 'default'}>{STATUS_LABEL[detail.status] || detail.status}</Badge>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
            </div>

            <div className="p-5 space-y-5 text-sm">
              {detail.description && <p className="text-gray-600">{detail.description}</p>}

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-gray-600"><Mail size={14} className="text-gray-400" /> {detail.email || '—'}</div>
                <div className="flex items-center gap-2 text-gray-600"><Phone size={14} className="text-gray-400" /> {detail.phone || '—'}</div>
              </div>

              {/* Coverage */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Coverage &amp; fleet</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(detail.zonesServed || []).map((z) => (
                    <span key={z} className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"><MapPin size={10} /> {z}</span>
                  ))}
                  {(detail.zonesServed || []).length === 0 && <span className="text-xs text-gray-400">No zones set</span>}
                </div>
                <p className="text-gray-600 text-xs">
                  {(detail.vehicleTypes || []).join(', ') || 'No vehicles listed'}{detail.vehicleCount ? ` · ${detail.vehicleCount} vehicle(s)` : ''}
                </p>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Pricing</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-2"><span className="text-gray-500">Base fee</span><span className="font-semibold text-gray-900">{money(detail.baseFee)}</span></div>
                  <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-2"><span className="text-gray-500">Commercial</span><span className="font-semibold text-gray-900">{money(detail.commercialRate)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['household', 'bulky', 'recyclables', 'garden'].map((w) => (
                    <div key={w} className="flex justify-between px-3 py-1.5">
                      <span className="text-gray-500 capitalize">{w}</span>
                      <span className="text-gray-900">{detail.pricing?.[w] != null ? money(detail.pricing[w]) : money(detail.baseFee)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Load surcharge — small {money(detail.loadSurcharge?.small)} · medium {money(detail.loadSurcharge?.medium)} · large {money(detail.loadSurcharge?.large)}
                </p>
              </div>

              {/* Verification + stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-gray-600"><FileText size={14} className="text-gray-400" /> {detail.rccmNumber || 'No RCCM'}</div>
                <div className="flex items-center gap-2 text-gray-600"><Star size={14} className="text-gray-400" /> {detail.reviewCount ? `${detail.rating?.toFixed(1)} (${detail.reviewCount})` : 'No ratings'}</div>
                <div className="flex items-center gap-2 text-gray-600"><Package size={14} className="text-gray-400" /> {detail.pickupsCompleted || 0} pickups</div>
                <div className="flex items-center gap-2 text-gray-600"><Calendar size={14} className="text-gray-400" /> {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : '—'}</div>
              </div>
              {detail.licenseUrl && (
                <a href={detail.licenseUrl} target="_blank" rel="noreferrer" className="inline-block text-accent text-sm font-medium hover:underline">View licence document</a>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-card-border">
                {detail.status === 'pending' && (
                  <>
                    <button disabled={busyId === detail._id} onClick={() => runAction(detail._id, approveOperator).then(() => setDetail(null))} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"><CheckCircle2 size={15} /> Approve</button>
                    <button disabled={busyId === detail._id} onClick={() => runAction(detail._id, rejectOperator).then(() => setDetail(null))} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"><XCircle size={15} /> Reject</button>
                  </>
                )}
                {detail.status === 'approved' && (
                  <button disabled={busyId === detail._id} onClick={() => runAction(detail._id, suspendOperator).then(() => setDetail(null))} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"><Ban size={15} /> Suspend</button>
                )}
                {(detail.status === 'suspended' || detail.status === 'rejected') && (
                  <button disabled={busyId === detail._id} onClick={() => runAction(detail._id, approveOperator).then(() => setDetail(null))} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-accent text-accent rounded-lg text-sm font-medium hover:bg-accent hover:text-white disabled:opacity-50"><CheckCircle2 size={15} /> Re-approve</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
