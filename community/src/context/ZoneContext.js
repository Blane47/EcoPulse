import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ZoneContext = createContext();

export function ZoneProvider({ children }) {
  const [zone, setZone] = useState(null);
  const [language, setLanguage] = useState('en');
  const [profile, setProfile] = useState(null); // { name, phone }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [storedZone, storedLang, storedProfile] = await AsyncStorage.multiGet([
        'community_zone', 'community_lang', 'community_profile',
      ]);
      if (storedZone[1]) setZone(storedZone[1]);
      if (storedLang[1]) setLanguage(storedLang[1]);
      if (storedProfile[1]) setProfile(JSON.parse(storedProfile[1]));
      setLoading(false);
    };
    load();
  }, []);

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

  return (
    <ZoneContext.Provider value={{ zone, selectZone, clearZone, language, selectLanguage, profile, saveProfile, clearProfile, loading }}>
      {children}
    </ZoneContext.Provider>
  );
}

export const useZone = () => useContext(ZoneContext);
