import { useState, useEffect, useRef } from 'react';
import { Camera, Save, Lock, User, Mail, Phone, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Settings() {
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // Toggles
  const [emailNotifs, setEmailNotifs] = useState(() => localStorage.getItem('emailNotifs') !== 'false');
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('autoRefresh') !== 'false');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  const toggle = (key, value, setter) => {
    setter(value);
    localStorage.setItem(key, value.toString());
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#1a1d29';
      document.body.style.color = '#e5e7eb';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#edf1f7';
      document.body.style.color = '#1f2937';
    }
  }, [darkMode]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await api.put('/auth/me', { name, email, phone, avatar });
      if (setUser) setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPasswordMsg('');
    try {
      const { data } = await api.put('/auth/me/password', { currentPassword, newPassword });
      setPasswordMsg(data.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg(err.response?.data?.message || 'Failed to change password');
    }
  };

  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const ToggleSwitch = ({ enabled, onToggle }) => (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${enabled ? 'bg-accent' : 'bg-gray-300'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 shadow ${enabled ? 'right-1' : 'left-1'}`} />
    </button>
  );

  return (
    <div className="max-w-3xl">
      {/* Profile Section */}
      <div className="bg-white rounded-card border border-card-border p-6 shadow-card mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User size={18} className="text-accent" /> Profile
        </h2>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-accent/15 flex items-center justify-center">
                <span className="text-accent text-2xl font-bold">{initials}</span>
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent text-white rounded-full flex items-center justify-center shadow-md hover:bg-accent-dark transition-colors"
            >
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{name || 'Admin'}</p>
            <p className="text-sm text-gray-400">{user?.role === 'admin' ? 'City Administrator' : 'Viewer'}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
              <User size={12} /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-card-border rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
              <Mail size={12} /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-card-border rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
              <Phone size={12} /> Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="w-full px-4 py-2.5 bg-gray-50 border border-card-border rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
        >
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-card border border-card-border p-6 shadow-card mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={18} className="text-accent" /> Change Password
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-card-border rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-4 py-2.5 bg-gray-50 border border-card-border rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
        </div>
        {passwordMsg && (
          <p className={`text-sm mb-3 ${passwordMsg.includes('success') ? 'text-accent' : 'text-critical'}`}>{passwordMsg}</p>
        )}
        <button
          onClick={handleChangePassword}
          disabled={!currentPassword || !newPassword}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          <Lock size={14} /> Update Password
        </button>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-card border border-card-border p-6 shadow-card">
        <h2 className="text-base font-bold text-gray-900 mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-card-border">
            <div>
              <p className="text-sm font-medium text-gray-700">Email Notifications</p>
              <p className="text-xs text-gray-400">Receive alerts for overdue bins</p>
            </div>
            <ToggleSwitch enabled={emailNotifs} onToggle={() => toggle('emailNotifs', !emailNotifs, setEmailNotifs)} />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-card-border">
            <div>
              <p className="text-sm font-medium text-gray-700">Auto-refresh Dashboard</p>
              <p className="text-xs text-gray-400">Update data every 5 minutes</p>
            </div>
            <ToggleSwitch enabled={autoRefresh} onToggle={() => toggle('autoRefresh', !autoRefresh, setAutoRefresh)} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Dark Mode</p>
              <p className="text-xs text-gray-400">Switch to dark theme</p>
            </div>
            <ToggleSwitch enabled={darkMode} onToggle={() => toggle('darkMode', !darkMode, setDarkMode)} />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">Settings and profile changes are saved automatically.</p>
    </div>
  );
}
