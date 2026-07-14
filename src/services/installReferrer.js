import { requireOptionalNativeModule } from 'expo-modules-core';

// Reads the Google Play install referrer once and extracts a referral code from it.
// Referral links are Play Store URLs with `&referrer=ref%3DCODE`, so Play delivers
// the raw string "ref=CODE" here. Returns the CODE (uppercased) or null.
const Native = requireOptionalNativeModule('PlayIntegrity');

function parseRefCode(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // Accept "ref=CODE", "utm_source=x&ref=CODE", or a bare code.
  const m = /(?:^|[?&])ref=([A-Za-z0-9]{4,12})/.exec(raw);
  if (m) return m[1].toUpperCase();
  const bare = raw.trim();
  return /^[A-Za-z0-9]{4,12}$/.test(bare) ? bare.toUpperCase() : null;
}

// Best-effort; never throws. Returns a referral code string or null.
export async function getReferrerCode() {
  try {
    if (!Native?.getInstallReferrer) return null;
    const raw = await Native.getInstallReferrer();
    return parseRefCode(raw);
  } catch (_) {
    return null;
  }
}
