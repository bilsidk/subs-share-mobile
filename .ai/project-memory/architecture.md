# Architecture — SubsShare

## Overview
SubsShare is a React Native mobile app (Android + iOS) implementing a YouTube engagement exchange marketplace. Users earn coins by completing engagement tasks for other creators, then spend those coins to run campaigns on their own channels.

## Data Flow
```
User → LoginScreen → Google OAuth → backend /auth/google
                                        ↓
                              JWT token + user object
                                        ↓
                            AsyncStorage (persisted)
                                        ↓
                         AuthContext (React state)
                                        ↓
                    All screens read user + token from context
                            ↓
                   api.js (Bearer token injected automatically)
                            ↓
                  Railway backend REST API
```

## Navigation Architecture
```
AppNavigator
├── SplashScreen (while loading=true or onboarded===null)
├── OnboardingScreen (first launch, !onboarded)
├── Stack[Auth]
│   └── LoginScreen
└── Stack[Main] (when user !== null)
    ├── Tabs
    │   ├── Home
    │   ├── Earn
    │   ├── GetSubs (GetSubscribersScreen)
    │   ├── Profile
    │   └── Admin (owner-only: email===bilsidk@gmail.com OR role==='owner')
    └── Stack screens (pushed over tabs)
        ├── MyCampaigns
        └── Language
```

## State Management
- **AuthContext** — global auth state (user, token, youtubeConnected)
  - Persisted to AsyncStorage on every update
  - Restored on cold start; fresh `/users/me` fetch to rehydrate
- **Local state** — all screen data (tasks, channels, transactions) is component-local
- **No global data cache** — every screen focus triggers API calls
- **i18n module** — singleton with listeners pattern (not React context)

## Request Lifecycle
1. `api.js` `request()` reads token from AsyncStorage on every call
2. 15-second AbortController timeout
3. Non-2xx → throws Error with `.status` and `.data`
4. Specific error codes handled in screens: `NO_YOUTUBE_ACCESS`, `YOUTUBE_REAUTH`, `VERIFY_RETRY`, `BANNED`, `CAMPAIGN_FULL`, `CAMPAIGN_PAUSED`, `CAMPAIGN_CANCELLED`

## Authentication Architecture
- Google Sign-In with scopes: `youtube.readonly` + `email` + `profile`
- `offlineAccess: true` → backend gets `serverAuthCode` to exchange for refresh token
- `forceCodeForRefreshToken: true` → forces fresh consent on every sign-in
- Access revoked before sign-in to force fresh YouTube permission dialog
- Backend issues JWT; client stores it in AsyncStorage

## Task/Campaign Lifecycle
```
Campaign Owner:
  createTask (POST /tasks) → deducts coins from balance
       ↓
  Task appears in EarnScreen for eligible users
       ↓
  User completes action on YouTube + waits 45s timer
       ↓
  verifyTask (POST /tasks/:id/verify) → backend checks YouTube API
       ↓
  On success: user receives coins, remaining_slots decremented
       ↓
  When remaining_slots === 0: task status → 'completed'

Campaign Owner can:
  pauseCampaign  → PATCH /tasks/:id/pause  (hides from earners)
  resumeCampaign → PATCH /tasks/:id/resume
  cancelCampaign → DELETE /tasks/:id (refunds remaining slot coins)
```

## Coin Economy
| Task Type      | Earner Gets | Campaign Cost/slot |
|---|---|---|
| subscribe      | admin config| 15 coins |
| like           | admin config| 9 coins  |
| like_comment   | admin config| 13 coins |
| subscribe_like | admin config| 20 coins |
| watch (1min)   | admin config| 7 coins  |
| watch (+Nmin)  | admin config| 7 + N coins |

**Note:** Earner reward per task is set server-side via admin settings (`coins_subscribe`, `coins_like`, etc.). Campaign cost-per-slot is frontend-calculated in `helpers.js` `SLOT_COSTS` — must stay in sync with backend config.

## Verification Architecture
- **YouTube API mode (live):** Subscribe/like/like_comment/subscribe_like verified via YouTube Data API
- **Degraded mode:** Honor system (admin can toggle via Admin panel)
- **Watch tasks:** Timer-based only, no API verification
- **Device ID** sent with verifyTask to detect multi-device abuse
- **Anti-abuse:** Backend reclaims coins if user un-subscribes/un-likes post-claim

## User Roles
| Role | Permissions |
|---|---|
| user | Daily task limit (default), pays for campaigns |
| premium | Higher daily task limit |
| owner | Unlimited coins, Admin tab, can promote/demote users |

## Localization Architecture
- Singleton i18n module (`utils/i18n.js`) — not React context
- Device language auto-detected via `react-native-localize`
- User override stored in AsyncStorage (`@subsshare_language`)
- RTL supported (Arabic) — requires app restart for full effect
- `useTranslation()` hook subscribes to language change events via listener pattern
- 15 languages: en ar fr es pt tr id hi ru de zh-CN zh-TW bn ja ko
