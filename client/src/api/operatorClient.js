import axios from 'axios';

// A SEPARATE axios instance for the operator portal, so the operator's JWT
// (operator_token) never collides with the municipal admin's token. The admin
// dashboard keeps using ./axios.
const operatorApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

operatorApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('operator_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

operatorApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('operator_token');
      localStorage.removeItem('operator');
      if (!window.location.pathname.startsWith('/operator/login')) {
        window.location.href = '/operator/login';
      }
    }
    return Promise.reject(error);
  }
);

export default operatorApi;
