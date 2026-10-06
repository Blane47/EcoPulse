import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import Badge from '../components/ui/Badge';
import { getBins, collectBin } from '../api/bins';
import { zoneOverview } from '../data/mockData';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet measures its container once; re-measure whenever the container resizes
// (responsive layout settling, phone rotation) so tiles fill the whole map
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createBinIcon = (status) => {
  const colors = { critical: '#ef4444', warning: '#f59e0b', optimal: '#22c55e', empty: '#22c55e' };
  return L.divIcon({
    className: 'custom-bin-marker',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${colors[status] || '#22c55e'};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const BUEA_CENTER = [4.155, 9.265];

export default function MapView() {
  const [bins, setBins] = useState([]);
  const [filter, setFilter] = useState('all');
  const [collectingId, setCollectingId] = useState(null);
  const [collectError, setCollectError] = useState({ id: null, message: '' });

  useEffect(() => {
    const fetchBins = async () => {
      try {
        const data = await getBins({ limit: 100 });
        setBins(data.bins || []);
      } catch (err) {
        console.error('Map bins fetch error:', err);
      }
    };
    fetchBins();
  }, []);

  const handleMarkCollected = async (id) => {
    setCollectingId(id);
    setCollectError({ id: null, message: '' });
    try {
      const updated = await collectBin(id);
      // Only take the collection fields; the response's assignedCollector isn't populated
      setBins((prev) => prev.map((b) => (b._id === id
        ? { ...b, fillLevel: updated.fillLevel, status: updated.status, lastCollected: updated.lastCollected }
        : b)));
    } catch (err) {
      setCollectError({ id, message: err.response?.data?.message || 'Could not mark this bin as collected.' });
    } finally {
      setCollectingId(null);
    }
  };

  const filtered = filter === 'all' ? bins : bins.filter((b) => b.status === filter);

  const statusVariant = (s) => {
    if (s === 'critical') return 'danger';
    if (s === 'warning') return 'warning';
    return 'success';
  };

  return (
    // Bleeds to the edges of <main> (cancelling its p-4 / sm:p-6); map above the zone panel on phones, side by side from md
    <div className="flex flex-col md:flex-row -m-4 sm:-m-6 md:h-[calc(100vh-64px)]">
      {/* Map Area */}
      <div className="relative h-[60vh] md:h-auto md:flex-1 min-w-0">
        {/* Filter Pills — positioned below zoom controls */}
        <div style={{ position: 'absolute', top: 12, left: 60, right: 12, zIndex: 1000, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { key: 'all', label: 'All Bins' },
            { key: 'critical', label: 'Critical' },
            { key: 'warning', label: 'Warning' },
            { key: 'optimal', label: 'Optimal' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: filter === f.key ? 'none' : '1px solid #e5e7eb',
                backgroundColor: filter === f.key ? '#0f1623' : '#fff',
                color: filter === f.key ? '#fff' : '#4b5563',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <MapContainer center={BUEA_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <InvalidateOnResize />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filtered.map((bin) => (
            <Marker key={bin._id} position={[bin.coordinates?.lat || 4.155, bin.coordinates?.lng || 9.265]} icon={createBinIcon(bin.status)}>
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{bin.binId}</span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 500,
                      backgroundColor: bin.status === 'critical' ? '#fee2e2' : bin.status === 'warning' ? '#fef3c7' : '#dcfce7',
                      color: bin.status === 'critical' ? '#b91c1c' : bin.status === 'warning' ? '#a16207' : '#15803d',
                    }}>{bin.status?.toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>{bin.location}, {bin.zone}</p>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                    <p>Fill: {bin.fillLevel}%</p>
                    <p>LAT: {bin.coordinates?.lat?.toFixed(4)}</p>
                    <p>LNG: {bin.coordinates?.lng?.toFixed(4)}</p>
                  </div>
                  <button
                    onClick={() => handleMarkCollected(bin._id)}
                    disabled={collectingId === bin._id}
                    style={{
                      width: '100%', marginTop: 12, backgroundColor: '#0f1623', color: '#fff', fontSize: 12, padding: '6px 0', borderRadius: 6, fontWeight: 500, border: 'none',
                      cursor: collectingId === bin._id ? 'wait' : 'pointer', opacity: collectingId === bin._id ? 0.6 : 1,
                    }}
                  >
                    {collectingId === bin._id ? 'Saving…' : 'Mark Collected'}
                  </button>
                  {collectError.id === bin._id && (
                    <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 8 }}>{collectError.message}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Zone Overview Panel */}
      <div className="bg-white border-t md:border-t-0 md:border-l border-gray-200 p-5 md:w-[300px] md:shrink-0 md:overflow-y-auto">
        {/* Tailwind classes (not inline colours) so the dark theme applies */}
        <h2 className="text-sm font-bold text-gray-900 mb-1">Zone Overview</h2>
        <p className="text-xs text-gray-400 mb-5">Real-time municipality health</p>

        <div className="flex flex-col gap-4">
          {zoneOverview.map((zone) => (
            <div key={zone.name} className="border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{zone.name}</h3>
                <Badge variant={statusVariant(zone.status)}>{zone.alertCount} Alerts</Badge>
              </div>
              <p className="text-xs text-gray-500 mb-2">Total Bins: {zone.totalBins}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${zone.efficiency}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700">{zone.efficiency}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
