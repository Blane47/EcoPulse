import { useState } from 'react';
import { User, Lock, Moon } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Section, Message, inputClass } from '../components/settings/SettingsSection';
import TeamSection from '../components/settings/TeamSection';

const readDarkMode = () => {
  try {
    return localStorage.getItem('darkMode') === 'true';
  } catch {
    return false;
  }
};

export default function Settings() {
  const { user, onLogin } = useAuth();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Appearance
  const [darkMode, setDarkMode] = useState(readDarkMode);

  const profileChanged = name.trim() !== (user?.name || '') || email.trim().toLowerCase() !== (user?.email || '');

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!name.trim() || !email.trim()) {
      setProfileMsg({ ok: false, text: 'Name and email are required.' });
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/me', { name, email });
      localStorage.setItem('user', JSON.stringify(data));
      onLogin(data); // refreshes the name shown in the sidebar and top bar
      setProfileMsg({ ok: true, text: 'Profile saved.' });
    } catch (err) {
      setProfileMsg({ ok: false, text: err.response?.data?.message || 'Could not save your profile.' });
    }
    setSavingProfile(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "New passwords don't match." });
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/auth/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ ok: true, text: 'Password updated.' });
    } catch (err) {
      setPasswordMsg({ ok: false, text: err.response?.data?.message || 'Could not change your password.' });
    }
    setSavingPassword(false);
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('darkMode', String(next));
    } catch {
      // Private browsing: the choice just won't be remembered
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your account and how the dashboard looks</p>

      <div className="max-w-2xl space-y-5">
        <Section icon={User} title="Profile" description="Your name and the email you sign in with.">
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-name" className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Full name</label>
                <input id="settings-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="settings-email" className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Email</label>
                <input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={savingProfile || !profileChanged}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-dark disabled:opacity-40 transition-colors"
              >
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
              <Message message={profileMsg} />
            </div>
          </form>
        </Section>

        <Section icon={Lock} title="Password" description="Use at least 6 characters.">
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label htmlFor="settings-current" className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Current password</label>
              <input
                id="settings-current"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-new" className="block text-xs font-medium text-gray-500 uppercase mb-1.5">New password</label>
                <input
                  id="settings-new"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="settings-confirm" className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Confirm new password</label>
                <input
                  id="settings-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-dark disabled:opacity-40 transition-colors"
              >
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
              <Message message={passwordMsg} />
            </div>
          </form>
        </Section>

        <TeamSection currentUserId={user?._id} />

        <Section icon={Moon} title="Appearance" description="Saved on this browser.">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p id="dark-mode-label" className="text-sm font-medium text-gray-700">Dark mode</p>
              <p className="text-xs text-gray-400">Easier on the eyes at night</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={darkMode}
              aria-labelledby="dark-mode-label"
              onClick={toggleDarkMode}
              className={`w-11 h-6 rounded-full relative shrink-0 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                darkMode ? 'bg-accent' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-4 h-4 bg-[#fff] rounded-full absolute top-1 shadow transition-all duration-200 ${
                  darkMode ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
