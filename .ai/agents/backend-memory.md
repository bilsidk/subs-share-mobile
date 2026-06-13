# Backend Memory — SubsShare

## Backend Location
- URL: `https://subs-share-backend-production.up.railway.app`
- Platform: Railway (separate repository, `master` branch auto-deploys)
- Access: API only — no direct DB access from this repo

## Known Endpoints (full list in api-contracts.md)
- All calls go through `src/services/api.js`
- Request timeout: 15 seconds
- Auth header injected automatically from AsyncStorage token

## Known API Error Codes
```
NO_YOUTUBE_ACCESS    — YouTube token missing/revoked → show reconnect flow
YOUTUBE_REAUTH       — Re-auth needed → show reconnect flow
VERIFY_RETRY         — Retry verification (inconclusive)
BANNED               — User banned → dismiss task, show alert
CAMPAIGN_FULL        — No slots → reload tasks
CAMPAIGN_PAUSED      — Campaign paused → reload tasks
CAMPAIGN_CANCELLED   — Campaign cancelled → reload tasks
verified: false      — Action not yet detected → "not detected yet" alert
```

## Frontend-Calculated Values (must match backend)
- `SLOT_COSTS` in `helpers.js` — campaign cost per slot per type
  ```js
  subscribe: 15, like: 9, like_comment: 13, subscribe_like: 20, watch: 7 (base)
  ```
- `WATCH_COST_PER_EXTRA_MIN = 1` — additional cost per extra watch minute
- `TASK_COMPLETION_DELAY = 45` — seconds (should match `completion_delay_seconds` admin setting)

## Data Models (as seen from API responses)
See `api-contracts.md` for full schema.

Key user fields: `id, name, email, avatar, coins, role, tasks_completed, created_at`
Key task fields: `id, channel_name, task_type, tier, reward, remaining_slots, already_completed`
Key campaign fields: `status, total_slots, remaining_slots, completions_count, can_pause, can_resume, can_cancel`
