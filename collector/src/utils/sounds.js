let Audio = null;
try {
  Audio = require('expo-av').Audio;
} catch {}

let sounds = {};

if (Audio) {
  Audio.setAudioModeAsync({
    playsInSilentModeIOS: false,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  }).catch(() => {});
}

const SOUND_FILES = {
  success: require('../assets/sounds/success.mp3'),
  send: require('../assets/sounds/send.mp3'),
  receive: require('../assets/sounds/receive.mp3'),
};

async function play(key, volume = 0.5) {
  if (!Audio) return;
  try {
    if (sounds[key]) {
      await sounds[key].setPositionAsync(0);
      await sounds[key].playAsync();
    } else {
      const { sound } = await Audio.Sound.createAsync(
        SOUND_FILES[key],
        { shouldPlay: true, volume }
      );
      sounds[key] = sound;
    }
  } catch {}
}

export const playSuccess = () => play('success', 0.5);
export const playSend = () => play('send', 0.4);
export const playReceive = () => play('receive', 0.3);
