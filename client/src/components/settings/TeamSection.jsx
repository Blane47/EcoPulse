import { useState, useEffect } from 'react';
import { Users, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { Section, Message, inputClass } from './SettingsSection';

// Temporary password for a new staff account; no look-alike characters (0/O, 1/l/I)
const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => chars[n % chars.length]).join('');
};

// Dashboard staff accounts: list, add (with a one-time temporary password) and remove
export default function TeamSection({ currentUserId }) {
  const [members, setMembers] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(randomPassword);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);
  // Sign-in details for the account just created, shown once
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/users')
      .then(({ data }) => !cancelled && setMembers(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const addMember = async (e) => {
    e.preventDefault();
    setMessage(null);
    setCreated(null);
    setAdding(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      setMembers((prev) => [...prev, data.user]);
      setCreated({ name: data.user.name, email: data.user.email, password });
      setName('');
      setEmail('');
      setPassword(randomPassword());
    } catch (err) {
      setMessage({ ok: false, text: err.response?.data?.message || 'Could not add this person.' });
    }
    setAdding(false);
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.name}'s dashboard access?`)) return;
    setMessage(null);
    try {
      await api.delete(`/users/${member._id}`);
      setMembers((prev) => prev.filter((m) => m._id !== member._id));
    } catch (err) {
      setMessage({ ok: false, text: err.response?.data?.message || 'Could not remove this person.' });
    }
  };

  return (
    <Section icon={Users} title="Team" description="People who can sign in to this dashboard. Everyone here has full admin access.">
      {loadError ? (
        <p className="text-sm text-red-600">Could not load the team.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-card-border rounded-lg mb-5">
          {members.map((m) => (
            <li key={m._id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-green-50 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {m.name}
                  {m._id === currentUserId && <span className="ml-2 text-xs font-normal text-gray-400">You</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">{m.email}</p>
              </div>
              {m._id !== currentUserId && (
                <button
                  onClick={() => removeMember(m)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 transition-colors"
                  aria-label={`Remove ${m.name}`}
                  title="Remove access"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {created && (
        <div className="mb-5 p-4 rounded-lg border border-green-200 bg-green-50" role="status">
          <p className="text-sm font-semibold text-green-800">{created.name} can now sign in</p>
          <p className="text-xs text-green-700 mt-0.5">
            Send them these details and ask them to change the password in Settings. The password won't be shown again.
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-white rounded-lg border border-green-200 px-3 py-2 min-w-0">
              <p className="text-[10px] text-gray-400 font-medium uppercase">Email</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{created.email}</p>
            </div>
            <div className="bg-white rounded-lg border border-green-200 px-3 py-2">
              <p className="text-[10px] text-gray-400 font-medium uppercase">Temporary password</p>
              <p className="text-sm font-bold text-green-700 font-mono">{created.password}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={addMember} className="space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase">Add someone</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="team-name" className="block text-xs text-gray-500 mb-1.5">Full name</label>
            <input id="team-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="team-email" className="block text-xs text-gray-500 mb-1.5">Email</label>
            <input id="team-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="team-password" className="block text-xs text-gray-500 mb-1.5">Temporary password</label>
          <div className="flex gap-2">
            <input
              id="team-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} font-mono`}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setPassword(randomPassword())}
              className="px-3 border border-card-border rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              New
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={adding || !name.trim() || !email.trim() || password.length < 6}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-dark disabled:opacity-40 transition-colors"
          >
            {adding ? 'Adding…' : 'Add to team'}
          </button>
          <Message message={message} />
        </div>
      </form>
    </Section>
  );
}
