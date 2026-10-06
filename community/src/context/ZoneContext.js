import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { detectZone } from '../utils/zoneDetector';
import { normalizePhone } from '../utils/phone';
import { getDeviceToken, saveDeviceToken } from '../utils/deviceToken';
import api from '../api/axios';

const ZoneContext = createContext();

/**
 * Register a phone number with the server (or sign back in from this device) and
 * store the device token it returns. Throws { code: 'INVALID_PHONE' } for an
 * unreadable number; server errors (e.g. 403 PHONE_CLAIMED) are rethrown as-is.
 */
async function registerWithServer({ name, phone, zone }) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw Object.assign(new Error('Invalid phone'), { code: 'INVALID_PHONE' });
  const deviceToken = await getDeviceToken(normalized);
  const { data } = await api.post('/community/auth', { name, phone: normalized, zone }, { deviceToken });
  await saveDeviceToken(data.user.phone, data.deviceToken);
  return data;
}

export function ZoneProvider({ children }) {
  const [zone, setZone] = useState(null);
  const [language, setLanguage] = useState('en');
  const [profile, setProfile] = useState(null); // { name, phone }
  const [autoZone, setAutoZone] = useState(false); // auto-detect mode
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [storedZone, storedLang, storedProfile, storedAutoZone] = await AsyncStorage.multiGet([
        'community_zone', 'community_lang', 'community_profile', 'community_auto_zone',
      ]);
      if (storedZone[1]) setZone(storedZone[1]);
      if (storedLang[1]) setLanguage(storedLang[1]);
      if (storedAutoZone[1] === 'true') setAutoZone(true);

      let stored = storedProfile[1] ? JSON.parse(storedProfile[1]) : null;
      // Profiles saved before device tokens existed (or after an admin reset) have no
      // token yet: claim the number now so chat and reports keep working.
      if (stored?.phone && !(await getDeviceToken(normalizePhone(stored.phone)))) {
        try {
          const data = await registerWithServer({ name: stored.name, phone: stored.phone, zone: storedZone[1] });
          stored = { _id: data.user._id, name: data.user.name, phone: data.user.phone };
          await AsyncStorage.setItem('community_profile', JSON.stringify(stored));
        } catch (err) {
          if (err.response?.status === 403 || err.code === 'INVALID_PHONE') {
            // Number belongs to another phone (or is unreadable): send the user back through onboarding
            await AsyncStorage.multiRemove(['community_profile', 'community_zone']);
            stored = null;
            setZone(null);
          }
          // Network errors: keep the local profile and retry on the next launch
        }
      }
      if (stored) setProfile(stored);
      setLoading(false);
    };
    load();
  }, []);

  // Auto zone detection — watch GPS position
  useEffect(() => {
    if (!autoZone || !zone) return; // need a zone set first (user must onboard)

    // The effect can be cleaned up before the async setup finishes; `cancelled`
    // makes sure a watcher created after cleanup is removed instead of leaking.
    let cancelled = false;
    let sub = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 200, timeInterval: 30000 },
        (location) => {
          const detected = detectZone(location.coords.latitude, location.coords.longitude);
          if (detected && detected !== zone) {
            setZone(detected);
            AsyncStorage.setItem('community_zone', detected);
          }
        }
      );
      if (cancelled) watcher.remove();
      else sub = watcher;
    })();

    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, [autoZone, zone]);

  const selectZone = async (z) => {
    await AsyncStorage.setItem('community_zone', z);
    setZone(z);
  };

  const clearZone = async () => {
    await AsyncStorage.removeItem('community_zone');
    setZone(null);
  };

  const selectLanguage = async (lang) => {
    await AsyncStorage.setItem('community_lang', lang);
    setLanguage(lang);
  };

  const saveProfile = async (p) => {
    await AsyncStorage.setItem('community_profile', JSON.stringify(p));
    setProfile(p);
  };

  // Register (or sign back in) and save the resulting profile
  const registerProfile = async ({ name, phone, zone: profileZone }) => {
    const data = await registerWithServer({ name, phone, zone: profileZone });
    await saveProfile({ _id: data.user._id, name: data.user.name, phone: data.user.phone });
    return data;
  };

  const clearProfile = async () => {
    await AsyncStorage.removeItem('community_profile');
    setProfile(null);
  };

  const toggleAutoZone = async () => {
    const newVal = !autoZone;
    setAutoZone(newVal);
    await AsyncStorage.setItem('community_auto_zone', newVal.toString());
  };

  return (
    <ZoneContext.Provider value={{ zone, selectZone, clearZone, language, selectLanguage, profile, saveProfile, registerProfile, clearProfile, autoZone, toggleAutoZone, loading }}>
      {children}
    </ZoneContext.Provider>
  );
}

export const useZone = () => useContext(ZoneContext);
