import { useState, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import AddBinModal from './components/ui/AddBinModal';

// Pages load on first visit so the initial download stays small (charts and maps are heavy).
// Layout shows a loading state for them while the sidebar and top bar stay on screen.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Bins = lazy(() => import('./pages/Bins'));
const MapView = lazy(() => import('./pages/MapView'));
const Collectors = lazy(() => import('./pages/Collectors'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Chat = lazy(() => import('./pages/Chat'));
const CollectorProfile = lazy(() => import('./pages/CollectorProfile'));
const CommunityReports = lazy(() => import('./pages/CommunityReports'));
const Applications = lazy(() => import('./pages/Applications'));

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
          <Route path="/collectors/:id" element={<CollectorProfile />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/community-reports" element={<CommunityReports />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/chat" element={<Chat />} />
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
