export default function StatCard({ icon, label, value, trend, trendUp, color = 'green' }) {
  const colorMap = {
    green: 'bg-green-50 text-accent',
    blue: 'bg-blue-50 text-blue-500',
    red: 'bg-red-50 text-critical',
    yellow: 'bg-yellow-50 text-warning',
  };

  return (
    <div className="bg-white rounded-card border border-card-border p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className={`text-xs mt-0.5 ${trendUp ? 'text-accent' : 'text-critical'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </p>
        )}
      </div>
    </div>
  );
}
