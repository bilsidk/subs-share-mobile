# Roadmap — SubsShare
_Last updated: 2026-06-10_

## Current State
MVP shipped. App is live on Android (Play Store submission in progress per recent commits). Core loop functional: earn coins → spend on campaigns → YouTube API verification.

## Known Pending Work (from git history)
- Play Store readiness fixes (a8a9554)
- In-app Contact Support added (cbb1028)
- Privacy Policy localized (5bb0531)
- Performance: WARNINGS/TASK_DESCRIPTIONS memoized (1144176)

## Technical Debt Backlog (priority order)
1. **TD-001** Fix ONBOARDING_KEY duplication
2. **TD-002** Fetch slot costs from backend (prevent price drift)
3. **TD-003** Remove hardcoded OWNER_EMAIL from navigator
4. **TD-005** Add error states for failed data loads
5. **TD-008** Transaction history pagination
6. **TD-014** Fix refund amount calculation in campaign cancel

## Feature Ideas (not committed)
- Push notifications for campaign milestones (slots filling up)
- Referral system (bonus coins for inviting new users)
- Campaign analytics (subscriber retention over time)
- Multiple channels per user (currently supports multiple but UI shows all)
- Task type filtering on EarnScreen
- Campaign scheduling (start/end dates)

## Infrastructure
- iOS build + App Store submission (Android first)
- Backend monitoring/alerting on Railway
- Sentry error rate dashboard review
