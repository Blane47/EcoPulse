import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import NotificationDropdown from '../ui/NotificationDropdown';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const pageTitles = {
  '/': 'Overview',
  '/map': 'Map View',
  '/bins': 'Waste Collection Points',
  '/collectors': 'Collectors',
  '/reports': 'Reports & Analytics',
  '/community-reports': 'Community Reports',
  '/chat': 'Messages',
  '/settings': 'Settings',
};

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const title = pageTitles[location.pathname] || 'Dashboard';

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const [binsRes, reportsRes, collectorsRes, chatsRes] = await Promise.all([
          api.get('/bins'),
          api.get('/reports'),
          api.get('/collectors'),
          api.get('/chat'),
        ]);
        const critical = binsRes.data.filter(b => b.status === 'critical' || b.status === 'warning').length;
        const pending = reportsRes.data.filter(r => r.status === 'pending').length;
        const unavailable = collectorsRes.data.filter(c => c.status === 'on_leave' || c.status === 'inactive').length;
        const unreadChats = chatsRes.data.filter(c => c.unreadCount > 0).length;
        setNotifCount(critical + pending + unavailable + unreadChats);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-card-border flex items-center justify-between px-8">
      {/* Left — Title & Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {location.pathname === '/' && (
          <p className="text-sm text-gray-400">Hi {firstName} 👋 . Welcome Back</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search bins, collectors..."
            className="w-56 pl-9 pr-4 py-2 bg-gray-50 border border-card-border rounded-xl text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
          >
            <Bell size={18} />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[9px] text-white font-bold">{notifCount > 9 ? '9+' : notifCount}</span>
              </span>
            )}
          </button>
          <NotificationDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Profile Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-card-border">
          <div className="w-full h-full bg-accent/15 flex items-center justify-center">
            <span className="text-accent text-xs font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
