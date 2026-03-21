import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Animated, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows } from '../theme';
import { navigateToBin, verifiedCollect } from '../utils/collectBin';
import api from '../api/axios';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const statusColors = { critical: colors.critical, warning: colors.warning, optimal: colors.accent };

const buildMapHTML = (bins, searchQuery) => {
  const filtered = bins
    .filter((b) => b.coordinates?.lat)
    .filter((b) => !searchQuery || b.location.toLowerCase().includes(searchQuery.toLowerCase()) || b.binId.toLowerCase().includes(searchQuery.toLowerCase()));

  const markers = filtered.map((bin) => {
    const color = bin.status === 'critical' ? '#ef4444' : bin.status === 'warning' ? '#f59e0b' : '#22c55e';
    return `
      L.circleMarker([${bin.coordinates.lat}, ${bin.coordinates.lng}], {
        radius: 12,
        fillColor: '${color}',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map)
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', binId: '${bin._id}' }));
        })
        .bindTooltip('${bin.binId}', { permanent: false, direction: 'top', offset: [0, -10] });
    `;
  }).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; }
        #map { width: 100vw; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([4.1597, 9.2920], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19
        }).addTo(map);
        ${markers}
        map.on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress' }));
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
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search bin or location..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity>
            <Text style={styles.micIcon}>🎤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* OpenStreetMap via WebView */}
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
                  <Text style={styles.actionBtnText}>Navigate 🗺️</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.collectBtn} onPress={handleCollect} activeOpacity={0.8} disabled={collecting}>
                <View style={styles.collectBtnInner}>
                  {collecting ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <Text style={styles.collectBtnText}>Mark Collected ✅</Text>
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
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  micIcon: { fontSize: 18, marginLeft: 8 },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 80,
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
