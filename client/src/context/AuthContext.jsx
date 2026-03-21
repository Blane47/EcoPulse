import { createContext, useContext, useState, useEffect } from 'react';
import { getStoredUser, isAuthenticated as checkAuth } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [authenticated, setAuthenticated] = useState(checkAuth());

  useEffect(() => {
    setUser(getStoredUser());
    setAuthenticated(checkAuth());
  }, []);

  const onLogin = (userData) => {
    setUser(userData);
    setAuthenticated(true);
  };

  const onLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, authenticated, onLogin, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
