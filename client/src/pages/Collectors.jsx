import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Badge from '../components/ui/Badge';
import AddCollectorModal from '../components/ui/AddCollectorModal';
import AssignZoneModal from '../components/ui/AssignZoneModal';
import { getCollectors } from '../api/collectors';

export default function Collectors() {
  const [collectorsData, setCollectorsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [assignCollector, setAssignCollector] = useState(null);
  const navigate = useNavigate();

  const fetchCollectors = async () => {
      try {
        const data = await getCollectors();
        setCollectorsData(data);
      } catch (err) {
        console.error('Collectors fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchCollectors();
  }, []);

  const activeCount = collectorsData.filter((c) => c.status === 'active').length;
  const onLeaveCount = collectorsData.filter((c) => c.status === 'on-leave').length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collectors</h1>
          <p className="text-sm text-gray-500">Manage field teams and zone assignments for Buea Municipality</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
        >
          <Plus size={16} /> Add Collector
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <span className="px-3 py-1.5 bg-white border border-card-border rounded-full text-sm text-gray-600">
          Total Collectors: <strong>{collectorsData.length}</strong>
        </span>
        <span className="px-3 py-1.5 bg-white border border-card-border rounded-full text-sm text-gray-600">
          Active Today: <strong>{activeCount}</strong>
        </span>
        <span className="px-3 py-1.5 bg-white border border-card-border rounded-full text-sm text-gray-600">
          On Leave: <strong>{onLeaveCount}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collectorsData.map((collector) => (
          <div key={collector._id} className="bg-white rounded-card border border-card-border p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {collector.avatar ? (
                  <img src={collector.avatar} alt={collector.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm">
                    {collector.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{collector.name}</h3>
                  <p className="text-xs text-gray-500">{collector.truck}</p>
                </div>
              </div>
              <Badge variant={collector.status === 'active' ? 'success' : collector.status === 'inactive' ? 'danger' : 'warning'}>
                {collector.status === 'active' ? 'Active' : collector.status === 'inactive' ? 'Inactive' : 'On Leave'}
              </Badge>
            </div>

            <div className="flex gap-1.5 mb-4">
              <span className="text-[10px] px-2 py-0.5 bg-green-50 text-accent rounded-full font-medium">Field Collector</span>
              <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{collector.zone}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase">Bins</p>
                <p className="text-lg font-bold text-gray-900">{collector.binsAssigned}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase">Today</p>
                <p className="text-lg font-bold text-gray-900">{collector.collectionsToday}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase">Month</p>
                <p className="text-lg font-bold text-gray-900">{collector.collectionsMonth}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/collectors/${collector._id}`)}
                className="flex-1 py-2 border border-card-border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >View Profile</button>
              <button
                onClick={() => setAssignCollector(collector)}
                className="flex-1 py-2 border border-accent text-accent rounded-lg text-sm font-medium hover:bg-accent hover:text-white transition-colors"
              >Assign Zone</button>
            </div>
          </div>
        ))}
      </div>

      <AddCollectorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCollectorAdded={fetchCollectors}
      />

      <AssignZoneModal
        isOpen={!!assignCollector}
        onClose={() => setAssignCollector(null)}
        collector={assignCollector}
        onUpdated={fetchCollectors}
      />
    </div>
  );
}
