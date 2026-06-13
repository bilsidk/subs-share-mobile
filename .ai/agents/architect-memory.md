# Architect Memory — SubsShare

## Architectural Decisions

### ADR-001: No Global Data Cache
**Decision:** Screen-local state + useFocusEffect reload on every focus.
**Status:** Existing pattern; not ideal but functional for MVP.
**Trade-off:** Simple, no dependency on cache library. Cost: redundant API calls on fast navigation.
**Future:** Consider React Query if API call volume becomes a problem.

### ADR-002: Singleton i18n (not React Context)
**Decision:** `utils/i18n.js` is a module singleton with listener pattern; `useTranslation` hook subscribes.
**Reason:** Avoids re-rendering entire tree on language change. Only subscribed components re-render.
**Impact:** Cannot use i18n in non-React code (service files, etc.) — must pass `t` as parameter.

### ADR-003: Auth State in React Context, Persisted to AsyncStorage
**Decision:** `AuthContext` holds user/token in React state; persists to AsyncStorage on change; restores on cold start.
**Pattern:** Optimistic restore from cache → fresh API fetch to validate.
**On failure:** Full clear + redirect to login.

### ADR-004: Task Execution via InAppBrowser
**Decision:** YouTube opened in-app via `react-native-inappbrowser-reborn`, with fallback to `Linking.openURL`.
**Reason:** Keeps user in app context; app can detect return; timer starts before YouTube opens.

### ADR-005: Device ID for Anti-Abuse
**Decision:** `react-native-device-info` provides device ID sent with every verify call.
**Reason:** Prevents one user completing same task from multiple devices.

## Key Constraints
- Backend is on Railway — no direct DB access from mobile
- Backend master branch auto-deploys — backend changes are instant
- No offline mode — app requires network for all core functionality
- YouTube API quota: degraded mode fallback exists for quota exhaustion
- Slot costs are duplicated frontend/backend — must stay synchronized (TD-002)
