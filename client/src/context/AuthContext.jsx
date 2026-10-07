import { createContext, useContext, useState } from 'react';
import { getStoredUser, isAuthenticated as checkAuth } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [authenticated, setAuthenticated] = useState(checkAuth());

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
    <AuthContext.Provider value={{ user, authenticated, onLogin, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

// The hook lives beside its provider; fast refresh reloads this file in full, which is fine for auth
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
