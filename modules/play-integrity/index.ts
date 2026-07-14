import { requireOptionalNativeModule } from 'expo-modules-core';

// Android-only native module. Returns null on platforms/builds where it isn't
// present, so callers can degrade gracefully instead of crashing.
export default requireOptionalNativeModule('PlayIntegrity');
