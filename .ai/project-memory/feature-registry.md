# Feature Registry — SubsShare

## Play Store Version (Clean — Active)

| Screen | What it shows | What it hides |
|---|---|---|
| OnboardingScreen | Discovery/community messaging | Coin economy |
| LoginScreen | "Discover creators, grow together" | Task/earn framing |
| HomeScreen | Channel cards, community banner, quick nav | Coin balance, transaction history |
| DiscoverScreen | Creator cards by tier, Visit Channel button | Coin rewards, timer, verify flow |
| GrowScreen | Channel management, Pro CTA → subsshare.com | Campaign creation, slot costs |
| ProfileScreen | Stats, Pro CTA, settings, sign out | Transaction history, coin balance |
| MyCampaignsScreen | Campaign management (owner/admin use) | — |
| AdminScreen | Full admin panel (owner only) | — |

## Pro Version (Website — subsshare.com, future)

Full coin economy, campaign creation, task verification, transaction history.
All existing screens (EarnScreen, GetSubscribersScreen) live here.

## Shipped in Both Versions

| Feature | Status |
|---|---|
| Google Sign-In + YouTube OAuth | ✅ |
| First-launch onboarding (4 slides) | ✅ (new copy) |
| Multi-language support (15 languages) | ✅ |
| RTL support (Arabic) | ✅ |
| Language picker | ✅ |
| Channel registration | ✅ |
| Channel discovery feed | ✅ (DiscoverScreen) |
| Admin panel (owner only) | ✅ |
| Account deletion | ✅ |
| Contact support | ✅ |
| Privacy policy link | ✅ |
| Sentry monitoring | ✅ |
| SubsShare Pro CTA → subsshare.com | ✅ (GrowScreen + ProfileScreen) |

## Files Changed for Clean Version
- `src/screens/DiscoverScreen.jsx` — NEW (replaces EarnScreen in nav)
- `src/screens/GrowScreen.jsx` — NEW (replaces GetSubscribersScreen in nav)
- `src/screens/HomeScreen.jsx` — simplified, no coin balance hero
- `src/screens/ProfileScreen.jsx` — Pro CTA added, transaction history removed
- `src/screens/OnboardingScreen.jsx` — new slides copy
- `src/screens/LoginScreen.jsx` — new feature bullets
- `src/navigation/AppNavigator.jsx` — wired DiscoverScreen + GrowScreen
- `src/utils/locales/en.js` — new keys: discover.*, grow.*, profile.proTitle etc.

## Original Screens (preserved, not in main nav)
- `src/screens/EarnScreen.jsx` — full coin/task/verify flow (for Pro/website)
- `src/screens/GetSubscribersScreen.jsx` — full campaign creation (for Pro/website)
