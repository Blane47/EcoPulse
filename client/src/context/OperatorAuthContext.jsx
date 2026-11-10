import { createContext, useContext, useState } from 'react';

// Operator-portal auth, kept entirely separate from the admin AuthContext so the
// two sessions never interfere (different localStorage keys, different axios client).
const OperatorAuthContext = createContext(null);

const readOperator = () => {
  try {
    return JSON.parse(localStorage.getItem('operator') || 'null');
  } catch {
    return null;
  }
};

export function OperatorAuthProvider({ children }) {
  const [operator, setOperator] = useState(readOperator);
  const [authenticated, setAuthenticated] = useState(!!localStorage.getItem('operator_token'));

  const onLogin = (op, token) => {
    localStorage.setItem('operator_token', token);
    localStorage.setItem('operator', JSON.stringify(op));
    setOperator(op);
    setAuthenticated(true);
  };

  const onLogout = () => {
    localStorage.removeItem('operator_token');
    localStorage.removeItem('operator');
    setOperator(null);
    setAuthenticated(false);
  };

  const refresh = (op) => {
    localStorage.setItem('operator', JSON.stringify(op));
    setOperator(op);
  };

  return (
    <OperatorAuthContext.Provider value={{ operator, authenticated, onLogin, onLogout, refresh }}>
      {children}
    </OperatorAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOperatorAuth = () => useContext(OperatorAuthContext);
