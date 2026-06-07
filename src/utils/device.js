// src/utils/device.js
// Safe device fingerprint — falls back to null if library not available
// To enable: npm install react-native-device-info && npx react-native run-android

let _cached = null;

export async function getDeviceId() {
  if (_cached) return _cached;
  try {
    const DeviceInfo = require('react-native-device-info').default;
    const raw = await DeviceInfo.getUniqueId();
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
      h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
    }
    _cached = `d_${(h >>> 0).toString(16)}`;
    return _cached;
  } catch (e) {
    // Library not installed or unavailable — return null (anti-cheat still works, just no device check)
    return null;
  }
}
