import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import { getBins, updateBin } from '../api/bins';
import { zoneOverview } from '../data/mockData';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function MapView() {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const [bins, setBins] = useState([]);
  const [filter, setFilter] = useState('all');
  const [mapLoaded, setMapLoaded] = useState(false);

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

  const handleMarkCollected = async (bin) => {
    try {
      await updateBin(bin._id, { fillLevel: 0, status: 'empty', lastCollected: new Date() });
      setBins(prev => prev.map(b => b._id === bin._id ? { ...b, fillLevel: 0, status: 'empty' } : b));
    } catch (err) {
      console.error('Failed to mark collected:', err);
    }
  };

  // Build map HTML for iframe
  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
      <style>
        * { margin: 0; padding: 0; }
        body { overflow: hidden; }
        #map { width: 100%; height: 100vh; }
        .mapboxgl-ctrl-attrib { display: none !important; }
        .mapboxgl-popup-content {
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          min-width: 220px;
          font-family: Inter, system-ui, sans-serif;
        }
        .mapboxgl-popup-close-button {
          font-size: 20px;
          padding: 4px 10px;
          color: #9ca3af;
        }
        .bin-id { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 2px; }
        .bin-loc { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
        .bin-meta { font-size: 12px; color: #6b7280; margin-bottom: 10px; }
        .bin-meta span { font-weight: 600; }
        .btn-row { display: flex; gap: 8px; }
        .btn-collect {
          flex: 1; padding: 8px 0; border-radius: 10px; border: none; cursor: pointer;
          font-size: 12px; font-weight: 600; background: #111827; color: #fff;
        }
        .btn-logistics {
          flex: 1; padding: 8px 0; border-radius: 10px; cursor: pointer;
          font-size: 12px; font-weight: 600; background: #fff; color: #4b5563;
          border: 1px solid #e5e7eb;
        }
        .status-pill {
          display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 10px;
          border-radius: 12px; text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${MAPBOX_TOKEN}';
        const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/light-v11',
          center: [9.265, 4.155],
          zoom: 13,
          attributionControl: false,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const bins = ${JSON.stringify(filtered.filter(b => b.coordinates?.lat).map(bin => ({
          id: bin._id,
          binId: bin.binId,
          location: bin.location,
          zone: bin.zone,
          fillLevel: bin.fillLevel,
          status: bin.status,
          lat: bin.coordinates.lat,
          lng: bin.coordinates.lng,
        })))};

        map.on('load', () => {
          const geojson = {
            type: 'FeatureCollection',
            features: bins.map(bin => ({
              type: 'Feature',
              properties: bin,
              geometry: { type: 'Point', coordinates: [bin.lng, bin.lat] },
            })),
          };

          map.addSource('bins', { type: 'geojson', data: geojson });

          map.addLayer({
            id: 'bins-glow',
            type: 'circle',
            source: 'bins',
            paint: {
              'circle-radius': 20,
              'circle-color': ['match', ['get', 'status'],
                'critical', '#ef4444',
                'warning', '#f59e0b',
                '#22c55e'
              ],
              'circle-opacity': 0.12,
            },
          });

          map.addLayer({
            id: 'bins-circle',
            type: 'circle',
            source: 'bins',
            paint: {
              'circle-radius': 8,
              'circle-color': ['match', ['get', 'status'],
                'critical', '#ef4444',
                'warning', '#f59e0b',
                '#22c55e'
              ],
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff',
            },
          });

          map.addLayer({
            id: 'bins-label',
            type: 'symbol',
            source: 'bins',
            layout: {
              'text-field': ['get', 'binId'],
              'text-size': 10,
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-offset': [0, 1.6],
            },
            paint: {
              'text-color': '#374151',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            },
          });

          map.on('click', 'bins-circle', (e) => {
            const f = e.features[0];
            const p = f.properties;
            const coords = f.geometry.coordinates.slice();
            const statusColor = p.status === 'critical' ? '#fee2e2' : p.status === 'warning' ? '#fef3c7' : '#dcfce7';
            const statusTextColor = p.status === 'critical' ? '#b91c1c' : p.status === 'warning' ? '#a16207' : '#15803d';

            new mapboxgl.Popup({ offset: 15, maxWidth: '280px' })
              .setLngLat(coords)
              .setHTML(
                '<div class="bin-id">' + p.binId + '</div>' +
                '<div class="bin-loc">' + p.location + ', ' + p.zone + '</div>' +
                '<div class="bin-meta">' +
                  '<span class="status-pill" style="background:' + statusColor + ';color:' + statusTextColor + '">' + p.status + '</span>' +
                  ' &middot; Fill: ' + p.fillLevel + '%' +
                '</div>' +
                '<div class="btn-row">' +
                  '<button class="btn-collect" onclick="parent.postMessage({type:\\'collect\\',id:\\'' + p.id + '\\'},'*\\')">Mark Collected</button>' +
                  '<button class="btn-logistics" onclick="parent.postMessage({type:\\'logistics\\',zone:\\'' + p.zone + '\\'},'*\\')">Logistics</button>' +
                '</div>'
              )
              .addTo(map);
          });

          map.on('mouseenter', 'bins-circle', () => map.getCanvas().style.cursor = 'pointer');
          map.on('mouseleave', 'bins-circle', () => map.getCanvas().style.cursor = '');
        });
      </script>
    </body>
    </html>
  `;

  // Listen for messages from the map iframe
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'collect') {
        const bin = bins.find(b => b._id === e.data.id);
        if (bin) handleMarkCollected(bin);
      } else if (e.data?.type === 'logistics') {
        navigate(`/bins?zone=${e.data.zone}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [bins]);

  return (
    <div style={{ display: 'flex', margin: '-32px', height: 'calc(100vh - 64px)' }}>
      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Filter Pills */}
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', gap: 8 }}>
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
                padding: '8px 16px',
                borderRadius: 24,
                fontSize: 12,
                fontWeight: 600,
                border: filter === f.key ? 'none' : '1px solid #e5e7eb',
                backgroundColor: filter === f.key ? '#111827' : '#fff',
                color: filter === f.key ? '#fff' : '#6b7280',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <iframe
          srcDoc={mapHTML}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Map"
        />
      </div>

      {/* Zone Overview Panel */}
      <div style={{ width: 300, backgroundColor: '#fff', borderLeft: '1px solid #e8ecf1', padding: 24, overflowY: 'auto' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Zone Overview</h2>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 24 }}>Real-time municipality health</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {zoneOverview.map((zone) => (
            <div key={zone.name} style={{ border: '1px solid #e8ecf1', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{zone.name}</h3>
                <Badge variant={statusVariant(zone.status)}>{zone.alertCount} Alerts</Badge>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Total Bins: {zone.totalBins}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: 6, borderRadius: 999, backgroundColor: '#22c55e', width: `${zone.efficiency}%` }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{zone.efficiency}%</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/bins')}
          style={{ width: '100%', marginTop: 20, color: '#22c55e', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View All Zones →
        </button>
      </div>
    </div>
  );
}
