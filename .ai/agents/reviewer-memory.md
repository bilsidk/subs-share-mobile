# Code Reviewer Memory — SubsShare

## Review Checklist

### Security
- [ ] No secrets/keys in source (Google Client ID in constants.js is public web client ID — OK)
- [ ] No user-controlled data used in navigation or eval
- [ ] API errors don't leak sensitive info to UI
- [ ] Account deletion fully clears local storage

### Performance
- [ ] `useMemo` for WARNINGS/TASK_DESCRIPTIONS (already done in EarnScreen + GetSubscribersScreen)
- [ ] `useCallback` on useFocusEffect callbacks
- [ ] No large objects recreated in render loops
- [ ] FlatList / SectionList used for lists (not ScrollView + map)

### Localization
- [ ] No hardcoded English strings in user-facing UI
- [ ] New translation keys added to ALL 15 locale files
- [ ] Interpolation variables named correctly (`{{variable}}`)
- [ ] `getWarnings(t)` / `getTaskDescriptions(t)` memoized with useMemo

### API Safety
- [ ] User-initiated API calls show loading state + error feedback
- [ ] Error codes handled specifically before generic catch
- [ ] No raw error messages from backend shown directly to user
- [ ] `refreshUser()` called after balance-changing operations

### Navigation
- [ ] No navigation outside of component scope
- [ ] Screen names match those registered in navigator

### Theme Compliance
- [ ] Colors from `theme/index.js` (not hardcoded hex)
- [ ] Spacing from `spacing` tokens
- [ ] Border radii from `radius` tokens

## Red Flags
- Hardcoded strings → must be localized
- `catch (_) {}` on user-initiated actions → must show error
- Direct `fetch()` call → must use `api.js`
- Hardcoded price values → must use helpers.js `SLOT_COSTS`
- Reading AsyncStorage directly in screens → must use `useAuth()` or `storageService`
