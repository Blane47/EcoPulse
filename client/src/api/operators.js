import api from './axios';

// Super-admin (municipal council) operator governance. These hit the
// requireSuperAdmin-gated endpoints, so the admin's stored JWT (attached by the
// axios interceptor) authorises them.

export const getOperators = async (params = {}) => {
  const { data } = await api.get('/operators', { params });
  return data;
};

export const getOperatorById = async (id) => {
  const { data } = await api.get(`/operators/${id}`);
  return data;
};

export const approveOperator = async (id) => {
  const { data } = await api.patch(`/operators/${id}/approve`);
  return data;
};

export const rejectOperator = async (id) => {
  const { data } = await api.patch(`/operators/${id}/reject`);
  return data;
};

export const suspendOperator = async (id) => {
  const { data } = await api.patch(`/operators/${id}/suspend`);
  return data;
};
