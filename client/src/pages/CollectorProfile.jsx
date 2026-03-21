import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Truck, Calendar, Mail, Shield, TrendingUp, Clock } from 'lucide-react';
import { getCollectorById, updateCollector } from '../api/collectors';
import api from '../api/axios';
import Badge from '../components/ui/Badge';
import AssignZoneModal from '../components/ui/AssignZoneModal';

export default function CollectorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collector, setCollector] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignZone, setShowAssignZone] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchData = async () => {
    try {
      const data = await getCollectorById(id);
      setCollector(data);
    } catch {}

    try {
      const { data } = await api.get('/activity', { params: { collectorId: id, limit: 20 } });
      setActivity(Array.isArray(data) ? data : data.activities || []);
    } catch {
      setActivity([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await updateCollector(id, { status: newStatus });
      setCollector((prev) => ({ ...prev, status: newStatus }));
    } catch {}
    setUpdatingStatus(false);
    setShowStatusMenu(false);
  };

  const statuses = [
    { value: 'active', label: 'Active', color: 'bg-green-500' },
    { value: 'on-leave', label: 'On Leave', color: 'bg-amber-500' },
    { value: 'inactive', label: 'Inactive', color: 'bg-red-500' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-400">Loading collector profile...</div>;
  }

  if (!collector) {
    return <div className="flex items-center justify-center h-96 text-gray-400">Collector not found</div>;
  }

  const initials = collector.name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
  const effColor = collector.efficiency >= 90 ? 'text-green-500' : collector.efficiency >= 70 ? 'text-amber-500' : 'text-red-500';
  const effBarColor = collector.efficiency >= 90 ? '#22c55e' : collector.efficiency >= 70 ? '#f59e0b' : '#ef4444';

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate('/collectors')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Collectors
      </button>

      {/* Profile Header */}
      <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-8 mb-6">
        <div className="flex items-center gap-6">
          {collector.avatar ? (
            <img
              src={collector.avatar}
              alt={collector.name}
              className="w-24 h-24 rounded-2xl object-cover border-3 border-white/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-white/15 flex items-center justify-center text-white font-bold text-3xl border-2 border-white/20">
              {initials}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{collector.name}</h1>
            <div className="flex items-center gap-3 mt-2 relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex items-center gap-1.5 cursor-pointer"
                disabled={updatingStatus}
              >
                <Badge variant={collector.status === 'active' ? 'success' : collector.status === 'on-leave' ? 'warning' : 'danger'}>
                  {collector.status === 'active' ? 'Active' : collector.status === 'on-leave' ? 'On Leave' : 'Inactive'}
                  <span className="ml-1 text-[10px]">▾</span>
                </Badge>
              </button>
              {showStatusMenu && (
                <div className="absolute top-8 left-0 bg-white rounded-xl shadow-xl border border-card-border py-1 z-10 w-40">
                  {statuses.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(s.value)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                        collector.status === s.value ? 'font-bold text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                      {s.label}
                      {collector.status === s.value && <span className="ml-auto text-green-500">✓</span>}
                    </button>
                  ))}
                </div>
              )}
              <span className="text-white/60 text-sm capitalize">{collector.role?.replace('_', ' ')}</span>
            </div>
            <p className="text-white/50 text-xs mt-2">
              Member since {new Date(collector.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-xs uppercase tracking-wider">Efficiency</p>
            <p className="text-5xl font-black text-white">{collector.efficiency}%</p>
            <button
              onClick={() => setShowAssignZone(true)}
              className="mt-3 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-lg transition-colors border border-white/20"
            >
              <MapPin size={14} className="inline mr-1.5 -mt-0.5" />
              Assign Zone
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column — Info + Stats */}
        <div className="col-span-2 space-y-6">
          {/* Contact & Assignment Info */}
          <div className="bg-white rounded-xl border border-card-border p-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contact & Assignment</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Phone size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Phone Number</p>
                  <p className="text-sm font-semibold text-gray-900">{collector.phone || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <MapPin size={18} className="text-green-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Assigned Zone</p>
                  <p className="text-sm font-semibold text-gray-900">{collector.zone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Truck size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Truck</p>
                  <p className="text-sm font-semibold text-gray-900">{collector.truck || 'Not assigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Shield size={18} className="text-purple-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Role</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{collector.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-white rounded-xl border border-card-border p-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-5 bg-gray-50 rounded-xl">
                <p className="text-3xl font-black text-gray-900">{collector.binsAssigned}</p>
                <p className="text-xs text-gray-400 mt-2">Bins Assigned</p>
              </div>
              <div className="text-center p-5 bg-gray-50 rounded-xl">
                <p className="text-3xl font-black text-gray-900">{collector.collectionsToday}</p>
                <p className="text-xs text-gray-400 mt-2">Collected Today</p>
              </div>
              <div className="text-center p-5 bg-gray-50 rounded-xl">
                <p className="text-3xl font-black text-gray-900">{collector.collectionsMonth}</p>
                <p className="text-xs text-gray-400 mt-2">This Month</p>
              </div>
              <div className="text-center p-5 bg-green-50 rounded-xl">
                <p className={`text-3xl font-black ${effColor}`}>{collector.efficiency}%</p>
                <p className="text-xs text-gray-400 mt-2">Efficiency</p>
              </div>
            </div>

            {/* Efficiency Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 font-medium">Overall Efficiency</span>
                <span className={`text-sm font-bold ${effColor}`}>{collector.efficiency}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ width: `${collector.efficiency}%`, backgroundColor: effBarColor }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-gray-300">0%</span>
                <span className="text-[10px] text-gray-300">50%</span>
                <span className="text-[10px] text-gray-300">100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Activity */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-card-border p-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Info</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge variant={collector.status === 'active' ? 'success' : 'warning'}>
                  {collector.status === 'active' ? 'On Duty' : 'Off Duty'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Zone</span>
                <span className="text-sm font-semibold text-gray-900">{collector.zone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Truck</span>
                <span className="text-sm font-semibold text-gray-900">{collector.truck || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Joined</span>
                <span className="text-sm font-semibold text-gray-900">
                  {new Date(collector.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-card-border p-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Recent Activity</h2>
            {activity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm text-gray-400">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.slice(0, 15).map((a, i) => (
                  <div key={a._id || i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 leading-relaxed">
                        {a.description || a.action || 'Collection completed'}
                      </p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                        <Clock size={10} />
                        {formatDate(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AssignZoneModal
        isOpen={showAssignZone}
        onClose={() => setShowAssignZone(false)}
        collector={collector}
        onUpdated={() => { setShowAssignZone(false); fetchData(); }}
      />
    </div>
  );
}
