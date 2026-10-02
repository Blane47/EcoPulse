import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { detectZone } from '../utils/zoneDetector';

const ZoneContext = createContext();

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
      if (storedProfile[1]) setProfile(JSON.parse(storedProfile[1]));
      if (storedAutoZone[1] === 'true') setAutoZone(true);
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
    <ZoneContext.Provider value={{ zone, selectZone, clearZone, language, selectLanguage, profile, saveProfile, clearProfile, autoZone, toggleAutoZone, loading }}>
      {children}
    </ZoneContext.Provider>
  );
}

export const useZone = () => useContext(ZoneContext);
