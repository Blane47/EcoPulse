import axios from 'axios';

const api = axios.create({
  // Set EXPO_PUBLIC_API_URL in .env to http://<your-PC-LAN-IP>:5000/api for a phone
  // on the same Wi-Fi. localhost works on web, or on a USB phone via `adb reverse tcp:5000 tcp:5000`.
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export default api;
