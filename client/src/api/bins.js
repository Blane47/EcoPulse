import api from './axios';

export const getBins = async (params = {}) => {
  const { data } = await api.get('/bins', { params });
  return data;
};

export const getBinById = async (id) => {
  const { data } = await api.get(`/bins/${id}`);
  return data;
};

export const createBin = async (binData) => {
  const { data } = await api.post('/bins', binData);
  return data;
};

export const updateBin = async (id, binData) => {
  const { data } = await api.put(`/bins/${id}`, binData);
  return data;
};

export const deleteBin = async (id) => {
  const { data } = await api.delete(`/bins/${id}`);
  return data;
};

export const getBinStats = async () => {
  const { data } = await api.get('/bins/stats');
  return data;
};
