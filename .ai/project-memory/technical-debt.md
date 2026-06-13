# Technical Debt — SubsShare

## HIGH PRIORITY

### TD-001: ONBOARDING_KEY Duplication
**File:** `AppNavigator.jsx:26` + `OnboardingScreen.jsx:11`
**Issue:** `const ONBOARDING_KEY = '@subsshare_onboarded'` hardcoded in two files.
**Risk:** If key changes in one place, onboarding shows again for all users.
**Fix:** Export from `storageService.js` or `constants.js`.

### TD-002: Slot Cost Duplication (Frontend ↔ Backend Drift)
**File:** `helpers.js:6-13`
**Issue:** `SLOT_COSTS` object is a frontend copy of backend `config/index.js SLOT_COSTS`. Comment says "must match backend."
**Risk:** If backend changes pricing, users see wrong cost estimate until app update.
**Fix:** Fetch slot costs from backend (add to admin settings or a public config endpoint).

### TD-003: OWNER_EMAIL Hardcoded in Navigator
**File:** `AppNavigator.jsx:25`
**Issue:** `const OWNER_EMAIL = 'bilsidk@gmail.com'` hardcoded in navigation file.
**Risk:** Breaks if owner email changes; security-adjacent concern (email exposed in JS bundle).
**Fix:** Rely solely on `user.role === 'owner'` check from backend.

### TD-004: No TypeScript Enforcement
**Issue:** `tsconfig.json` exists but all source files are `.jsx`/`.js` — no type safety.
**Risk:** API shape mismatches, prop errors, silent runtime bugs.
**Fix:** Migrate gradually to `.tsx`/`.ts`, starting with `api.js` (add response types) and `AuthContext`.

---

## MEDIUM PRIORITY

### TD-005: Silent Error Swallowing
**Files:** Multiple screens
**Pattern:** `catch (_) { /* ignore */ }` on data loading functions.
**Risk:** Users see empty/stale UI with no indication of failure. Network errors invisible.
**Fix:** Add error state + user-visible error feedback (toast or inline message).

### TD-006: No Data Caching / Re-fetch on Every Focus
**Files:** All screens using `useFocusEffect`
**Issue:** Every time a tab is focused, all API calls are fired. No deduplication, no stale-time.
**Risk:** Unnecessary API load, flickering on fast navigation.
**Fix:** Consider React Query or SWR for caching with configurable stale times.

### TD-007: Legacy Static WARNINGS/TASK_DESCRIPTIONS Exports
**File:** `warnings.js:44-62`
**Issue:** Static English-only `WARNINGS` and `TASK_DESCRIPTIONS` objects still exported alongside the new `getWarnings(t)`/`getTaskDescriptions(t)` functions.
**Risk:** If any code uses legacy exports, it's non-localized. Causes confusion.
**Fix:** Audit for usages of legacy exports; remove once confirmed unused.

### TD-008: Transaction History Not Paginated on ProfileScreen
**File:** `ProfileScreen.jsx:31`
**Issue:** `api.getTransactions()` is called without page param (defaults to page 1), so only first page of transactions is shown, but there's no "load more" UI.
**Risk:** Users with many transactions see incomplete history silently.
**Fix:** Add pagination (infinite scroll or "Load more" button).

### TD-009: AdminScreen Has Hardcoded English Strings
**File:** `AdminScreen.jsx`
**Issue:** Section titles and labels like "API Mode", "Live Stats", "Daily Task Limits", "Coins Per Task", "Campaign Economy", "User Management", "Grant Premium", "Remove Premium", status messages are English-only.
**Risk:** Inconsistency if admin speaks another language (low priority as admin is single user).

### TD-010: youtubeConnected State Unused in UI
**File:** `AuthContext.jsx:13`
**Issue:** `youtubeConnected` is stored and persisted but not used to drive meaningful UI (no "reconnect YouTube" flow triggered from it).
**Risk:** Dead code accumulating.
**Fix:** Either use it to show a reconnect banner or remove it.

### TD-011: No API Retry Logic
**File:** `api.js:6`
**Issue:** Single attempt per request. Network blips cause immediate failure.
**Fix:** Add exponential backoff retry for network errors (not 4xx).

---

## LOW PRIORITY

### TD-012: Mixed Theme Usage in Screens
**Files:** `EarnScreen.jsx`, `GetSubscribersScreen.jsx`, `MyCampaignsScreen.jsx`
**Issue:** Some screens use `colors` from theme, others have hardcoded hex values (e.g., `'#0A0A0F'`, `'#13131A'`).
**Risk:** Theme changes require updating multiple files.
**Fix:** Replace all hardcoded hex with theme tokens.

### TD-013: formatRelativeTime Not Localized
**File:** `helpers.js:41`
**Issue:** Returns hardcoded English strings ("just now", "m ago", "h ago", "d ago").
**Fix:** Pass `t` function or use locale-aware date formatting.

### TD-014: MyCampaignsScreen Refund Calculation
**File:** `MyCampaignsScreen.jsx:57`
**Issue:** `const slotValue = parseInt(task.reward, 10) || 10` uses earner reward as refund value, which is different from the campaign cost-per-slot.
**Risk:** Shows wrong refund amount in cancel dialog.
**Fix:** Backend should return `cost_per_slot` in the campaign object, or recalculate from `total_cost` / `total_slots`.

### TD-015: No Loading State After Action Buttons in MyCampaigns
**File:** `MyCampaignsScreen.jsx`
**Issue:** Pause/resume/cancel buttons have no loading indicator — user can tap multiple times.
**Fix:** Add `loading` state per card action.

### TD-016: App.jsx Not Read / Unknown
**Status:** `App.jsx` at root not yet inspected.
**Action:** Read before modifying navigation or app root.
