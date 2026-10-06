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

// Empties the bin (fillLevel 0, status 'empty', lastCollected now). Admins don't send a location, so
// the server's 100m proximity check (required for collectors) doesn't apply
export const collectBin = async (id) => {
  const { data } = await api.patch(`/bins/${id}/collect`, {});
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
