export default function StatCard({ icon, label, value, trend, trendUp, color = 'green' }) {
  const colorMap = {
    green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'bg-green-100 text-green-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-100 text-blue-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100 text-red-600' },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'bg-amber-100 text-amber-600' },
  };

  const c = colorMap[color] || colorMap.green;

  return (
    <div className="bg-white rounded-2xl border border-card-border p-6 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
        <p className="text-sm text-gray-400 font-medium">{label}</p>
      </div>
      {trend && (
        <p className={`text-xs font-semibold mb-1 ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
          📈 {trend}
        </p>
      )}
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
    </div>
  );
}
