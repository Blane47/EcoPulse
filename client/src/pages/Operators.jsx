import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Ban, Truck, Star, MapPin, Package } from 'lucide-react';
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
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                {op.logoUrl ? (
                  <img src={op.logoUrl} alt={op.businessName} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <Truck size={22} />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{op.businessName}</h3>
                  <p className="text-xs text-gray-500 truncate">{op.ownerName}</p>
                </div>
              </div>
              <Badge variant={STATUS_BADGE[op.status] || 'default'}>{STATUS_LABEL[op.status] || op.status}</Badge>
            </div>

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
    </div>
  );
}
