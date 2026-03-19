export default function ProgressBar({ value, size = 'md' }) {
  const getColor = () => {
    if (value >= 80) return 'bg-critical';
    if (value >= 50) return 'bg-warning';
    return 'bg-accent';
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 bg-gray-100 rounded-full ${heights[size]} overflow-hidden`}>
        <div
          className={`${getColor()} ${heights[size]} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{value}%</span>
    </div>
  );
}
