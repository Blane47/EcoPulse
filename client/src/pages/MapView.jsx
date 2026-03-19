import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Badge from '../components/ui/Badge';
import { getBins } from '../api/bins';
import { zoneOverview } from '../data/mockData';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

  const filtered = filter === 'all' ? bins : bins.filter((b) => b.status === filter);

  const statusVariant = (s) => {
    if (s === 'critical') return 'danger';
    if (s === 'warning') return 'warning';
    return 'success';
  };

  return (
    <div style={{ display: 'flex', margin: '-24px', height: 'calc(100vh - 64px)' }}>
      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Filter Pills — positioned below zoom controls */}
        <div style={{ position: 'absolute', top: 12, left: 60, zIndex: 1000, display: 'flex', gap: 8 }}>
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button style={{ flex: 1, backgroundColor: '#0f1623', color: '#fff', fontSize: 12, padding: '6px 0', borderRadius: 6, fontWeight: 500, border: 'none', cursor: 'pointer' }}>Mark Collected</button>
                    <button style={{ flex: 1, border: '1px solid #e5e7eb', fontSize: 12, padding: '6px 0', borderRadius: 6, fontWeight: 500, color: '#4b5563', backgroundColor: '#fff', cursor: 'pointer' }}>Logistics</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Zone Overview Panel */}
      <div style={{ width: 300, backgroundColor: '#fff', borderLeft: '1px solid #e5e7eb', padding: 20, overflowY: 'auto' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Zone Overview</h2>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>Real-time municipality health</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {zoneOverview.map((zone) => (
            <div key={zone.name} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{zone.name}</h3>
                <Badge variant={statusVariant(zone.status)}>{zone.alertCount} Alerts</Badge>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Total Bins: {zone.totalBins}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: 8, borderRadius: 999, backgroundColor: '#22c55e', width: `${zone.efficiency}%` }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{zone.efficiency}%</span>
              </div>
            </div>
          ))}
        </div>

        <button style={{ width: '100%', marginTop: 16, color: '#22c55e', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
          View All Zones →
        </button>
      </div>
    </div>
  );
}
