import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Trash2,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  Megaphone,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/bins', icon: Trash2, label: 'Bins' },
  { to: '/collectors', icon: Users, label: 'Collectors' },
  { to: '/reports', icon: BarChart3, label: 'Analytics' },
  { to: '/community-reports', icon: Megaphone, label: 'Community' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, onLogout } = useAuth();
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/chat');
        const total = data.reduce((sum, chat) => sum + (chat.unread || 0), 0);
        setUnreadChats(total);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 8000);
    return () => clearInterval(interval);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : 'U';

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-white border-r border-card-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="EcoPulse" style={{ width: 50, height: 50 }} className="rounded-xl object-contain" />
          <h1
            className="text-base font-black tracking-widest"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              background: 'linear-gradient(90deg, #15803d, #22c55e, #4ade80)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ECOPULSE
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <item.icon size={18} />
            <span className="flex-1">{item.label}</span>
            {item.label === 'Chat' && unreadChats > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">
                {unreadChats > 99 ? '99+' : unreadChats}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 mb-2">
        <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 w-full transition-all">
          <HelpCircle size={18} />
          Support
        </button>
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
            <span className="text-accent text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 text-sm font-semibold truncate">{user?.name || 'User'}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-gray-400 hover:text-red-400 transition-colors p-1"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
