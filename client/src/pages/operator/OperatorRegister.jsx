import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, CheckCircle2 } from 'lucide-react';
import { registerOperator } from '../../api/operatorPortal';

const ZONES = ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'];
const VEHICLES = [
  { key: 'pickup', label: 'Pickup' },
  { key: 'tricycle', label: 'Tricycle' },
  { key: 'van', label: 'Van' },
];

export default function OperatorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: '', ownerName: '', email: '', password: '', phone: '',
    description: '', baseFee: 1500, rccmNumber: '',
  });
  const [zonesServed, setZonesServed] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.businessName.trim() || !form.ownerName.trim() || !form.email.trim() || !form.password) {
      setError('Business name, owner name, email and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await registerOperator({
        ...form,
        baseFee: Number(form.baseFee) || 1500,
        zonesServed,
        vehicleTypes,
      });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit your application. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-card-border shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-accent mx-auto mb-4">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Application submitted</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your business is now <strong>pending review</strong> by the municipal council. Once approved,
            you can sign in and start receiving pickup requests.
          </p>
          <button
            onClick={() => navigate('/operator/login')}
            className="mt-6 w-full py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  const field = 'w-full px-3 py-2.5 border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30';
  const chip = (active) =>
    `px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
      active ? 'bg-accent text-white border-accent' : 'bg-white text-gray-600 border-card-border hover:bg-gray-50'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="w-full max-w-lg mx-auto bg-white rounded-2xl border border-card-border shadow-sm p-7">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-3">
            <Truck size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Register your business</h1>
          <p className="text-sm text-gray-500 text-center">Join EcoPulse as a private waste-collection operator in Buea</p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Business name *</label>
              <input className={field} value={form.businessName} onChange={set('businessName')} placeholder="Trash Vallet" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Owner name *</label>
              <input className={field} value={form.ownerName} onChange={set('ownerName')} placeholder="Jane Doe" required />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email *</label>
              <input type="email" className={field} value={form.email} onChange={set('email')} placeholder="ops@business.cm" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone</label>
              <input className={field} value={form.phone} onChange={set('phone')} placeholder="+237 6XX XXX XXX" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Password *</label>
              <input type="password" className={field} value={form.password} onChange={set('password')} placeholder="At least 6 characters" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Base fee (FCFA)</label>
              <input type="number" min="0" className={field} value={form.baseFee} onChange={set('baseFee')} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Zones you serve</label>
            <div className="flex flex-wrap gap-2">
              {ZONES.map((z) => (
                <button type="button" key={z} className={chip(zonesServed.includes(z))} onClick={() => toggle(zonesServed, setZonesServed, z)}>
                  {z}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Vehicle types</label>
            <div className="flex flex-wrap gap-2">
              {VEHICLES.map((v) => (
                <button type="button" key={v.key} className={chip(vehicleTypes.includes(v.key))} onClick={() => toggle(vehicleTypes, setVehicleTypes, v.key)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">RCCM number (optional)</label>
            <input className={field} value={form.rccmNumber} onChange={set('rccmNumber')} placeholder="RC/BUE/2025/A/123" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Short description</label>
            <textarea className={`${field} resize-none`} rows={3} value={form.description} onChange={set('description')} placeholder="What makes your service stand out?" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-5">
          Already registered?{' '}
          <Link to="/operator/login" className="text-accent font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
