import { requireOptionalNativeModule } from 'expo-modules-core';
import { api } from './api';
import { CLOUD_PROJECT_NUMBER } from '../utils/constants';

// Resolve the native module by name — null if this build doesn't include it
// (e.g. an older client, or a non-Android platform), so earning never hard-fails.
const PlayIntegrity = requireOptionalNativeModule('PlayIntegrity');

// Best-effort Play Integrity token for the current earn attempt. Fetches a fresh
// server nonce, asks Google for a token bound to it, and returns the token string —
// or null if anything is unavailable. The backend runs SOFT verification, so a null
// token doesn't block earning during rollout; it just isn't attested.
export async function getIntegrityToken() {
  try {
    if (!PlayIntegrity) return null;
    const { nonce } = await api.getIntegrityNonce();
    if (!nonce) return null;
    return await PlayIntegrity.requestIntegrityToken(nonce, CLOUD_PROJECT_NUMBER || 0);
  } catch (_) {
    return null;
  }
}
