# Frontend Memory — SubsShare

## Component Inventory
- `CoinBadge` — coin display pill, `size="md|lg"`
- `LoadingSpinner` — full-screen loading with optional message
- `EmptyState` — empty list state with emoji, title, subtitle
- `StatCard` — metric card with emoji + value + label + accent color
- `ErrorBoundary` — class component, wraps entire app
- `TaskCard` — earn task list item

## Screen Entry Points
All screens live in `src/screens/`. Each is default-exported.

## Screens That Load Data on Focus
- HomeScreen: channels + transactions + myTasks
- EarnScreen: available tasks
- GetSubscribersScreen: user's channels
- MyCampaignsScreen: user's campaigns
- ProfileScreen: transactions + myTasks + user refresh

## Common Patterns
```jsx
// Data loading pattern
useFocusEffect(useCallback(() => { loadData(); }, []));

// Translation
const { t } = useTranslation();

// Auth access
const { user, refreshUser } = useAuth();

// Navigation
const navigation = useNavigation();
// or via props: const ScreenName = ({ navigation }) => ...
```

## Theme Tokens (src/theme/index.js)
```js
colors.bg           // '#0A0A0F' — page background
colors.bgCard       // '#13131A' — card background
colors.bgElevated   // '#1C1C26'
colors.bgInput      // '#1A1A24'
colors.primary      // '#6C63FF'
colors.primaryDark  // '#4E47CC'
colors.primaryGlow  // 'rgba(108,99,255,0.2)'
colors.gold         // '#FFD166'
colors.success      // '#06D6A0'
colors.danger       // '#EF476F'
colors.warning      // '#FFB703'
colors.textPrimary  // '#FFFFFF'
colors.textSecondary// '#9999BB'
colors.textMuted    // '#555570'
colors.border       // '#2A2A3A'

spacing: xs=4, sm=8, md=16, lg=24, xl=32, xxl=48
radius: sm=8, md=12, lg=16, xl=24, full=9999
```

## Known Hardcoded Hex (need migration to theme)
- `EarnScreen.jsx` — uses `'#0A0A0F'`, `'#13131A'`, etc. directly
- `GetSubscribersScreen.jsx` — same
- `MyCampaignsScreen.jsx` — same

## i18n Keys Pattern
Keys are dot-notation: `'earn.title'`, `'common.error'`, `'warnings.beforeSubscribe.title'`
Interpolation: `t('boost.launchMsg', { type: '...', slots: n, cost: '...' })`
Template vars use `{{variable}}` syntax in locale files.

## AsyncStorage Keys
```
@subsshare_token
@subsshare_user
@subsshare_youtube_connected
@subsshare_language
@subsshare_onboarded
```
