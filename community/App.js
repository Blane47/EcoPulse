import { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZoneProvider } from './src/context/ZoneContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [splash, setSplash] = useState(true);
  const [splashDark, setSplashDark] = useState(false);
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
  });

  useEffect(() => {
    // Check dark mode before showing splash
    AsyncStorage.getItem('community_dark').then(val => {
      if (val === 'true') setSplashDark(true);
    });
    const timer = setTimeout(() => setSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: splashDark ? '#1a1d29' : '#fff' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (splash) {
    return (
      <View style={[styles.splashContainer, splashDark && { backgroundColor: '#1a1d29' }]}>
        <StatusBar style={splashDark ? 'light' : 'dark'} />
        <Image
          source={require('./src/assets/images/logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <ZoneProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </ZoneProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 500,
    height: 500,
    borderRadius: 100,
  },
});
