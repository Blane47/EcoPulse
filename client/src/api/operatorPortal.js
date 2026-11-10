import operatorApi from './operatorClient';

// Operator-admin portal calls. All are scoped to the signed-in operator by the
// operatorAuth middleware (the token carries the operatorId).

export const loginOperator = async (email, password) => {
  const { data } = await operatorApi.post('/operators/login', { email, password });
  return data; // { operator, token }
};

// Public self-registration — starts the operator as 'pending' until a super-admin approves.
export const registerOperator = async (payload) => {
  const { data } = await operatorApi.post('/operators/register', payload);
  return data;
};

export const getMe = async () => {
  const { data } = await operatorApi.get('/operators/me');
  return data;
};

export const getJobs = async (status) => {
  const { data } = await operatorApi.get('/pickups', { params: status ? { status } : {} });
  return data;
};

export const getMyCollectors = async () => {
  const { data } = await operatorApi.get('/operators/me/collectors');
  return data;
};

export const acceptJob = async (id, collectorId) => {
  const { data } = await operatorApi.patch(`/pickups/${id}/accept`, { collectorId });
  return data;
};

export const advanceJob = async (id, status) => {
  const { data } = await operatorApi.patch(`/pickups/${id}/status`, { status });
  return data;
};

export const updateOperatorProfile = async (id, body) => {
  const { data } = await operatorApi.patch(`/operators/${id}`, body);
  return data;
};
