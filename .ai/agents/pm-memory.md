# Product Manager Memory — SubsShare

## Product Summary
SubsShare is a YouTube engagement exchange app. Users earn coins by completing engagement tasks (subscribe/like/watch), then spend coins to get engagement for their own channels. Verification is via YouTube Data API for subscribe/like tasks.

## Target Users
- YouTube creators wanting to grow their channels
- Users who want to earn by engaging with other creators
- Current: Mobile (Android first, iOS planned)

## Core User Journey
1. Sign in with Google (authorizes YouTube access)
2. Browse tasks on Earn tab → complete task → earn coins
3. On GetSubs tab → create campaign → spend coins → get real subscribers/likes

## Current Business Metrics (available in Admin panel)
- Total users
- Premium users
- Active campaigns
- Verified completions
- Total coins in circulation

## Revenue Model
Not yet monetized in app. Premium role granted manually by admin.
Future: In-app purchase for coin bundles or premium status.

## Constraints
- YouTube API quota limits → degraded mode fallback
- Play Store policies: cannot promise "buy subscribers" — app positioned as engagement exchange
- Only owner (bilsidk@gmail.com) has Admin tab

## Feature Acceptance Criteria Template
For any new feature:
1. Works on Android (primary target)
2. All strings localized (15 languages)
3. Error states shown on API failure
4. Loading states on async actions
5. No hardcoded English text
6. Theme tokens used (no hardcoded colors)

## Backlog Items (see roadmap.md for full list)
- Fix TD-001: ONBOARDING_KEY duplication (1 hour)
- Fix TD-014: Campaign cancel refund calculation (2 hours)
- Add TD-008: Transaction pagination (4 hours)
- Add error states to data loading (TD-005) (4 hours)
- iOS build + App Store submission
