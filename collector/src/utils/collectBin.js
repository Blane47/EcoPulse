import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

/**
 * Opens native maps with turn-by-turn directions to a bin.
 */
export function navigateToBin(bin) {
  const lat = bin.coordinates?.lat;
  const lng = bin.coordinates?.lng;
  if (!lat || !lng) {
    Alert.alert('No Coordinates', 'This bin does not have GPS coordinates.');
    return;
  }
  const label = encodeURIComponent(bin.location || bin.binId);
  const url = Platform.select({
    ios: `maps:?daddr=${lat},${lng}&dirflg=d`,
    android: `google.navigation:q=${lat},${lng}&mode=d`,
  });
  Linking.openURL(url).catch(() => {
    // Fallback to Google Maps web
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  });
}

/**
 * Full verified collection flow:
 * 1. Get collector's GPS location
 * 2. Check proximity (must be within 100m)
 * 3. Open camera for proof photo
 * 4. Send to API
 *
 * Returns { success, message } or throws.
 */
export async function verifiedCollect(bin) {
  // Check if collector is on leave
  try {
    const storedUser = await AsyncStorage.getItem('collector_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.status === 'on-leave') {
        Alert.alert('On Leave', 'You are currently on leave. Collection actions are disabled. Contact your supervisor to resume duty.');
        return { success: false, message: 'On leave' };
      }
    }
  } catch {}

  // Step 1: Request location permission
  const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
  if (locStatus !== 'granted') {
    Alert.alert('Location Required', 'Please enable location access to verify you are near the bin.');
    return { success: false, message: 'Location permission denied' };
  }

  // Step 2: Get current location
  let location;
  try {
    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  } catch {
    Alert.alert('Location Error', 'Could not get your current location. Please try again.');
    return { success: false, message: 'Location unavailable' };
  }

  const collectorLat = location.coords.latitude;
  const collectorLng = location.coords.longitude;

  // Step 3: Client-side proximity check (gives instant feedback)
  if (bin.coordinates?.lat && bin.coordinates?.lng) {
    const distance = getDistanceMeters(collectorLat, collectorLng, bin.coordinates.lat, bin.coordinates.lng);
    if (distance > 100) {
      Alert.alert(
        'Too Far Away',
        `You are ${Math.round(distance)}m from this bin. You must be within 100m to mark it as collected.\n\nUse the Navigate button to get directions.`,
        [{ text: 'OK' }]
      );
      return { success: false, message: 'Too far', distance: Math.round(distance) };
    }
  }

  // Step 4: Request camera permission and take photo
  const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
  if (camStatus !== 'granted') {
    Alert.alert('Camera Required', 'Please enable camera access to take a proof photo of the emptied bin.');
    return { success: false, message: 'Camera permission denied' };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
    allowsEditing: false,
  });

  if (result.canceled) {
    return { success: false, message: 'Photo cancelled' };
  }

  const photoUri = result.assets[0].uri;
  const photoBase64 = result.assets[0].base64
    ? `data:image/jpeg;base64,${result.assets[0].base64}`
    : null;

  // Step 5: Send to server with GPS + photo
  try {
    const response = await api.patch(`/bins/${bin._id}/collect`, {
      lat: collectorLat,
      lng: collectorLng,
      photo: photoBase64,
    });

    Alert.alert('Collected!', `${bin.binId} has been marked as collected.`, [{ text: 'OK' }]);
    return { success: true, bin: response.data, photoUri };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to mark bin as collected';
    Alert.alert('Collection Failed', msg);
    return { success: false, message: msg };
  }
}

// Haversine formula — distance in meters
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
