import { useState, useEffect } from 'react';
import { Trash2, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import { getDashboardStats, getRecentActivity } from '../api/activity';
import { getBins } from '../api/bins';
import { collectionsPerZone as fallbackZoneData, zones } from '../data/mockData';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const BUEA_CENTER = [4.155, 9.265];

export default function Dashboard() {
  const [stats, setStats] = useState({ totalBins: 0, collectionsToday: 0, overdueBins: 0, activeCollectors: 0 });
  const [activity, setActivity] = useState([]);
  const [bins, setBins] = useState([]);
  const [zoneData, setZoneData] = useState(fallbackZoneData);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500">Real-time waste management metrics for Buea Municipality</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Trash2 size={22} />} label="Total Bins" value={stats.totalBins} trend="+12%" trendUp color="green" />
        <StatCard icon={<TrendingUp size={22} />} label="Collected Today" value={stats.collectionsToday} trend="+18%" trendUp color="blue" />
        <StatCard icon={<AlertTriangle size={22} />} label="Overdue Bins" value={stats.overdueBins} color="red" />
        <StatCard icon={<Users size={22} />} label="Active Collectors" value={stats.activeCollectors} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white rounded-card border border-card-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <h2 className="text-sm font-semibold text-gray-900">Live Asset Map</h2>
            <div className="flex gap-1 ml-auto">
              {zones.map((z) => (
                <span key={z} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{z}</span>
              ))}
            </div>
          </div>
          <div className="h-[280px] rounded-lg overflow-hidden">
            <MapContainer center={BUEA_CENTER} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {bins.map((bin) => (
                <Marker key={bin._id} position={[bin.coordinates?.lat || 4.155, bin.coordinates?.lng || 9.265]}>
                  <Popup>{bin.binId} - {bin.location}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="bg-white rounded-card border border-card-border p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Collections per Zone</h2>
          <p className="text-xs text-gray-400 mb-4">This week</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={zoneData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="zone" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="collections" fill="#22c55e" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-card border border-card-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            <p className="text-xs text-gray-400">Latest updates from the collection network</p>
          </div>
          <button className="text-sm text-accent font-medium hover:underline">View All Activity</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 uppercase">Collector</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 uppercase">Bin ID</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 uppercase">Timestamp</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 uppercase">Zone</th>
                <th className="text-left py-2.5 px-3 text-xs font-medium text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((a, i) => (
                <tr key={a._id || i} className="border-b border-card-border last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-semibold">
                        {(a.collector?.name || 'U').split(' ').map((n) => n[0]).join('')}
                      </div>
                      {a.collector?.name || 'Unknown'}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-gray-600">{a.bin?.binId || '—'}</td>
                  <td className="py-3 px-3 text-gray-500">{formatTime(a.createdAt)}</td>
                  <td className="py-3 px-3"><Badge variant="info">{a.zone}</Badge></td>
                  <td className="py-3 px-3"><Badge variant="success">Completed</Badge></td>
                </tr>
              ))}
              {activity.length === 0 && !loading && (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400">No recent activity</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
