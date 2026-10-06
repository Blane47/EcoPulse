import { useState, useEffect } from 'react';
import { X, Truck } from 'lucide-react';
import { getCollectors, updateCollector } from '../../api/collectors';

const sameTruck = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Trucks are free-text IDs on the collector; the list of trucks already in use is
// offered as suggestions so the same truck isn't typed two different ways.
// Mounted only while open, so the field starts from the collector's current truck.
export default function AssignTruckModal({ onClose, collector, onUpdated }) {
  const [truck, setTruck] = useState(collector.truck || '');
  const [others, setOthers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCollectors()
      .then((list) => setOthers(list.filter((c) => c._id !== collector._id && c.truck)))
      .catch(() => setOthers([]));
  }, [collector._id]);

  const current = collector.truck || '';
  const trimmed = truck.trim();
  const fleet = [...new Set(others.map((c) => c.truck.trim()))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sharedWith = trimmed ? others.filter((c) => sameTruck(c.truck, trimmed)) : [];
  const unchanged = trimmed === current.trim();

  const save = async (value) => {
    setSaving(true);
    setError('');
    try {
      await updateCollector(collector._id, { truck: value });
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the truck.');
    }
    setSaving(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (unchanged) return onClose();
    // Reuse the existing spelling when the admin picks a truck that's already in the fleet
    const match = fleet.find((t) => sameTruck(t, trimmed));
    save(match || trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-card-border">
          <div>
            <h3 className="text-base font-bold text-gray-900">Assign Truck</h3>
            <p className="text-xs text-gray-400 mt-0.5">{collector.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Current Truck */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider mb-1">Current Truck</p>
          <p className="text-sm font-semibold text-gray-700">{current || 'Not assigned'}</p>
        </div>

        <div className="px-5 py-3">
          <label htmlFor="assign-truck" className="block text-[10px] text-gray-400 uppercase font-medium tracking-wider mb-2">
            Truck / Vehicle ID
          </label>
          <input
            id="assign-truck"
            list="assign-truck-fleet"
            autoComplete="off"
            autoFocus
            placeholder="e.g. Truck #204"
            value={truck}
            onChange={(e) => setTruck(e.target.value)}
            className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <datalist id="assign-truck-fleet">
            {fleet.map((t) => <option key={t} value={t} />)}
          </datalist>

          {fleet.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider mb-2">Trucks in use</p>
              <div className="flex flex-wrap gap-1.5">
                {fleet.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTruck(t)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      sameTruck(t, truck) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Truck size={11} /> {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sharedWith.length > 0 && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Also assigned to {sharedWith.map((c) => c.name).join(', ')}. Both will be listed on this truck.
            </p>
          )}
          {error && <p className="mt-3 text-xs text-red-600" role="alert">{error}</p>}

          {current && (
            <button
              type="button"
              onClick={() => save('')}
              disabled={saving}
              className="mt-3 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Remove truck
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t border-card-border">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-card-border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !trimmed || unchanged}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
          >
            {saving ? 'Saving...' : 'Assign Truck'}
          </button>
        </div>
      </form>
    </div>
  );
}
