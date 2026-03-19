import { Search, Bell } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="h-16 bg-white border-b border-card-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search bin ID, location or collector..."
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-card-border rounded-lg text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical rounded-full"></span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-xs font-semibold">AR</span>
          </div>
          <span className="text-sm font-medium text-gray-700">Alex Rivera</span>
        </div>
      </div>
    </header>
  );
}
