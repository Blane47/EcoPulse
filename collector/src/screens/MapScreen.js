import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Animated, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows } from '../theme';
import { navigateToBin, verifiedCollect } from '../utils/collectBin';
import { SearchIcon, MapPinIcon, CheckIcon } from '../components/Icons';
import api from '../api/axios';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const statusColors = { critical: colors.critical, warning: colors.warning, optimal: colors.accent };

const buildMapHTML = (bins, searchQuery) => {
  const filtered = bins
    .filter((b) => b.coordinates?.lat)
    .filter((b) => !searchQuery || b.location.toLowerCase().includes(searchQuery.toLowerCase()) || b.binId.toLowerCase().includes(searchQuery.toLowerCase()));

  const geojson = {
    type: 'FeatureCollection',
    features: filtered.map((bin) => ({
      type: 'Feature',
      properties: {
        id: bin._id,
        binId: bin.binId,
        color: bin.status === 'critical' ? '#ef4444' : bin.status === 'warning' ? '#f59e0b' : '#22c55e',
        fillLevel: bin.fillLevel,
      },
      geometry: {
        type: 'Point',
        coordinates: [bin.coordinates.lng, bin.coordinates.lat],
      },
    })),
  };

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
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${MAPBOX_TOKEN}';
        const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [9.2920, 4.1597],
          zoom: 13.5,
          attributionControl: false,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

        map.on('load', () => {
          map.addSource('bins', {
            type: 'geojson',
            data: ${JSON.stringify(geojson)},
          });

          // Outer glow
          map.addLayer({
            id: 'bins-glow',
            type: 'circle',
            source: 'bins',
            paint: {
              'circle-radius': 18,
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.15,
            },
          });

          // Main circle
          map.addLayer({
            id: 'bins-circle',
            type: 'circle',
            source: 'bins',
            paint: {
              'circle-radius': 10,
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.9,
            },
          });

          // Fill level label
          map.addLayer({
            id: 'bins-label',
            type: 'symbol',
            source: 'bins',
            layout: {
              'text-field': ['concat', ['get', 'fillLevel'], '%'],
              'text-size': 9,
              'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              'text-offset': [0, -2],
            },
            paint: {
              'text-color': '#1f2937',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1,
            },
          });

          // Click handler
          map.on('click', 'bins-circle', (e) => {
            const feature = e.features[0];
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'markerPress',
              binId: feature.properties.id,
            }));
          });

          map.on('click', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['bins-circle'] });
            if (!features.length) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress' }));
            }
          });

          // Cursor
          map.on('mouseenter', 'bins-circle', () => map.getCanvas().style.cursor = 'pointer');
          map.on('mouseleave', 'bins-circle', () => map.getCanvas().style.cursor = '');
        });
      </script>
    </body>
    </html>
  `;
};

export default function MapScreen() {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBin, setSelectedBin] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collecting, setCollecting] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef(null);

  useEffect(() => {
    const fetchBins = async () => {
      try {
        const { data } = await api.get('/bins');
        const list = data.bins || data;
        setBins(Array.isArray(list) ? list : []);
      } catch {
        setBins([
          { _id: '1', binId: 'BIN-001', location: 'UB Main Gate, Molyko', fillLevel: 92, status: 'critical', coordinates: { lat: 4.1548, lng: 9.2985 } },
          { _id: '2', binId: 'BIN-042', location: 'Bonduma Junction', fillLevel: 68, status: 'warning', coordinates: { lat: 4.1585, lng: 9.2868 } },
          { _id: '3', binId: 'BIN-023', location: 'Great Soppo Market', fillLevel: 78, status: 'warning', coordinates: { lat: 4.1630, lng: 9.2790 } },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchBins();
  }, []);

  const handleMarkerPress = (bin) => {
    setSelectedBin(bin);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 10 }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetAnim, { toValue: 0, useNativeDriver: true, duration: 200 }).start(() => {
      setSelectedBin(null);
    });
  };

  const handleWebViewMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'markerPress') {
        const bin = bins.find((b) => b._id === msg.binId);
        if (bin) handleMarkerPress(bin);
      } else if (msg.type === 'mapPress') {
        closeSheet();
      }
    } catch {}
  };

  const handleNavigate = () => {
    if (!selectedBin) return;
    navigateToBin(selectedBin);
  };

  const handleCollect = async () => {
    if (!selectedBin) return;
    setCollecting(true);
    const result = await verifiedCollect(selectedBin);
    if (result.success) {
      setBins((prev) =>
        prev.map((b) => (b._id === selectedBin._id ? { ...b, fillLevel: 0, status: 'optimal' } : b))
      );
      setSelectedBin((prev) => prev ? { ...prev, fillLevel: 0, status: 'optimal' } : null);
    }
    setCollecting(false);
  };

  const statusLabel = (status) => {
    if (status === 'critical') return 'Critical';
    if (status === 'warning') return 'Warning';
    return 'Optimal';
  };

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [350, 0],
  });

  if (loading) {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIcon}>
            <SearchIcon size={16} color={colors.textMuted} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search bin or location..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Mapbox Map */}
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: buildMapHTML(bins, searchQuery) }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
      />

      {/* Bottom Sheet */}
      {selectedBin && (
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetContent}>
            {/* Bin Info Row */}
            <View style={styles.sheetInfoRow}>
              <Image
                source={require('../assets/images/bin-icon.png')}
                style={styles.sheetBinImage}
                resizeMode="cover"
              />
              <View style={styles.sheetBinInfo}>
                <Text style={styles.sheetBinId}>{selectedBin.binId}</Text>
                <Text style={styles.sheetBinLocation}>{selectedBin.location}</Text>
              </View>
              <View style={styles.sheetBinStatus}>
                <View style={[styles.statusPill, { backgroundColor: (statusColors[selectedBin.status] || colors.accent) + '20' }]}>
                  <Text style={[styles.statusPillText, { color: statusColors[selectedBin.status] || colors.accent }]}>
                    {selectedBin.fillLevel}% {statusLabel(selectedBin.status)}
                  </Text>
                </View>
                <Text style={styles.sheetDistance}>0.7km away</Text>
              </View>
            </View>

            {/* Capacity Level */}
            <View style={styles.capacitySection}>
              <Text style={styles.capacityLabel}>CAPACITY LEVEL</Text>
              <Text style={[styles.criticalZone, { color: statusColors[selectedBin.status] || colors.accent }]}>
                {selectedBin.status === 'critical' ? 'Critical Zone' : selectedBin.status === 'warning' ? 'Warning Zone' : 'Safe Zone'}
              </Text>
            </View>
            <View style={styles.capacityBar}>
              <LinearGradient
                colors={['#22c55e', '#f59e0b', '#ef4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.capacityFill, { width: `${selectedBin.fillLevel}%` }]}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.navigateBtn} onPress={handleNavigate} activeOpacity={0.8}>
                <LinearGradient colors={gradients.greenButton} style={styles.actionGradient}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.actionBtnText}>Navigate</Text>
                    <MapPinIcon size={16} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.collectBtn} onPress={handleCollect} activeOpacity={0.8} disabled={collecting}>
                <View style={styles.collectBtnInner}>
                  {collecting ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.collectBtnText}>Mark Collected</Text>
                      <CheckIcon size={16} color={colors.accent} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Search
  searchContainer: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadows.cardHover,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 10,
    ...shadows.bottom,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cardBorder,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetContent: { paddingHorizontal: 20 },

  // Bin Info
  sheetInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetBinImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    marginRight: 12,
  },
  sheetBinInfo: { flex: 1 },
  sheetBinId: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetBinLocation: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sheetBinStatus: { alignItems: 'flex-end' },
  statusPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  sheetDistance: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  // Capacity
  capacitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  capacityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  criticalZone: { fontSize: 12, fontWeight: '600' },
  capacityBar: {
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  capacityFill: { height: 8, borderRadius: 4 },

  // Action Buttons
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  navigateBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  actionGradient: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  collectBtn: { flex: 1 },
  collectBtnInner: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  collectBtnText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
