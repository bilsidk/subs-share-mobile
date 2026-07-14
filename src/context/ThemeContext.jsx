import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTES } from '../theme';

const STORAGE_KEY = '@subsshare_theme';
const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light'); // light by default; a saved choice overrides below

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (v === 'light' || v === 'dark') setMode(v); })
      .catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const colors = PALETTES[mode] || PALETTES.light;
  const value = useMemo(() => ({ mode, colors, toggleTheme }), [mode, colors, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  return ctx || { mode: 'light', colors: PALETTES.light, toggleTheme: () => {} };
};

// Convenience: build a StyleSheet from the active palette, memoized per theme.
// Usage: const styles = useThemedStyles(makeStyles);  // makeStyles = (colors) => StyleSheet.create({...})
export function useThemedStyles(factory) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
