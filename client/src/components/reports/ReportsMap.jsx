import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet measures its container once; re-measure whenever the container resizes
// (the detail panel opening beside the map, phone rotation) so tiles fill the whole map
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

// Same colour families as the status badges on the Community Reports page
const STATUS_STYLES = {
  pending: { label: 'Pending', hex: '#f59e0b', dot: 'bg-amber-500' },
  reviewed: { label: 'Reviewed', hex: '#3b82f6', dot: 'bg-blue-500' },
  assigned: { label: 'Assigned', hex: '#8b5cf6', dot: 'bg-violet-500' },
  collected: { label: 'Collected', hex: '#22c55e', dot: 'bg-green-500' },
};

const createReportIcon = (status, selected) => {
  const size = selected ? 30 : 22;
  const ring = selected ? '0 0 0 3px #111827,' : '';
  return L.divIcon({
    className: 'custom-report-marker',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${(STATUS_STYLES[status] || STATUS_STYLES.pending).hex};border:3px solid white;box-shadow:${ring}0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Built once per status, normal and selected
const ICONS = Object.fromEntries(
  Object.keys(STATUS_STYLES).map((s) => [s, { normal: createReportIcon(s, false), selected: createReportIcon(s, true) }])
);

const BUEA_CENTER = [4.155, 9.265];

const hasLocation = (report) => Boolean(report.coordinates?.lat && report.coordinates?.lng);

export default function ReportsMap({ reports, selectedId, onSelect }) {
  const located = reports.filter(hasLocation);
  const missing = reports.length - located.length;

  return (
    <div>
      {missing > 0 && (
        <p className="text-xs text-gray-500 mb-2">
          {missing} of {reports.length} report{reports.length === 1 ? '' : 's'} {missing === 1 ? 'has' : 'have'} no location and {missing === 1 ? "isn't" : "aren't"} shown on the map.
        </p>
      )}

      {/* isolate keeps Leaflet's high z-index panes below the full-screen detail sheet and photo viewer */}
      <div className="relative isolate h-[60vh] lg:h-[calc(100vh-340px)] lg:min-h-[420px] rounded-xl overflow-hidden border border-card-border">
        <MapContainer center={BUEA_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <InvalidateOnResize />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {located.map((report) => {
            const isSelected = report._id === selectedId;
            const icons = ICONS[report.status] || ICONS.pending;
            return (
              <Marker
                key={report._id}
                position={[report.coordinates.lat, report.coordinates.lng]}
                icon={isSelected ? icons.selected : icons.normal}
                title={report.location}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{ click: () => onSelect(report) }}
              />
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute top-3 right-3 z-[1000] bg-white rounded-lg border border-card-border shadow-sm px-3 py-2 space-y-1">
          {Object.entries(STATUS_STYLES).map(([key, s]) => (
            <div key={key} className="flex items-center gap-2 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
