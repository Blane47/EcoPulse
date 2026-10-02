// Zone boundaries defined as center points with radius
// Based on actual bin coordinates from the Buea municipality data
const ZONE_DEFINITIONS = [
  {
    name: 'Molyko',
    center: { lat: 4.1560, lng: 9.2949 },
    radius: 0.8, // km
  },
  {
    name: 'Bonduma',
    center: { lat: 4.1588, lng: 9.2856 },
    radius: 0.6,
  },
  {
    name: 'Great Soppo',
    center: { lat: 4.1637, lng: 9.2772 },
    radius: 0.7,
  },
  {
    name: 'Buea Town',
    center: { lat: 4.1538, lng: 9.2412 },
    radius: 1.0,
  },
];

// Haversine formula — distance between two GPS points in km
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detect which zone the user is in based on GPS coordinates.
 * Returns the zone name or null if not in any zone.
 */
export function detectZone(lat, lng) {
  let closest = null;
  let closestDistance = Infinity;

  for (const zone of ZONE_DEFINITIONS) {
    const distance = getDistanceKm(lat, lng, zone.center.lat, zone.center.lng);
    if (distance <= zone.radius && distance < closestDistance) {
      closest = zone.name;
      closestDistance = distance;
    }
  }

  return closest;
}
