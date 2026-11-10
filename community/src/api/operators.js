import api from './axios';

// On-demand private operators (Trash Vallet feature) from the resident's side.
// The device-token header is attached automatically by ./axios, which is what the
// server's communityAuth needs for creating and listing a resident's own pickups.

// Public: approved operators that serve a zone and are accepting requests.
export const getAvailableOperators = async (zone) => {
  const { data } = await api.get('/operators/available', { params: { zone } });
  return data;
};

// Resident creates a pickup request. Fee is computed server-side from the operator's
// pricing; we only send the choices.
export const createPickup = async ({ operator, wasteType, loadSize, note, location }) => {
  const { data } = await api.post('/pickups', { operator, wasteType, loadSize, note, location });
  return data;
};

// The signed-in resident's own requests (device token).
export const getMyPickups = async () => {
  const { data } = await api.get('/pickups/mine');
  return data;
};

export const cancelPickup = async (id) => {
  const { data } = await api.patch(`/pickups/${id}/cancel`);
  return data;
};

// Mirrors server/utils/pricing.js so the resident sees the fee before submitting.
const LOAD_SURCHARGE = { small: 0, medium: 500, large: 1500 };
export const estimateFee = (operator, wasteType, loadSize) => {
  const base = operator?.pricing?.[wasteType] ?? operator?.baseFee ?? 0;
  const surcharge = operator?.loadSurcharge?.[loadSize] ?? LOAD_SURCHARGE[loadSize] ?? 0;
  return base + surcharge;
};
