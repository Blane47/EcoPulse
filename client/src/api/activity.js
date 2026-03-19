import api from './axios';

export const getRecentActivity = async (limit = 10) => {
  const { data } = await api.get('/activity', { params: { limit } });
  return data;
};

export const logCollection = async (collectorId, binId) => {
  const { data } = await api.post('/activity/collect', { collectorId, binId });
  return data;
};

export const getDashboardStats = async () => {
  const { data } = await api.get('/activity/dashboard');
  return data;
};
