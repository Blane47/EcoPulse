export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Configure your EcoPulse dashboard preferences</p>

      <div className="bg-white rounded-card border border-card-border p-6 max-w-2xl">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">General Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-card-border">
            <div>
              <p className="text-sm font-medium text-gray-700">Email Notifications</p>
              <p className="text-xs text-gray-400">Receive alerts for overdue bins</p>
            </div>
            <button className="w-10 h-6 bg-accent rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-card-border">
            <div>
              <p className="text-sm font-medium text-gray-700">Auto-refresh Dashboard</p>
              <p className="text-xs text-gray-400">Update data every 5 minutes</p>
            </div>
            <button className="w-10 h-6 bg-accent rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Dark Mode</p>
              <p className="text-xs text-gray-400">Switch to dark theme</p>
            </div>
            <button className="w-10 h-6 bg-gray-300 rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
