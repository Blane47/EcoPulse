import { useState } from 'react';
import { X } from 'lucide-react';
import { zones } from '../../data/mockData';
import { createCollector } from '../../api/collectors';

export default function AddCollectorModal({ isOpen, onClose, onCollectorAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    truck: '',
    zone: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.zone) {
      setError('Name and zone are required.');
      return;
    }

    setSubmitting(true);
    try {
      await createCollector(formData);
      setFormData({ name: '', truck: '', zone: '', status: 'active' });
      onCollectorAdded?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add collector.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl w-full max-w-[480px] shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between p-6 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Collector</h2>
              <p className="text-sm text-gray-500">Register a new field collector for waste collection</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Emmanuel Ngwa"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Truck / Vehicle ID</label>
              <input
                type="text"
                placeholder="e.g. TRK-007"
                value={formData.truck}
                onChange={(e) => handleChange('truck', e.target.value)}
                className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Assigned Zone</label>
              <select
                value={formData.zone}
                onChange={(e) => handleChange('zone', e.target.value)}
                className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Select zone</option>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Status</label>
              <div className="flex gap-3">
                {['active', 'on-leave'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleChange('status', s)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                      formData.status === s
                        ? s === 'active'
                          ? 'border-accent bg-green-50 text-accent'
                          : 'border-warning bg-yellow-50 text-warning'
                        : 'border-card-border text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {s === 'active' ? 'Active' : 'On Leave'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-card-border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
              >
                {submitting ? 'Adding...' : 'Add Collector'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
