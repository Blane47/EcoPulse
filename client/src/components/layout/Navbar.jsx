import { useState, useEffect } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import NotificationDropdown from '../ui/NotificationDropdown';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const [binsRes, reportsRes, collectorsRes, chatsRes] = await Promise.all([
          api.get('/bins/stats'),
          api.get('/reports'),
          api.get('/collectors'),
          api.get('/chat'),
        ]);
        const critical = binsRes.data.critical + binsRes.data.warning;
        const pending = reportsRes.data.filter(r => r.status === 'pending').length;
        const unavailable = collectorsRes.data.filter(c => c.status === 'on-leave' || c.status === 'inactive').length;
        const unreadChats = chatsRes.data.filter(c => c.unread > 0).length;
        setNotifCount(critical + pending + unavailable + unreadChats);
      } catch {
        // ignore
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-card-border flex items-center justify-between gap-3 px-4 sm:px-6 sticky top-0 z-30 lg:static print:hidden">
      {/* Menu button + brand (drawer mode only) */}
      <div className="flex items-center gap-3 lg:hidden">
        <button onClick={onMenuClick} className="p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900" aria-label="Open menu">
          <Menu size={22} />
        </button>
        <span className="font-bold text-gray-900 md:hidden">EcoPulse</span>
      </div>

      {/* Search */}
      <div className="relative w-80 hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search bin ID, location or collector..."
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-card-border rounded-lg text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Bell size={20} />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">{notifCount > 9 ? '9+' : notifCount}</span>
              </span>
            )}
          </button>
          <NotificationDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-xs font-semibold">{initials}</span>
          </div>
          <span className="hidden sm:inline text-sm font-medium text-gray-700">{user?.name || 'User'}</span>
        </div>
      </div>
    </header>
  );
}
