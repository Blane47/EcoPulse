import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, TrendingUp, AlertTriangle, Users, Megaphone } from 'lucide-react';
import AnnouncementModal from '../components/ui/AnnouncementModal';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import { getDashboardStats, getRecentActivity } from '../api/activity';
import { getBins } from '../api/bins';
import { collectionsPerZone as fallbackZoneData, zones } from '../data/mockData';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalBins: 0, collectionsToday: 0, overdueBins: 0, activeCollectors: 0 });
  const [activity, setActivity] = useState([]);
  const [bins, setBins] = useState([]);
  const [zoneData, setZoneData] = useState(fallbackZoneData);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [allActivity, setAllActivity] = useState([]);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const fetchAllActivity = async () => {
    try {
      const data = await getRecentActivity(50);
      setAllActivity(data);
    } catch {}
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashStats, recentAct, binsRes] = await Promise.all([
          getDashboardStats(),
          getRecentActivity(5),
          getBins({ limit: 50 }),
        ]);
        setStats(dashStats);
        setActivity(recentAct);
        setBins(binsRes.bins || []);
        if (dashStats.collectionsByZone?.length) {
          setZoneData(dashStats.collectionsByZone.map((z) => ({ zone: z._id, collections: z.collections })));
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' Today';
  };

  // Build trend data from zone data for the line chart
  const trendData = zoneData.map((z) => ({
    zone: z.zone?.substring(0, 8) || 'Zone',
    collections: z.collections || 0,
    target: Math.round((z.collections || 0) * 1.15),
  }));

  return (
    <div>
      {/* Quick Actions */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAnnouncement(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all shadow-md hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #d97706 100%)' }}
        >
          <Megaphone size={16} />
          Send Announcement
        </button>
      </div>

      <AnnouncementModal isOpen={showAnnouncement} onClose={() => setShowAnnouncement(false)} />

      {/* Stat Cards — 2x2 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon={<Trash2 size={20} />} label="Total Bins" value={stats.totalBins} trend="+12.5%" trendUp color="green" />
        <StatCard icon={<TrendingUp size={20} />} label="Collected Today" value={stats.collectionsToday} trend="+8.2%" trendUp color="blue" />
        <StatCard icon={<AlertTriangle size={20} />} label="Overdue Bins" value={stats.overdueBins} color="red" />
        <StatCard icon={<Users size={20} />} label="Active Collectors" value={stats.activeCollectors} trend="+15.3%" trendUp color="green" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">
        {/* Collection Trends — Line Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-card-border p-6 shadow-card">
          <h2 className="text-base font-bold text-gray-900 mb-1">Collection Trends</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-accent"></span>
              <span className="text-xs text-gray-400">Collections</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <span className="text-xs text-gray-400">Target</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="zone" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Line type="monotone" dataKey="collections" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} />
              <Line type="monotone" dataKey="target" stroke="#60a5fa" strokeWidth={2} strokeDasharray="6 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Collections per Zone — Bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-card-border p-6 shadow-card">
          <h2 className="text-base font-bold text-gray-900 mb-1">By Zone</h2>
          <p className="text-xs text-gray-400 mb-4">This week's collections</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={zoneData} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="zone" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} width={85} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="collections" fill="#22c55e" radius={[0, 8, 8, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-card-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
            {showAll ? (
              <button onClick={() => setShowAll(false)} className="text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors">Show Less</button>
            ) : (
              <button onClick={() => { setShowAll(true); fetchAllActivity(); }} className="text-sm text-accent font-semibold hover:underline flex items-center gap-1">
                View All <span className="text-xs">↗</span>
              </button>
            )}
          </div>
          <div className="space-y-1">
            {(showAll ? allActivity : activity).map((a, i) => (
              <div key={a._id || i} className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                  {(a.collector?.name || 'U').split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.collector?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{a.bin?.binId || '—'} · {a.zone}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge variant="success">Completed</Badge>
                  <p className="text-[10px] text-gray-400 mt-1">{formatTime(a.createdAt)}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && !loading && (
              <p className="text-center py-8 text-gray-400 text-sm">No recent activity</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-card-border p-6 shadow-card">
          <h2 className="text-base font-bold text-gray-900 mb-5">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/map')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-card-border hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-lg">🗺️</span>
              <span className="text-sm font-medium text-gray-700">Open Live Map</span>
            </button>
            <button
              onClick={() => navigate('/collectors')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-card-border hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-lg">👥</span>
              <span className="text-sm font-medium text-gray-700">Manage Collectors</span>
            </button>
            <button
              onClick={() => navigate('/community-reports')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-card-border hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-lg">📋</span>
              <span className="text-sm font-medium text-gray-700">Review Reports</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-card-border hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-lg">💬</span>
              <span className="text-sm font-medium text-gray-700">Open Chat</span>
            </button>
          </div>

          {/* Zone Health */}
          <h3 className="text-sm font-bold text-gray-900 mt-6 mb-3">Zone Health</h3>
          {zones.map((zone) => (
            <div key={zone} className="flex items-center gap-3 mb-2.5">
              <span className="text-sm text-gray-600 w-24 truncate">{zone}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${70 + Math.random() * 25}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
