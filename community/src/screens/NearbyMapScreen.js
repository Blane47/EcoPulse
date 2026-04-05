import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import { ArrowLeftIcon } from '../components/Icons';
import TealHeader from '../components/TealHeader';
import api from '../api/axios';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
const statusColors = { critical: '#ef4444', warning: '#f59e0b', optimal: '#22c55e' };

const buildMapHTML = (bins) => {
  const geojson = {
    type: 'FeatureCollection',
    features: bins.filter(b => b.coordinates?.lat).map((bin) => ({
      type: 'Feature',
      properties: {
        binId: bin.binId,
        location: bin.location,
        fillLevel: bin.fillLevel,
        status: bin.status,
        color: bin.status === 'critical' ? '#ef4444' : bin.status === 'warning' ? '#f59e0b' : '#22c55e',
      },
      geometry: {
        type: 'Point',
        coordinates: [bin.coordinates.lng, bin.coordinates.lat],
      },
    })),
  };

  const mapStyle = 'mapbox://styles/mapbox/streets-v12';
  const popupTextColor = '#1f2937';
  const popupSubColor = '#6b7280';
  const popupBg = '#ffffff';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
      <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
      <style>
        * { margin: 0; padding: 0; }
        body { overflow: hidden; }
        #map { width: 100vw; height: 100vh; }
        .mapboxgl-ctrl-attrib { display: none !important; }
        .bin-popup {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 4px 0;
        }
        .bin-popup .bin-id {
          font-size: 14px;
          font-weight: 700;
          color: ${popupTextColor};
          margin-bottom: 2px;
        }
        .bin-popup .bin-loc {
          font-size: 12px;
          color: ${popupSubColor};
          margin-bottom: 4px;
        }
        .bin-popup .bin-fill {
          font-size: 12px;
          font-weight: 600;
        }
        .mapboxgl-popup-content {
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          background: ${popupBg};
        }
        .mapboxgl-popup-close-button {
          font-size: 18px;
          padding: 4px 8px;
          color: #9ca3af;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${MAPBOX_TOKEN}';
        const map = new mapboxgl.Map({
          container: 'map',
          style: '${mapStyle}',
          center: [9.2920, 4.1597],
          zoom: 13.5,
          attributionControl: false,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
        map.addControl(new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }));

        map.on('load', () => {
          map.addSource('bins', {
            type: 'geojson',
            data: ${JSON.stringify(geojson)},
          });

          map.addLayer({
            id: 'bins-glow',
            type: 'circle',
            source: 'bins',
            paint: {
              'circle-radius': 16,
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.15,
            },
          });

          map.addLayer({
            id: 'bins-circle',
            type: 'circle',
            source: 'bins',
            paint: {
              'circle-radius': 9,
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.9,
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
              'text-offset': [0, 1.8],
            },
            paint: {
              'text-color': '#374151',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            },
          });

          map.on('click', 'bins-circle', (e) => {
            const f = e.features[0];
            const coords = f.geometry.coordinates.slice();
            const statusText = f.properties.status === 'critical' ? 'Critical' : f.properties.status === 'warning' ? 'Warning' : 'Optimal';
            const statusColor = f.properties.color;

            new mapboxgl.Popup({ offset: 15 })
              .setLngLat(coords)
              .setHTML(
                '<div class="bin-popup">' +
                  '<div class="bin-id">' + f.properties.binId + '</div>' +
                  '<div class="bin-loc">' + f.properties.location + '</div>' +
                  '<div class="bin-fill" style="color:' + statusColor + '">' + f.properties.fillLevel + '% — ' + statusText + '</div>' +
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
};

export default function NearbyMapScreen({ navigation }) {
  const { zone, language } = useZone();
  const en = language === 'en';
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBins = async () => {
      try {
        const { data } = await api.get('/bins', { params: { zone } });
        const list = data.bins || data;
        setBins(Array.isArray(list) ? list : []);
      } catch {
        setBins([
          { _id: '1', binId: 'BIN-001', location: 'UB Junction', fillLevel: 89, status: 'critical', coordinates: { lat: 4.1597, lng: 9.2920 } },
          { _id: '2', binId: 'BIN-042', location: 'Mile 17', fillLevel: 62, status: 'warning', coordinates: { lat: 4.1550, lng: 9.2850 } },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchBins();
  }, [zone]);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.accent} /></View>;

  return (
    <View style={styles.container}>
      <TealHeader title={en ? 'Nearby Bins' : 'Bacs Proches'} />
      <View style={styles.legendOverlay}>
        {Object.entries(statusColors).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{status}</Text>
          </View>
        ))}
      </View>

      <WebView
        style={styles.map}
        source={{ html: buildMapHTML(bins) }}
        javaScriptEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  map: { flex: 1 },
  legendOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
});
