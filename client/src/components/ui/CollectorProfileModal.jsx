import { useState, useEffect } from 'react';
import { X, Phone, MapPin, Truck, Star, Calendar, Clock, TrendingUp, User, Shield } from 'lucide-react';
import { getCollectorById } from '../../api/collectors';
import api from '../../api/axios';
import Badge from './Badge';

export default function CollectorProfileModal({ isOpen, onClose, collectorId }) {
  const [collector, setCollector] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !collectorId) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const data = await getCollectorById(collectorId);
        setCollector(data);
      } catch {}

      try {
        const { data } = await api.get('/activity', { params: { collectorId, limit: 10 } });
        setActivity(Array.isArray(data) ? data : data.activities || []);
      } catch {
        setActivity([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [isOpen, collectorId]);

  if (!isOpen) return null;

  const initials = collector?.name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
  const effColor = collector?.efficiency >= 90 ? 'text-green-500' : collector?.efficiency >= 70 ? 'text-amber-500' : 'text-red-500';
  const effBg = collector?.efficiency >= 90 ? 'bg-green-50' : collector?.efficiency >= 70 ? 'bg-amber-50' : 'bg-red-50';

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
        ) : !collector ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Collector not found</div>
        ) : (
          <>
            {/* Header */}
            <div className="relative bg-gradient-to-br from-green-500 to-green-700 p-6 rounded-t-2xl">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4">
                {collector.avatar ? (
                  <img
                    src={collector.avatar}
                    alt={collector.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl border-2 border-white/30">
                    {initials}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">{collector.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={collector.status === 'active' ? 'success' : 'warning'}>
                      {collector.status === 'active' ? 'Active' : collector.status === 'on-leave' ? 'On Leave' : 'Inactive'}
                    </Badge>
                    <span className="text-white/70 text-xs capitalize">{collector.role?.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Phone size={16} className="text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Phone</p>
                    <p className="text-sm font-semibold text-gray-900">{collector.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin size={16} className="text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Zone</p>
                    <p className="text-sm font-semibold text-gray-900">{collector.zone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Truck size={16} className="text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Truck</p>
                    <p className="text-sm font-semibold text-gray-900">{collector.truck || 'Not assigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar size={16} className="text-gray-400" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Joined</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(collector.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Performance</h3>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{collector.binsAssigned}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Bins Assigned</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{collector.collectionsToday}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Today</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{collector.collectionsMonth}</p>
                  <p className="text-[10px] text-gray-400 mt-1">This Month</p>
                </div>
                <div className={`text-center p-3 ${effBg} rounded-xl`}>
                  <p className={`text-2xl font-bold ${effColor}`}>{collector.efficiency}%</p>
                  <p className="text-[10px] text-gray-400 mt-1">Efficiency</p>
                </div>
              </div>

              {/* Efficiency Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Efficiency Score</span>
                  <span className={`text-xs font-bold ${effColor}`}>{collector.efficiency}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${collector.efficiency}%`,
                      background: collector.efficiency >= 90 ? '#22c55e' : collector.efficiency >= 70 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>

              {/* Recent Activity */}
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Activity</h3>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activity.slice(0, 10).map((a, i) => (
                    <div key={a._id || i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                        <span className="text-sm">🗑️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {a.description || a.action || 'Collection completed'}
                        </p>
                        <p className="text-[10px] text-gray-400">{formatDate(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
