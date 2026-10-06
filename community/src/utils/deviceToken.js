import AsyncStorage from '@react-native-async-storage/async-storage';

// The server links each resident's phone number to the device that registered it
// by issuing a device token. Tokens are kept per number and survive sign-out, so
// the same phone can sign back in to an account it registered.
const KEY = 'community_device_tokens';

async function readAll() {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || '{}');
  } catch {
    return {};
  }
}

export async function getDeviceToken(phone) {
  if (!phone) return null;
  return (await readAll())[phone] || null;
}

export async function saveDeviceToken(phone, token) {
  if (!phone || !token) return;
  const all = await readAll();
  all[phone] = token;
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function removeDeviceToken(phone) {
  const all = await readAll();
  if (!(phone in all)) return;
  delete all[phone];
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

// Token for the currently signed-in resident, if any
export async function getCurrentDeviceToken() {
  try {
    const profile = JSON.parse((await AsyncStorage.getItem('community_profile')) || 'null');
    return getDeviceToken(profile?.phone);
  } catch {
    return null;
  }
}
