export const API_BASE_URL = 'https://viralboostnow.com/api';
export const TASK_COMPLETION_DELAY = 45; // seconds
// Display value for the like_comment minimum — the SERVER (config.MIN_COMMENT_WORDS)
// is the real enforcer; keep these in sync if you change it there.
export const MIN_COMMENT_WORDS = 5;

export const GOOGLE_CLIENT_ID = '59298470844-ldipur31o2rbe3la0oecsin3jd65pklq.apps.googleusercontent.com';

// Google Cloud project NUMBER (not ID) that the app is linked to for Play Integrity.
// Optional for Play-distributed apps (Play links it automatically) — leave 0 unless
// Google tells you a specific project number is required. Find it in Google Cloud
// Console → Dashboard → Project number.
export const CLOUD_PROJECT_NUMBER = 59298470844; // project "subs-share", Play Integrity API enabled

export const PRIVACY_POLICY_URL = 'https://viralboostnow.com/privacy.html';
export const TERMS_OF_SERVICE_URL = 'https://viralboostnow.com/terms.html';

export const SUPPORT_EMAIL = 'support@viralboostnow.com';

// AsyncStorage key marking the onboarding carousel as seen. Single source of truth —
// AppNavigator reads it to decide whether to show onboarding, OnboardingScreen writes
// it on finish. Keeping two literals in sync by hand risked one drifting and re-showing
// onboarding to everyone.
export const ONBOARDING_KEY = '@subsshare_onboarded';
