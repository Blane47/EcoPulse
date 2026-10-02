import { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (splash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="dark" />
        <Image
          source={require('./src/assets/images/logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  splashLogo: {
    width: 500,
    height: 500,
    borderRadius: 100,
  },
});
