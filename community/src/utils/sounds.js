let ExpoAudio = null;
try {
  ExpoAudio = require('expo-audio');
} catch {}

if (ExpoAudio) {
  ExpoAudio.setAudioModeAsync({
    playsInSilentMode: false,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
  }).catch(() => {});
}

const SOUND_FILES = {
  success: require('../assets/sounds/success.mp3'),
  send: require('../assets/sounds/send.mp3'),
  receive: require('../assets/sounds/receive.mp3'),
};

// Players are created up front so the first play isn't lost while the file loads
const players = {};
if (ExpoAudio) {
  for (const key of Object.keys(SOUND_FILES)) {
    try {
      players[key] = ExpoAudio.createAudioPlayer(SOUND_FILES[key]);
    } catch {}
  }
}

async function play(key, volume = 0.5) {
  const player = players[key];
  if (!player) return;
  try {
    // A finished player stays at the end, so rewind before replaying
    await player.seekTo(0);
    player.volume = volume;
    player.play();
  } catch {}
}

export const playSuccess = () => play('success', 0.5);
export const playSend = () => play('send', 0.4);
export const playReceive = () => play('receive', 0.3);
