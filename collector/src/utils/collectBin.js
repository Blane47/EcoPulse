import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';
import { shrinkPhoto } from './shrinkPhoto';

// This module is not a component, so it reads the language straight from storage
async function isEnglish() {
  try {
    return (await AsyncStorage.getItem('collector_lang')) !== 'fr';
  } catch {
    return true;
  }
}

/**
 * Opens native maps with turn-by-turn directions to a bin.
 */
export async function navigateToBin(bin) {
  const en = await isEnglish();
  const lat = bin.coordinates?.lat;
  const lng = bin.coordinates?.lng;
  if (!lat || !lng) {
    Alert.alert(
      en ? 'No Coordinates' : 'Pas de coordonnées',
      en ? 'This bin does not have GPS coordinates.' : "Ce bac n'a pas de coordonnées GPS."
    );
    return;
  }
  const label = encodeURIComponent(bin.location || bin.binId);
  const url = Platform.select({
    ios: `maps:?daddr=${lat},${lng}&dirflg=d`,
    android: `google.navigation:q=${lat},${lng}&mode=d`,
  });
  Linking.openURL(url).catch(() => {
    // Fallback to Google Maps web
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {
      Alert.alert(
        en ? 'Could not open maps' : "Impossible d'ouvrir la carte",
        en
          ? 'No maps app or browser is available on this phone.'
          : "Aucune application de cartes ni navigateur n'est disponible sur ce téléphone."
      );
    });
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
  const en = await isEnglish();

  // Check if collector is on leave
  try {
    const storedUser = await AsyncStorage.getItem('collector_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.status === 'on-leave') {
        Alert.alert(
          en ? 'On Leave' : 'En congé',
          en
            ? 'You are currently on leave. Collection actions are disabled. Contact your supervisor to resume duty.'
            : 'Vous êtes actuellement en congé. Les collectes sont désactivées. Contactez votre superviseur pour reprendre le service.'
        );
        return { success: false, message: 'On leave' };
      }
    }
  } catch {
    // Unreadable cached profile: this is only a local pre-check, carry on with the collection
  }

  // Step 1: Request location permission
  const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
  if (locStatus !== 'granted') {
    Alert.alert(
      en ? 'Location Required' : 'Localisation requise',
      en
        ? 'Please enable location access to verify you are near the bin.'
        : "Veuillez activer l'accès à la localisation pour vérifier que vous êtes près du bac."
    );
    return { success: false, message: 'Location permission denied' };
  }

  // Step 2: Get current location
  let location;
  try {
    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  } catch {
    Alert.alert(
      en ? 'Location Error' : 'Erreur de localisation',
      en
        ? 'Could not get your current location. Please try again.'
        : "Impossible d'obtenir votre position actuelle. Veuillez réessayer."
    );
    return { success: false, message: 'Location unavailable' };
  }

  const collectorLat = location.coords.latitude;
  const collectorLng = location.coords.longitude;

  // Step 3: Client-side proximity check (gives instant feedback)
  if (bin.coordinates?.lat && bin.coordinates?.lng) {
    const distance = getDistanceMeters(collectorLat, collectorLng, bin.coordinates.lat, bin.coordinates.lng);
    if (distance > 100) {
      Alert.alert(
        en ? 'Too Far Away' : 'Trop loin',
        en
          ? `You are ${Math.round(distance)}m from this bin. You must be within 100m to mark it as collected.\n\nUse the Navigate button to get directions.`
          : `Vous êtes à ${Math.round(distance)} m de ce bac. Vous devez être à moins de 100 m pour le marquer comme collecté.\n\nAppuyez sur « Y aller » pour obtenir l'itinéraire.`,
        [{ text: 'OK' }]
      );
      return { success: false, message: 'Too far', distance: Math.round(distance) };
    }
  }

  // Step 4: Request camera permission and take photo
  const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
  if (camStatus !== 'granted') {
    Alert.alert(
      en ? 'Camera Required' : 'Appareil photo requis',
      en
        ? 'Please enable camera access to take a proof photo of the emptied bin.'
        : "Veuillez activer l'accès à l'appareil photo pour prendre une photo du bac vidé comme preuve."
    );
    return { success: false, message: 'Camera permission denied' };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled) {
    return { success: false, message: 'Photo cancelled' };
  }

  let photoUri;
  let photoBase64;
  try {
    ({ uri: photoUri, dataUrl: photoBase64 } = await shrinkPhoto(result.assets[0]));
  } catch {
    Alert.alert(en ? 'Photo problem' : 'Problème de photo', en ? 'Could not process the photo. Please try again.' : 'Impossible de traiter la photo. Veuillez réessayer.');
    return { success: false, message: 'Photo processing failed' };
  }

  // Step 5: Send to server with GPS + photo
  try {
    const response = await api.patch(`/bins/${bin._id}/collect`, {
      lat: collectorLat,
      lng: collectorLng,
      photo: photoBase64,
    });

    Alert.alert(
      en ? 'Collected!' : 'Collecté !',
      en ? `${bin.binId} has been marked as collected.` : `${bin.binId} a été marqué comme collecté.`,
      [{ text: 'OK' }]
    );
    return { success: true, bin: response.data, photoUri };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to mark bin as collected';
    // Server messages are English, so French gets its own wording per failure
    const tooFar = err.response?.data?.distance;
    let shown;
    if (!err.response) {
      shown = en
        ? 'Could not reach the server. Check your internet connection and try again.'
        : 'Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez.';
    } else if (tooFar != null) {
      shown = en
        ? `You are ${tooFar}m away. You must be within 100m of the bin to mark it as collected.`
        : `Vous êtes à ${tooFar} m. Vous devez être à moins de 100 m du bac pour le marquer comme collecté.`;
    } else if (err.response.status === 404) {
      shown = en ? 'This bin no longer exists.' : "Ce bac n'existe plus.";
    } else {
      shown = en ? msg : 'Impossible de marquer ce bac comme collecté. Veuillez réessayer.';
    }
    Alert.alert(en ? 'Collection Failed' : 'Échec de la collecte', shown);
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
