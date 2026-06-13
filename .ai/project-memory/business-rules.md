# Business Rules — SubsShare

## Core Product
SubsShare is a YouTube engagement exchange marketplace. Users earn coins by completing engagement tasks (subscribe, like, watch), then spend coins to create campaigns that drive engagement to their own channels.

## User Roles
| Role | Coins | Daily Tasks | Admin Panel | Campaign Limit |
|---|---|---|---|---|
| user | Must earn | Admin-configured limit | No | Admin-configured max |
| premium | Must earn | Higher limit | No | Same or higher |
| owner | Unlimited (∞) | Unlimited | Yes | Unlimited |

- Owner identified by: `user.email === 'bilsidk@gmail.com'` OR `user.role === 'owner'`

## Task Types
| Type | What User Does | Verified By | Notes |
|---|---|---|---|
| subscribe | Subscribe to channel | YouTube Data API | Reclaimed if unsubscribed |
| like | Like a video | YouTube Data API | Reclaimed if unliked |
| like_comment | Like + (optional) comment | Like: API, Comment: detected | Bonus coins for comment |
| subscribe_like | Subscribe + Like | YouTube Data API (both) | Both must stay |
| watch | Watch video N minutes | Timer (honor system) | May be spot-checked |

## Coin Economy Rules
1. **Earning:** User completes task → backend verifies → coins credited to balance
2. **Spending:** Campaign creation deducts `slots × cost_per_slot` upfront
3. **Refund:** Campaign cancel refunds `remaining_slots × cost_per_slot`
4. **Reclaim:** If YouTube API detects unsubscribe/unlike, coins are reclaimed from earner
5. **Comment bonus:** Extra coins if comment detected on like_comment tasks
6. **Owner campaigns:** Free (no coin deduction)

## Campaign Rules
1. Task type `subscribe` and `subscribe_like` require a registered YouTube channel
2. Task types with video (`like`, `like_comment`, `subscribe_like`, `watch`) require a target video URL
3. `watch` tasks also require watch duration (1-10 minutes)
4. Slot presets: 10, 25, 50, 100; custom amounts also allowed
5. Campaigns can be paused (hidden from earners) and resumed
6. Cancelled campaigns refund remaining slots

## Verification Rules
1. User opens YouTube via in-app browser (InAppBrowser or Linking fallback)
2. 45-second countdown starts immediately (matches `TASK_COMPLETION_DELAY`)
3. User must keep app active during timer (AppState listener detects background)
4. After timer: user taps "Verify & Claim"
5. Backend verifies action against YouTube API (live mode) or accepts on honor (degraded)
6. Device ID sent to prevent multi-device abuse

## Anti-Abuse Rules
1. Daily task limits enforced server-side by role
2. Device ID tracked per completion
3. Post-claim verification: backend can reclaim coins if YouTube action undone
4. Repeated violations → permanent ban (`BANNED` error code)

## Onboarding Rules
1. First-launch users see 4-slide onboarding before auth
2. Onboarding completion stored in AsyncStorage (`@subsshare_onboarded`)
3. Skip button available on all slides

## Authentication Rules
1. Google Sign-In required (no email/password)
2. YouTube readonly scope requested at sign-in for verification capability
3. `serverAuthCode` sent to backend for refresh token exchange
4. Access revoked + fresh sign-in forced on each login (ensures fresh YouTube scope)
5. JWT stored in AsyncStorage; auto-restored on app restart
6. On restore failure: clear all storage, show login

## Admin Rules
1. Admin panel only visible to owner
2. API mode toggle: live (YouTube API) vs degraded (honor system)
3. All coin amounts per task type are configurable server-side
4. Daily limits configurable per role
5. Campaign economy settings (coins per slot, max campaigns) configurable
6. User management: grant/revoke premium by email
