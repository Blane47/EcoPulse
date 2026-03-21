import { useState, useEffect } from 'react';
import { Plus, Filter } from 'lucide-react';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { getBins } from '../api/bins';
import { zones } from '../data/mockData';

export default function Bins({ onAddBin }) {
  const [binsData, setBinsData] = useState([]);
  const [total, setTotal] = useState(0);
  const [zoneFilter, setZoneFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [fillMin, setFillMin] = useState('');
  const [fillMax, setFillMax] = useState('');
  const [selectedBin, setSelectedBin] = useState(null);
  const perPage = 5;

  useEffect(() => {
    const fetchBins = async () => {
      setLoading(true);
      try {
        const params = { page: currentPage, limit: perPage };
        if (zoneFilter) params.zone = zoneFilter;
        if (typeFilter) params.type = typeFilter;
        if (statusFilter) params.status = statusFilter;

        const data = await getBins(params);
        setBinsData(data.bins || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('Bins fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBins();
  }, [currentPage, zoneFilter, typeFilter, statusFilter]);

  const totalPages = Math.ceil(total / perPage);

  const formatLastCollected = (date) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}min ago`;
    if (hours < 24) return `${hours}hr ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waste Collection Points</h1>
          <p className="text-sm text-gray-500">Monitoring real-time fill levels and status across municipal zones.</p>
        </div>
        <button
          onClick={onAddBin}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
        >
          <Plus size={16} /> Add Bin
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={zoneFilter} onChange={(e) => { setZoneFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-card-border rounded-lg text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All Zones</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-card-border rounded-lg text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All Types</option>
          <option>General</option>
          <option>Recyclable</option>
          <option>Organic</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-card-border rounded-lg text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">All Status</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="optimal">Optimal</option>
          <option value="empty">Empty</option>
        </select>
        <button
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 ${showMoreFilters ? 'border-accent text-accent' : 'border-card-border text-gray-500'}`}
        >
          <Filter size={14} /> {showMoreFilters ? 'Less Filters' : 'More Filters'}
        </button>
      </div>

      {showMoreFilters && (
        <div className="flex items-center gap-3 mb-4 bg-gray-50 p-3 rounded-lg border border-card-border">
          <span className="text-xs font-medium text-gray-500">Fill Level:</span>
          <input
            type="number"
            placeholder="Min %"
            value={fillMin}
            onChange={(e) => { setFillMin(e.target.value); setCurrentPage(1); }}
            className="w-20 px-2 py-1.5 border border-card-border rounded-lg text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            placeholder="Max %"
            value={fillMax}
            onChange={(e) => { setFillMax(e.target.value); setCurrentPage(1); }}
            className="w-20 px-2 py-1.5 border border-card-border rounded-lg text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            onClick={() => { setFillMin(''); setFillMax(''); setZoneFilter(''); setTypeFilter(''); setStatusFilter(''); setCurrentPage(1); }}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="bg-white rounded-card border border-card-border overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border bg-gray-50/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Bin ID</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Location</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Zone</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Type</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase w-40">Fill Level</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Last Collected</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Collector</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {binsData.map((bin) => (
              <tr key={bin._id} className="border-b border-card-border last:border-0 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-mono font-semibold text-gray-900">{bin.binId}</td>
                <td className="py-3 px-4 text-gray-700">{bin.location}</td>
                <td className="py-3 px-4"><Badge variant="info">{bin.zone}</Badge></td>
                <td className="py-3 px-4 text-gray-600">{bin.type}</td>
                <td className="py-3 px-4"><ProgressBar value={bin.fillLevel} /></td>
                <td className="py-3 px-4 text-gray-500">{formatLastCollected(bin.lastCollected)}</td>
                <td className="py-3 px-4 text-gray-600">{bin.assignedCollector?.name || '—'}</td>
                <td className="py-3 px-4">
                  <button onClick={() => setSelectedBin(selectedBin?._id === bin._id ? null : bin)} className="text-accent hover:text-accent-dark text-xs font-medium">View</button>
                </td>
              </tr>
            ))}
            {binsData.length === 0 && !loading && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No bins found</td></tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-card-border">
          <p className="text-xs text-gray-500">
            Showing {Math.min((currentPage - 1) * perPage + 1, total)}–{Math.min(currentPage * perPage, total)} of {total} items
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1 ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Bin Detail Panel */}
      {selectedBin && (
        <div className="mt-4 bg-white rounded-card border border-card-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{selectedBin.binId} — Details</h2>
            <button onClick={() => setSelectedBin(null)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Location</p>
              <p className="text-sm text-gray-700">{selectedBin.location}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Zone</p>
              <p className="text-sm text-gray-700">{selectedBin.zone}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Type</p>
              <p className="text-sm text-gray-700">{selectedBin.type || 'General'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Status</p>
              <Badge variant={selectedBin.status === 'critical' ? 'danger' : selectedBin.status === 'warning' ? 'warning' : 'success'}>
                {selectedBin.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Fill Level</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${selectedBin.fillLevel}%`,
                      backgroundColor: selectedBin.status === 'critical' ? '#ef4444' : selectedBin.status === 'warning' ? '#f59e0b' : '#22c55e',
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700">{selectedBin.fillLevel}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Coordinates</p>
              <p className="text-sm text-gray-700 font-mono">
                {selectedBin.coordinates?.lat?.toFixed(4)}, {selectedBin.coordinates?.lng?.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Assigned Collector</p>
              <p className="text-sm text-gray-700">{selectedBin.assignedCollector?.name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Last Collected</p>
              <p className="text-sm text-gray-700">{formatLastCollected(selectedBin.lastCollected)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
