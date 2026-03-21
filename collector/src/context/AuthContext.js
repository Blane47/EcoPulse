import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      const [storedToken, storedUser, storedDark] = await AsyncStorage.multiGet([
        'collector_token',
        'collector_user',
        'collector_dark',
      ]);
      if (storedDark[1] === 'true') setDarkMode(true);
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
          } else if (data.status !== localUser.status || data.zone !== localUser.zone) {
            const synced = { ...localUser, status: data.status, zone: data.zone };
            setUser(synced);
            await AsyncStorage.setItem('collector_user', JSON.stringify(synced));
          }
        } catch {}
      }
      setLoading(false);
    };
    loadAuth();
  }, []);

  const login = async (phone, pin) => {
    const { data } = await api.post('/auth/collector-login', { phone, pin });
    await AsyncStorage.setItem('collector_token', data.token);
    await AsyncStorage.setItem('collector_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const updateUser = async (updatedUser) => {
    setUser(updatedUser);
    await AsyncStorage.setItem('collector_user', JSON.stringify(updatedUser));
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['collector_token', 'collector_user']);
    setToken(null);
    setUser(null);
  };

  const toggleDarkMode = async () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    await AsyncStorage.setItem('collector_dark', newVal.toString());
  };

  return (
    <AuthContext.Provider value={{ user, token, authenticated: !!token, loading, login, logout, updateUser, darkMode, toggleDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
