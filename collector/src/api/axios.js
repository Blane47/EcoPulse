import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  // Set EXPO_PUBLIC_API_URL in .env to http://<your-PC-LAN-IP>:5000/api for a phone
  // on the same Wi-Fi. localhost works on web, or on a USB phone via `adb reverse tcp:5000 tcp:5000`.
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('collector_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(['collector_token', 'collector_user']);
    }
    return Promise.reject(err);
  }
);

export default api;
