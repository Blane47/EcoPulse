import api from './axios';

export const getCollectors = async (params = {}) => {
  const { data } = await api.get('/collectors', { params });
  return data;
};

export const getCollectorById = async (id) => {
  const { data } = await api.get(`/collectors/${id}`);
  return data;
};

// Resolves to { collector, temporaryPassword } — the password is only ever returned here
export const createCollector = async (collectorData) => {
  const { data } = await api.post('/collectors', collectorData);
  return data;
};

export const updateCollector = async (id, collectorData) => {
  const { data } = await api.put(`/collectors/${id}`, collectorData);
  return data;
};

// Issues a new temporary password; resolves to { email, temporaryPassword }
export const resetCollectorPassword = async (id) => {
  const { data } = await api.post(`/collectors/${id}/reset-password`);
  return data;
};

export const deleteCollector = async (id) => {
  const { data } = await api.delete(`/collectors/${id}`);
  return data;
};
