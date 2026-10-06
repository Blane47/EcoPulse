import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { playReceive } from '../utils/sounds';
import api from '../api/axios';

const NotificationContext = createContext();
const POLL_INTERVAL = 30000;

// Polls the server for the collector's notifications (e.g. a report assigned from the
// dashboard) while the app is open, and raises an in-app banner for new ones.
export function NotificationProvider({ children }) {
  const { authenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [banner, setBanner] = useState(null);
  // ids already shown; null until the first load so existing notifications don't pop up
  const seenIds = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnread(data.unread);
      if (seenIds.current) {
        const fresh = data.notifications.find((n) => !n.read && !seenIds.current.has(n._id));
        if (fresh) {
          setBanner(fresh);
          playReceive();
        }
      }
      seenIds.current = new Set(data.notifications.map((n) => n._id));
    } catch {
      // Background poll: stay quiet and try again on the next tick
    }
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setNotifications([]);
      setUnread(0);
      setBanner(null);
      seenIds.current = null;
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    // Check straight away when the collector returns to the app
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [authenticated, refresh]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      // Not critical: the next poll brings the server's state back
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.put('/notifications/read-all');
    } catch {
      // Not critical: the next poll brings the server's state back
    }
  }, []);

  const dismissBanner = useCallback(() => setBanner(null), []);

  return (
    <NotificationContext.Provider value={{ notifications, unread, refresh, markRead, markAllRead, banner, dismissBanner }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
