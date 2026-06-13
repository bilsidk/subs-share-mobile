# API Contracts — SubsShare

## Base URL
`https://subs-share-backend-production.up.railway.app`

## Authentication
All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Auth

### POST /auth/google
Exchange Google OAuth credentials for app JWT.

**Request:**
```json
{
  "idToken": "string",
  "serverAuthCode": "string|null",
  "accessToken": "string|null"
}
```

**Response:**
```json
{
  "token": "string (JWT)",
  "user": { ...UserObject },
  "youtube_connected": "boolean"
}
```

---

## Users

### GET /users/me
Get current user profile.

**Response:** `UserObject`
```json
{
  "id": "number",
  "name": "string",
  "email": "string",
  "avatar": "string|null (URL)",
  "coins": "number",
  "role": "user|premium|owner",
  "tasks_completed": "number",
  "created_at": "ISO8601 string"
}
```

### DELETE /users/me
Delete current user's account. Returns 200 on success.

---

## Channels

### POST /channels
Add a YouTube channel to the user's account.

**Request:**
```json
{
  "youtube_channel_id": "string",
  "channel_name": "string",
  "channel_url": "string"
}
```

**Response:** `ChannelObject`
```json
{
  "id": "number",
  "channel_name": "string",
  "channel_url": "string",
  "youtube_channel_id": "string",
  "active_campaigns": "number",
  "pending_subscribers": "number"
}
```

### GET /channels
Get user's channels.

**Response:** `ChannelObject[]`

---

## Tasks

### GET /tasks?type=<taskType>
Get available tasks for the Earn screen. Optional `type` filter.

**Response:** `TaskObject[]`
```json
[{
  "id": "number",
  "channel_name": "string",
  "channel_url": "string",
  "owner_name": "string",
  "owner_avatar": "string|null",
  "task_type": "subscribe|like|like_comment|subscribe_like|watch",
  "tier": "1|2|3",
  "reward": "number (coins earner receives)",
  "remaining_slots": "number",
  "target_video_url": "string|null",
  "already_completed": "boolean"
}]
```

### GET /tasks/my
Get campaigns owned by current user.

**Response:** `MyCampaignObject[]`
```json
[{
  "id": "number",
  "channel_name": "string",
  "task_type": "string",
  "status": "active|paused|completed|cancelled",
  "tier": "number",
  "reward": "number",
  "total_slots": "number",
  "remaining_slots": "number",
  "completions_count": "number",
  "can_pause": "boolean",
  "can_resume": "boolean",
  "can_cancel": "boolean"
}]
```

### POST /tasks
Create a campaign.

**Request:**
```json
{
  "channel_id": "number|null",
  "task_type": "subscribe|like|like_comment|subscribe_like|watch",
  "subscribers_wanted": "number",
  "target_video_url": "string|null",
  "watch_minutes": "number|null"
}
```

**Response:** `MyCampaignObject`

### POST /tasks/:id/verify
Verify task completion and claim coins.

**Request:**
```json
{
  "started_at": "number (Unix timestamp ms)",
  "device_id": "string"
}
```

**Response (success):**
```json
{
  "message": "string",
  "new_balance": "number",
  "comment_verified": "boolean",
  "bonus_coins": "number"
}
```

**Error codes (in err.data.code):**
- `NO_YOUTUBE_ACCESS` — YouTube token missing/revoked
- `YOUTUBE_REAUTH` — Need to re-authenticate with YouTube
- `VERIFY_RETRY` — Verification inconclusive, retry
- `BANNED` — User is banned
- `CAMPAIGN_FULL` — No slots remaining
- `CAMPAIGN_PAUSED` — Campaign is paused
- `CAMPAIGN_CANCELLED` — Campaign was cancelled
- `verified: false` (no code) — Action not detected yet

### PATCH /tasks/:id/pause
Pause a campaign. Response: updated campaign object.

### PATCH /tasks/:id/resume
Resume a paused campaign. Response: updated campaign object.

### DELETE /tasks/:id
Cancel a campaign and refund remaining slot coins.

**Response:**
```json
{
  "refunded_coins": "number",
  "new_balance": "number"
}
```

---

## Transactions

### GET /transactions?page=<n>
Get transaction history (paginated).

**Response:**
```json
{
  "transactions": [{
    "id": "number",
    "type": "earned|spent|bonus",
    "amount": "number",
    "description": "string",
    "created_at": "ISO8601 string"
  }],
  "page": "number",
  "total": "number"
}
```

---

## Admin (owner-only)

### GET /admin/status
**Response:**
```json
{
  "api_mode": "live|degraded",
  "degraded_reason": "string|null",
  "settings": { ...AdminSettings },
  "stats": {
    "users": "number",
    "premium_users": "number",
    "banned_users": "number",
    "active_tasks": "number",
    "verified_completions": "number",
    "pending_completions": "number",
    "reclaimed_completions": "number",
    "total_coins_in_circulation": "number"
  }
}
```

### GET /admin/settings
**Response:** `{ settings: AdminSettings }`

### PATCH /admin/settings
**Request:** Partial `AdminSettings` object
**Response:** `{ settings: AdminSettings }`

**AdminSettings:**
```json
{
  "daily_limit_user": "number",
  "daily_limit_premium": "number",
  "coins_subscribe": "number",
  "coins_like": "number",
  "coins_like_comment": "number",
  "comment_bonus": "number",
  "coins_subscribe_like": "number",
  "coins_watch": "number",
  "coins_per_slot": "number",
  "max_campaigns_per_user": "number",
  "completion_delay_seconds": "number"
}
```

### POST /admin/mode
**Request:** `{ "mode": "live|degraded", "reason": "string" }`

### POST /admin/promote
**Request:** `{ "email": "string", "role": "user|premium" }`
