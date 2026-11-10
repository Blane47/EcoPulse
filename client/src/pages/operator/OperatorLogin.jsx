import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { useOperatorAuth } from '../../context/OperatorAuthContext';
import { loginOperator } from '../../api/operatorPortal';

export default function OperatorLogin() {
  const { onLogin } = useOperatorAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { operator, token } = await loginOperator(email.trim(), password);
      onLogin(operator, token);
      navigate('/operator');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-card-border shadow-sm p-7">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-3">
            <Truck size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Operator Portal</h1>
          <p className="text-sm text-gray-500">EcoPulse private operators — Buea</p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="ops@yourbusiness.cm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-5">
          New operator?{' '}
          <Link to="/operator/register" className="text-accent font-medium hover:underline">Register your business</Link>
        </p>
      </div>
    </div>
  );
}
