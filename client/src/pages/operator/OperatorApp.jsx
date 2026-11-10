import { Routes, Route, Navigate } from 'react-router-dom';
import { OperatorAuthProvider, useOperatorAuth } from '../../context/OperatorAuthContext';
import OperatorLogin from './OperatorLogin';
import OperatorDashboard from './OperatorDashboard';

function Guard({ children }) {
  const { authenticated } = useOperatorAuth();
  return authenticated ? children : <Navigate to="/operator/login" replace />;
}

// The whole operator portal, mounted at /operator/* with its own auth provider —
// fully separate from the municipal admin dashboard.
export default function OperatorApp() {
  return (
    <OperatorAuthProvider>
      <Routes>
        <Route path="login" element={<OperatorLogin />} />
        <Route path="" element={<Guard><OperatorDashboard /></Guard>} />
      </Routes>
    </OperatorAuthProvider>
  );
}
