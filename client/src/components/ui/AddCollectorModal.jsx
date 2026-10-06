import { useState } from 'react';
import { X } from 'lucide-react';
import { zones } from '../../data/mockData';
import { createCollector } from '../../api/collectors';

const emptyForm = () => ({ name: '', email: '', phone: '', truck: '', zone: '', status: 'active' });

export default function AddCollectorModal({ isOpen, onClose, onCollectorAdded }) {
  const [formData, setFormData] = useState(emptyForm);
  // Sign-in details shown once after creation so the admin can hand them to the collector
  const [created, setCreated] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const close = () => {
    setCreated(null);
    setFormData(emptyForm());
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.zone) {
      setError('Name, email and zone are required.');
      return;
    }

    setSubmitting(true);
    try {
      // The server generates the temporary password; leave phone out when blank (it's optional)
      const { phone, ...rest } = formData;
      const { collector, temporaryPassword } = await createCollector(phone.trim() ? formData : rest);
      setCreated({ name: collector.name, email: collector.email, temporaryPassword });
      onCollectorAdded?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add collector.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

      <div className="relative bg-white rounded-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl">
        {created ? (
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900">Collector added</h2>
            <p className="text-sm text-gray-500 mt-1">
              Give {created.name} these sign-in details for the EcoPulse Collector app. They'll choose their own
              password when they first sign in. The temporary password won't be shown again.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 border border-card-border rounded-lg p-3 min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase">Email</p>
                <p className="text-sm font-semibold text-gray-900 mt-1 break-all">{created.email}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase">Temporary password</p>
                <p className="text-lg font-bold text-green-700 mt-0.5 font-mono tracking-wider break-all select-all">
                  {created.temporaryPassword}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-full mt-6 py-2.5 text-white rounded-lg text-sm font-medium shadow-md"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
            >
              Done
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between p-6 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Collector</h2>
              <p className="text-sm text-gray-500">Register a new field collector for waste collection</p>
            </div>
            <button type="button" onClick={close} className="text-gray-400 hover:text-gray-600 transition-colors">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="collector-email" className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Email</label>
                <input
                  id="collector-email"
                  type="email"
                  autoComplete="off"
                  required
                  placeholder="e.g. emmanuel@ecopulse.cm"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
                <p className="text-[11px] text-gray-400 mt-1">They sign in to the Collector app with this</p>
              </div>
              <div>
                <label htmlFor="collector-phone" className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Phone <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="collector-phone"
                  type="tel"
                  placeholder="e.g. 670 000 001"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
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
                onClick={close}
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
        )}
      </div>
    </div>
  );
}
