import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const AuthContext = createContext();

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
          } else if (
            data.status !== localUser.status ||
            data.zone !== localUser.zone ||
            data.mustChangePassword !== localUser.mustChangePassword
          ) {
            // mustChangePassword flips when an admin issues a temporary password
            const synced = { ...localUser, status: data.status, zone: data.zone, mustChangePassword: data.mustChangePassword };
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
