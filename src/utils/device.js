import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@subsshare_device_id';

let _cached = null;

export async function getDeviceId() {
  if (_cached) return _cached;

  // Try react-native-device-info for a hardware-bound ID first
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
    // Library not available — fall back to a persistent random ID stored in AsyncStorage.
    // This survives re-installs on the same device (if device-level backup is enabled)
    // and prevents the null-device-id bypass for device-based anti-cheat.
    try {
      let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        id = 'f_' + Array.from({ length: 16 }, hex).join('');
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      }
      _cached = id;
      return _cached;
    } catch (_) {
      return null;
    }
  }
}
