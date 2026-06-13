# Coding Standards — SubsShare

## File Extensions
- Source files: `.jsx` (components/screens), `.js` (utilities/services/hooks)
- TypeScript config exists but is not enforced — do not introduce `.ts`/`.tsx` without planning full migration

## Component Patterns
- Functional components only (no class components except ErrorBoundary)
- Use `useFocusEffect(useCallback(() => { load(); }, []))` for screen data loading
- Separate data loading function (`loadData`, `loadTasks`) from `useFocusEffect`
- Local state for all screen data — no global state for screen-specific data

## API Calls
- Always use `api.js` — never call `fetch` directly from screens
- All API calls inside try/catch
- Silent catch (`catch (_) {}`) pattern used for background refreshes; avoid for user-initiated actions
- User-initiated actions must show errors via `Alert.alert`

## Styling
- All styles via `StyleSheet.create` — no inline style objects
- Use design tokens from `src/theme/index.js`: `colors`, `spacing`, `radius`
- Preferred: `colors.bg`, `spacing.lg`, `radius.md` over hardcoded hex/numbers
- Existing pattern to migrate: some screens still use hardcoded hex (see TD-012)

## Localization
- All user-facing strings via `const { t } = useTranslation()`
- Translation keys in `src/utils/locales/en.js` — add to all 15 locale files when adding keys
- No hardcoded English strings in screens (Admin screen is exception, see TD-009)
- `getWarnings(t)` and `getTaskDescriptions(t)` — always memoized with `useMemo`

## Navigation
- Use `useNavigation()` hook for navigation actions inside components
- Screen props `{ navigation }` acceptable in top-level screen components
- Navigate with `navigation.navigate('ScreenName')`

## Error Handling
- Network errors: catch + `Alert.alert(t('common.error'), err.message)`
- Specific API error codes (e.g., `BANNED`, `CAMPAIGN_FULL`) handled before generic catch
- No console.log in production code (Sentry handles error tracking)

## Constants
- App-wide constants → `src/utils/constants.js`
- Do not hardcode URLs, email addresses, or client IDs inline

## Components
- Shared UI: `CoinBadge`, `LoadingSpinner`, `EmptyState`, `StatCard`, `ErrorBoundary` from `src/components/index.jsx`
- Task list item: `TaskCard` from `src/components/TaskCard.jsx`
- Always import from `'../components'` (barrel), not individual files

## Auth
- Access auth state via `useAuth()` hook — never read AsyncStorage directly in screens
- `refreshUser()` available to re-fetch user after balance-changing actions

## Git
- Push directly to `main` branch (no PR workflow)
- Backend deploys from `master` branch on Railway (separate repo)
