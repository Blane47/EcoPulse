import axios from 'axios';
import { getCurrentDeviceToken, removeDeviceToken } from '../utils/deviceToken';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  // Set EXPO_PUBLIC_API_URL in .env to http://<your-PC-LAN-IP>:5000/api for a phone
  // on the same Wi-Fi. localhost works on web, or on a USB phone via `adb reverse tcp:5000 tcp:5000`.
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Identify the resident to the server with this device's token. A request can pass
// `deviceToken` in its config to use a specific token (or null for none).
api.interceptors.request.use(async (config) => {
  const token = config.deviceToken !== undefined ? config.deviceToken : await getCurrentDeviceToken();
  if (token) config.headers['X-Device-Token'] = token;
  return config;
});

// If an admin moved this number to another phone, forget the stale token;
// the app re-registers the number on its next launch.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && err.response.data?.code === 'DEVICE_TOKEN_INVALID') {
      try {
        const profile = JSON.parse((await AsyncStorage.getItem('community_profile')) || 'null');
        if (profile?.phone) await removeDeviceToken(profile.phone);
      } catch {}
    }
    return Promise.reject(err);
  }
);

export default api;
