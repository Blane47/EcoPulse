import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, FileText, Truck, CheckCircle, X, Clock, MessageCircle } from 'lucide-react';
import api from '../../api/axios';

export default function NotificationDropdown({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const items = [];

      // Fetch critical bins
      const { data: bins } = await api.get('/bins');
      const criticalBins = bins.filter(b => b.status === 'critical');
      criticalBins.forEach(bin => {
        items.push({
          id: `bin-${bin._id}`,
          type: 'critical',
          icon: AlertTriangle,
          color: 'text-red-500',
          bg: 'bg-red-50',
          title: `${bin.name || bin.binId} is critical`,
          subtitle: `${bin.fillLevel || 90}% full — ${bin.zone || 'Unknown zone'}`,
          time: 'Now',
        });
      });

      // Fetch warning bins
      const warningBins = bins.filter(b => b.status === 'warning');
      warningBins.slice(0, 3).forEach(bin => {
        items.push({
          id: `bin-warn-${bin._id}`,
          type: 'warning',
          icon: AlertTriangle,
          color: 'text-orange-500',
          bg: 'bg-orange-50',
          title: `${bin.name || bin.binId} nearing capacity`,
          subtitle: `${bin.fillLevel || 70}% full — ${bin.zone || 'Unknown zone'}`,
          time: 'Recently',
        });
      });

      // Fetch pending reports
      const { data: reports } = await api.get('/reports');
      const pendingReports = reports.filter(r => r.status === 'pending');
      pendingReports.forEach(report => {
        items.push({
          id: `report-${report._id}`,
          type: 'report',
          icon: FileText,
          color: 'text-blue-500',
          bg: 'bg-blue-50',
          title: `New report: ${report.type || 'Issue'}`,
          subtitle: `${report.location || report.zone || 'Unknown'} — by ${report.reporterName || 'Anonymous'}`,
          time: formatTime(report.createdAt),
        });
      });

      // Fetch collectors on leave / inactive
      const { data: collectors } = await api.get('/collectors');
      collectors.filter(c => c.status === 'on_leave' || c.status === 'inactive').forEach(col => {
        items.push({
          id: `col-${col._id}`,
          type: 'collector',
          icon: Truck,
          color: col.status === 'inactive' ? 'text-gray-500' : 'text-yellow-500',
          bg: col.status === 'inactive' ? 'bg-gray-50' : 'bg-yellow-50',
          title: `${col.name} is ${col.status === 'on_leave' ? 'on leave' : 'inactive'}`,
          subtitle: `${col.zone || 'Unassigned'} zone`,
          time: 'Today',
        });
      });

      // Fetch unread chat messages
      const { data: chats } = await api.get('/chat');
      chats.filter(c => c.unreadCount > 0).forEach(chat => {
        items.push({
          id: `chat-${chat._id}`,
          type: 'chat',
          icon: MessageCircle,
          color: 'text-green-500',
          bg: 'bg-green-50',
          title: `New message from ${chat.participantName || 'User'}`,
          subtitle: `${chat.unreadCount} unread message${chat.unreadCount > 1 ? 's' : ''}`,
          time: formatTime(chat.lastMessageAt || chat.updatedAt),
        });
      });

      setNotifications(items);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
              {notifications.length}
            </span>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <CheckCircle size={32} className="mb-2" />
            <p className="text-sm">All clear! No notifications.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 cursor-pointer"
            >
              <div className={`p-2 rounded-lg ${notif.bg} mt-0.5`}>
                <notif.icon size={16} className={notif.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{notif.title}</p>
                <p className="text-xs text-gray-500 truncate">{notif.subtitle}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap mt-1">
                <Clock size={10} />
                {notif.time}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => { /* could navigate to a full page */ }}
            className="w-full text-center text-xs font-medium text-accent hover:text-accent-dark transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}