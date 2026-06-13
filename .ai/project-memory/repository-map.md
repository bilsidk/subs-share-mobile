# Repository Map — SubsShare

## Root
```
SubsShare/
├── App.jsx                    — Root component (NavigationContainer + AuthProvider + ErrorBoundary)
├── index.js                   — RN entry point
├── app.json                   — App name: SubsShare
├── package.json               — Dependencies
├── tsconfig.json              — TypeScript config (files are .jsx/.js — TS not enforced)
├── babel.config.js            — Babel with RN preset
├── metro.config.js            — Metro bundler config
├── jest.config.js             — Jest config
├── Gemfile                    — Ruby/CocoaPods (iOS)
├── privacy.html               — Privacy policy static page
├── android/                   — Android native project
├── ios/                       — iOS native project
├── __tests__/                 — App.test.jsx
└── src/
```

## src/ Tree
```
src/
├── assets/
│   └── icon.png
├── components/
│   ├── index.jsx              — CoinBadge, LoadingSpinner, EmptyState, StatCard, ErrorBoundary
│   └── TaskCard.jsx           — Task list item (avatar, channel name, slots, reward)
├── context/
│   └── AuthContext.jsx        — Auth state (user, token, youtubeConnected), signIn/signOut/refreshUser
├── hooks/
│   └── useTranslation.js      — Hook: { t, lang } — re-renders on language change
├── navigation/
│   └── AppNavigator.jsx       — Root navigator: Splash → Onboarding → Auth → Main tabs
├── screens/
│   ├── SplashScreen.jsx
│   ├── OnboardingScreen.jsx   — 4-slide first-launch onboarding
│   ├── LoginScreen.jsx        — Google Sign-In (YouTube scope)
│   ├── HomeScreen.jsx         — Dashboard: balance, stats, channels, recent activity
│   ├── EarnScreen.jsx         — Task list by tier, task execution modal with countdown
│   ├── GetSubscribersScreen.jsx — Campaign creation wizard
│   ├── MyCampaignsScreen.jsx  — Campaign management (pause/resume/cancel)
│   ├── ProfileScreen.jsx      — User profile, tx history, sign out, delete account
│   ├── AdminScreen.jsx        — Admin panel (owner-only): stats, settings, user management
│   └── LanguageScreen.jsx     — Language picker
├── services/
│   ├── api.js                 — All HTTP calls to backend REST API
│   └── storageService.js      — AsyncStorage wrapper (token, user, youtube, language, onboarding)
├── theme/
│   └── index.js               — colors, spacing, radius design tokens
└── utils/
    ├── constants.js           — API_BASE_URL, TASK_COMPLETION_DELAY, GOOGLE_CLIENT_ID, URLs
    ├── device.js              — getDeviceId() via react-native-device-info
    ├── helpers.js             — formatCoins, calcCampaignCost, getSlotCost, formatDate,
    │                            formatRelativeTime, extractChannelId
    ├── i18n.js                — i18n engine: initI18n, setLanguage, t(), addLanguageListener
    ├── txTranslate.js         — Transaction description translator
    ├── warnings.js            — getWarnings(t), getTaskDescriptions(t) + legacy static exports
    └── locales/               — 15 locale files: en ar fr es pt tr id hi ru de zh-CN zh-TW bn ja ko
```

## Technologies
| Layer | Technology |
|---|---|
| Framework | React Native 0.85.3 |
| React | 19.2.3 |
| Navigation | @react-navigation/native-stack + bottom-tabs v7 |
| Auth | @react-native-google-signin/google-signin v16 |
| Storage | @react-native-async-storage/async-storage v3 |
| Monitoring | @sentry/react-native v8 |
| In-App Browser | react-native-inappbrowser-reborn v3 |
| Localization | react-native-localize v3 + custom i18n |
| Device Info | react-native-device-info v15 |
| Safe Area | react-native-safe-area-context v5 |
| Screens | react-native-screens v4 |

## Backend
- URL: `https://subs-share-backend-production.up.railway.app`
- Deployment: Railway (auto-deploy from `master` branch)
- Auth: JWT Bearer token

## Key Constants
- `API_BASE_URL` — backend URL
- `TASK_COMPLETION_DELAY` — 45 seconds (task verification wait)
- `GOOGLE_CLIENT_ID` — Google OAuth web client ID
- `PRIVACY_POLICY_URL` — https://viralboostnow.com/privacy.html
- `SUPPORT_EMAIL` — support@viralboostnow.com
- `OWNER_EMAIL` — bilsidk@gmail.com (hardcoded in AppNavigator)
- `ONBOARDING_KEY` — `@subsshare_onboarded` (duplicated in AppNavigator + OnboardingScreen)
