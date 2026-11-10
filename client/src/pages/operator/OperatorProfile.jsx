import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Check } from 'lucide-react';
import { useOperatorAuth } from '../../context/OperatorAuthContext';
import { getMe, updateOperatorProfile } from '../../api/operatorPortal';

const ZONES = ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'];
const VEHICLES = [
  { key: 'pickup', label: 'Pickup' },
  { key: 'tricycle', label: 'Tricycle' },
  { key: 'van', label: 'Van' },
];
const WASTE = [
  { key: 'household', label: 'Household' },
  { key: 'bulky', label: 'Bulky' },
  { key: 'recyclables', label: 'Recyclables' },
  { key: 'garden', label: 'Garden' },
];
const LOADS = [
  { key: 'small', label: 'Small' },
  { key: 'medium', label: 'Medium' },
  { key: 'large', label: 'Large' },
];

const num = (v, d = 0) => (v === '' || v == null ? d : Number(v));

export default function OperatorProfile() {
  const navigate = useNavigate();
  const { operator, refresh } = useOperatorAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setForm({
          businessName: me.businessName || '', ownerName: me.ownerName || '', phone: me.phone || '',
          description: me.description || '', rccmNumber: me.rccmNumber || '',
          baseFee: me.baseFee ?? 1500, commercialRate: me.commercialRate ?? 5000,
          zonesServed: me.zonesServed || [], vehicleTypes: me.vehicleTypes || [],
          pricing: {
            household: me.pricing?.household ?? '', bulky: me.pricing?.bulky ?? '',
            recyclables: me.pricing?.recyclables ?? '', garden: me.pricing?.garden ?? '',
          },
          loadSurcharge: {
            small: me.loadSurcharge?.small ?? 0, medium: me.loadSurcharge?.medium ?? 500, large: me.loadSurcharge?.large ?? 1500,
          },
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load your profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k) => (e) => { setSaved(false); setForm((f) => ({ ...f, [k]: e.target.value })); };
  const setNested = (group, k) => (e) => { setSaved(false); setForm((f) => ({ ...f, [group]: { ...f[group], [k]: e.target.value } })); };
  const toggle = (k, v) => { setSaved(false); setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] })); };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        businessName: form.businessName, ownerName: form.ownerName, phone: form.phone,
        description: form.description, rccmNumber: form.rccmNumber,
        baseFee: num(form.baseFee, 1500), commercialRate: num(form.commercialRate, 5000),
        zonesServed: form.zonesServed, vehicleTypes: form.vehicleTypes,
        pricing: {
          household: num(form.pricing.household, undefined), bulky: num(form.pricing.bulky, undefined),
          recyclables: num(form.pricing.recyclables, undefined), garden: num(form.pricing.garden, undefined),
        },
        loadSurcharge: {
          small: num(form.loadSurcharge.small), medium: num(form.loadSurcharge.medium), large: num(form.loadSurcharge.large),
        },
      };
      const updated = await updateOperatorProfile(operator._id, payload);
      refresh(updated);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save. Check the values and try again.');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-3 py-2.5 border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30';
  const chip = (active) =>
    `px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
      active ? 'bg-accent text-white border-accent' : 'bg-white text-gray-600 border-card-border hover:bg-gray-50'
    }`;
  const Section = ({ title, children }) => (
    <div className="bg-white rounded-xl border border-card-border p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-card-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/operator')} className="text-gray-400 hover:text-gray-700" title="Back">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="font-bold text-gray-900 leading-tight">Business Profile & Pricing</div>
            <div className="text-xs text-gray-500">{operator?.businessName}</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading && <div className="text-center py-16 text-gray-400">Loading…</div>}
        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        {form && (
          <form onSubmit={save} className="space-y-5">
            <Section title="Business details">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Business name</label>
                  <input className={field} value={form.businessName} onChange={set('businessName')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Owner name</label>
                  <input className={field} value={form.ownerName} onChange={set('ownerName')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone</label>
                  <input className={field} value={form.phone} onChange={set('phone')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">RCCM number</label>
                  <input className={field} value={form.rccmNumber} onChange={set('rccmNumber')} />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description</label>
                <textarea className={`${field} resize-none`} rows={2} value={form.description} onChange={set('description')} />
              </div>
            </Section>

            <Section title="Coverage & fleet">
              <label className="block text-xs font-semibold text-gray-500 mb-2">Zones served</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {ZONES.map((z) => (
                  <button type="button" key={z} className={chip(form.zonesServed.includes(z))} onClick={() => toggle('zonesServed', z)}>{z}</button>
                ))}
              </div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Vehicle types</label>
              <div className="flex flex-wrap gap-2">
                {VEHICLES.map((v) => (
                  <button type="button" key={v.key} className={chip(form.vehicleTypes.includes(v.key))} onClick={() => toggle('vehicleTypes', v.key)}>{v.label}</button>
                ))}
              </div>
            </Section>

            <Section title="Pricing (FCFA)">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Base fee</label>
                  <input type="number" min="0" className={field} value={form.baseFee} onChange={set('baseFee')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Commercial rate</label>
                  <input type="number" min="0" className={field} value={form.commercialRate} onChange={set('commercialRate')} />
                </div>
              </div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Per waste type (blank = use base fee)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {WASTE.map((w) => (
                  <div key={w.key}>
                    <label className="block text-[11px] text-gray-400 mb-1">{w.label}</label>
                    <input type="number" min="0" className={field} value={form.pricing[w.key]} onChange={setNested('pricing', w.key)} placeholder="—" />
                  </div>
                ))}
              </div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Load-size surcharge</label>
              <div className="grid grid-cols-3 gap-3">
                {LOADS.map((l) => (
                  <div key={l.key}>
                    <label className="block text-[11px] text-gray-400 mb-1">{l.label}</label>
                    <input type="number" min="0" className={field} value={form.loadSurcharge[l.key]} onChange={setNested('loadSurcharge', l.key)} />
                  </div>
                ))}
              </div>
            </Section>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saved && <span className="flex items-center gap-1 text-sm text-accent font-medium"><Check size={16} /> Saved</span>}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
