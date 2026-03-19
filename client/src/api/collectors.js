import api from './axios';

export const getCollectors = async (params = {}) => {
  const { data } = await api.get('/collectors', { params });
  return data;
};

export const getCollectorById = async (id) => {
  const { data } = await api.get(`/collectors/${id}`);
  return data;
};

export const createCollector = async (collectorData) => {
  const { data } = await api.post('/collectors', collectorData);
  return data;
};

export const updateCollector = async (id, collectorData) => {
  const { data } = await api.put(`/collectors/${id}`, collectorData);
  return data;
};

export const deleteCollector = async (id) => {
  const { data } = await api.delete(`/collectors/${id}`);
  return data;
};
