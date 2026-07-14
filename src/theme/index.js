// Palette aligned to the Claude Design "SubsShare" direction. Both themes share
// identical keys; ThemeContext supplies the active one so the app switches live.
export const PALETTES = {
  dark: {
    bg: '#0B0B12',
    bgCard: '#14141E',
    bgElevated: '#1D1D2B',
    bgInput: '#1A1A26',

    primary: '#7B72FF',
    primaryDark: '#5A51D6',
    primaryGlow: 'rgba(123,114,255,0.16)',

    gold: '#F5C451',
    success: '#4ADE80',
    danger: '#F87171',
    warning: '#F5B742',

    textPrimary: '#F4F4F8',
    textSecondary: '#A2A2B5',
    textMuted: '#6E6E82',

    border: 'rgba(255,255,255,0.08)',
  },
  light: {
    bg: '#F5F5F9',
    bgCard: '#FFFFFF',
    bgElevated: '#EFEFF5',
    bgInput: '#EFEFF5',

    primary: '#655BE8',
    primaryDark: '#4E47CC',
    primaryGlow: 'rgba(101,91,232,0.10)',

    gold: '#B8860B',
    success: '#15803D',
    danger: '#D0342C',
    warning: '#CC7A00',

    textPrimary: '#181822',
    textSecondary: '#5C5C70',
    textMuted: '#9090A2',

    border: 'rgba(22,22,46,0.10)',
  },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };

// Backward-compatible default (dark) for any module that imports `colors`
// directly and isn't theme-reactive.
export const colors = PALETTES.dark;

export default { colors, spacing, radius, PALETTES };
