import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const AuthContext = createContext();
// Profile fields refreshed from the server on launch
const SYNCED_FIELDS = ['name', 'email', 'status', 'zone', 'truck', 'mustChangePassword'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  // Temporary password just used to sign in, kept in memory (never stored) so the
  // forced password change doesn't ask for it again
  const [tempPassword, setTempPassword] = useState(null);

  useEffect(() => {
    const loadAuth = async () => {
      const [storedToken, storedUser, storedLang] = await AsyncStorage.multiGet([
        'collector_token',
        'collector_user',
        'collector_lang',
      ]);
      if (storedLang[1]) setLanguage(storedLang[1]);
      if (storedToken[1] && storedUser[1]) {
        setToken(storedToken[1]);
        const localUser = JSON.parse(storedUser[1]);
        setUser(localUser);

        // Sync latest status from server
        try {
          api.defaults.headers.common.Authorization = `Bearer ${storedToken[1]}`;
          const { data } = await api.get('/auth/me');
          if (data.status === 'inactive') {
            // Force logout if deactivated
            await AsyncStorage.multiRemove(['collector_token', 'collector_user']);
            setToken(null);
            setUser(null);
          } else if (SYNCED_FIELDS.some((k) => data[k] !== localUser[k])) {
            // Admins change these from the dashboard; mustChangePassword flips when they issue a temporary password
            const synced = { ...localUser, ...Object.fromEntries(SYNCED_FIELDS.map((k) => [k, data[k]])) };
            setUser(synced);
            await AsyncStorage.setItem('collector_user', JSON.stringify(synced));
          }
        } catch {
          // Offline or server down: keep the cached profile and sync on the next launch
        }
      }
      setLoading(false);
    };
    loadAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/collector-login', { email, password });
    await AsyncStorage.setItem('collector_token', data.token);
    await AsyncStorage.setItem('collector_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setTempPassword(data.user.mustChangePassword ? password : null);
    return data;
  };

  // Replace the current (or temporary) password; clears the must-change flag
  const changePassword = async (currentPassword, newPassword) => {
    await api.put('/auth/me/password', { currentPassword, newPassword });
    setTempPassword(null);
    if (user?.mustChangePassword) await updateUser({ ...user, mustChangePassword: false });
  };

  const updateUser = async (updatedUser) => {
    setUser(updatedUser);
    await AsyncStorage.setItem('collector_user', JSON.stringify(updatedUser));
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['collector_token', 'collector_user']);
    setToken(null);
    setUser(null);
    setTempPassword(null);
  };

  // Kept across sign-outs so the login screen stays in the collector's language
  const selectLanguage = async (lang) => {
    await AsyncStorage.setItem('collector_lang', lang);
    setLanguage(lang);
  };

  return (
    <AuthContext.Provider value={{ user, token, authenticated: !!token, loading, login, logout, updateUser, changePassword, tempPassword, language, selectLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
