export const colors = {
  // Backgrounds
  bg: '#0A0A0F',
  bgCard: '#13131A',
  bgElevated: '#1C1C26',
  bgInput: '#1A1A24',

  // Brand
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4E47CC',
  primaryGlow: 'rgba(108, 99, 255, 0.2)',

  // Accents
  gold: '#FFD166',
  goldLight: '#FFE099',
  success: '#06D6A0',
  danger: '#EF476F',
  warning: '#FFB703',

  // YouTube red
  youtube: '#FF0000',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9999BB',
  textMuted: '#555570',

  // Borders
  border: '#2A2A3A',
  borderLight: '#3A3A4A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: colors.textPrimary },
  bodySmall: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
  caption: { fontSize: 11, fontWeight: '500', color: colors.textMuted, letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  coin: { fontSize: 28, fontWeight: '800', color: colors.gold },
};

export default { colors, spacing, radius, typography };
