import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Bins from './pages/Bins';
import MapView from './pages/MapView';
import Collectors from './pages/Collectors';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AddBinModal from './components/ui/AddBinModal';

function ProtectedRoute({ children }) {
  const { authenticated } = useAuth();
  return authenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const [showAddBin, setShowAddBin] = useState(false);
  const { authenticated } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/login" element={authenticated ? <Navigate to="/" /> : <Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/bins" element={<Bins onAddBin={() => setShowAddBin(true)} />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/collectors" element={<Collectors />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <AddBinModal isOpen={showAddBin} onClose={() => setShowAddBin(false)} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
