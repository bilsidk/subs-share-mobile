# QA Memory — SubsShare

## Test Setup
- Framework: Jest with `@react-native/jest-preset`
- Config: `jest.config.js`
- Test files: `__tests__/` directory
- Current coverage: Minimal (only `App.test.jsx` exists)

## Critical Paths to Test
1. **Auth flow:** Google Sign-In → token storage → user restore on restart
2. **Task verification:** Open URL → 45s countdown → claim → API verify → coin credit
3. **Campaign creation:** Select type → enter details → confirm → coin deduction
4. **Campaign cancel:** Remaining slots × cost = refund amount (TD-014: may be buggy)
5. **Language switching:** Language change → all strings update → RTL for Arabic
6. **Onboarding:** First launch shows onboarding → skip/complete → never shows again

## Known Fragile Areas
- Timer logic in EarnScreen (AppState + interval interplay)
- `calcCampaignCost` in helpers.js (must match backend pricing)
- `ONBOARDING_KEY` duplication (TD-001)
- Transaction page 1 only shown in ProfileScreen (TD-008)
- Refund calculation in MyCampaignsScreen cancel dialog (TD-014)

## Device-Specific Considerations
- Android: Google Sign-In requires Play Services
- iOS: No Play Services, different Google Sign-In flow
- RTL layout (Arabic): requires device restart to take effect
- InAppBrowser fallback to Linking.openURL when not available

## Test Data Notes
- Owner email: `bilsidk@gmail.com` — Admin tab visible
- Task completion delay: 45 seconds (can mock `TASK_COMPLETION_DELAY` in tests)
- API runs on Railway — no local backend for testing
