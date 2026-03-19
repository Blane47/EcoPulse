import { Download, FileText } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import {
  reportKPIs, dailyCollectionTrends, binTypeDistribution,
  overdueBinsByZone, collectors,
} from '../data/mockData';

export default function Reports() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Track collection performance and zone efficiency across the city</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-card-border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={16} />
            Download CSV
          </button>
          <button
            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
          >
            <FileText size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<span className="text-lg">📊</span>}
          label="Total Collections"
          value={reportKPIs.totalCollections.toLocaleString()}
          color="green"
        />
        <StatCard
          icon={<span className="text-lg">📈</span>}
          label="Avg Fill"
          value={`${reportKPIs.avgFill}%`}
          color="blue"
        />
        <StatCard
          icon={<span className="text-lg">⚠️</span>}
          label="Zones at Risk"
          value={reportKPIs.zonesAtRisk}
          color="yellow"
        />
        <StatCard
          icon={<span className="text-lg">🚛</span>}
          label="Total Collected"
          value={reportKPIs.totalCollected}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Daily Collection Trends */}
        <div className="lg:col-span-2 bg-white rounded-card border border-card-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Daily Collection Trends</h2>
          <p className="text-xs text-gray-400 mb-4">Scheduled vs actual performance — March 2025</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyCollectionTrends}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="scheduled"
                stroke="#e5e7eb"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Scheduled"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bin Type Distribution */}
        <div className="bg-white rounded-card border border-card-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Bin Type Distribution</h2>
          <p className="text-xs text-gray-400 mb-4">Waste category breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={binTypeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {binTypeDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {binTypeDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-500">{item.name} {item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Bins by Zone */}
        <div className="bg-white rounded-card border border-card-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Overdue Bins by Zone</h2>
          <p className="text-xs text-gray-400 mb-4">Real-time alerts for collection delay</p>
          <div className="space-y-3">
            {overdueBinsByZone.map((zone) => (
              <div key={zone.zone} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-28">{zone.zone}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-critical h-5 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(zone.bins / 10) * 100}%` }}
                  >
                    <span className="text-[10px] text-white font-medium">{zone.bins} Bins</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collector Performance */}
        <div className="bg-white rounded-card border border-card-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Collector Performance</h2>
          <p className="text-xs text-gray-400 mb-4">Efficiency metrics for this month</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase">Collector</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase">Bins</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase">Month</th>
                <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase">Eff.</th>
              </tr>
            </thead>
            <tbody>
              {collectors.map((c) => (
                <tr key={c.id} className="border-b border-card-border last:border-0">
                  <td className="py-2.5 text-gray-700">{c.name.split(' ')[0]} {c.name.split(' ')[1]?.[0]}.</td>
                  <td className="py-2.5 text-gray-600">{c.bins}</td>
                  <td className="py-2.5 text-gray-600">{c.month}</td>
                  <td className="py-2.5">
                    <Badge variant={c.efficiency >= 90 ? 'success' : c.efficiency >= 80 ? 'warning' : 'danger'}>
                      {c.efficiency}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
