import api from './axios';

// On-demand pickup jobs for a private-operator collector (Trash Vallet feature).
// The collector JWT is attached automatically by ./axios.

// Jobs assigned to the signed-in collector (active + recently completed).
export const getAssignedPickups = async () => {
  const { data } = await api.get('/pickups/assigned');
  return data;
};

// Advance a job in the field: en_route → picked_up → completed.
export const advancePickup = async (id, status) => {
  const { data } = await api.patch(`/pickups/${id}/advance`, { status });
  return data;
};

// Toggle on-demand availability.
export const setDuty = async (onDuty) => {
  const { data } = await api.patch('/collectors/me/duty', { onDuty });
  return data;
};
