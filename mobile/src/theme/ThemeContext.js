import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'letsplay_mobile_theme';

export const DARK_COLORS = {
  mode: 'dark',
  bg: '#05060f',
  panel: '#0b0d1e',
  panel2: '#10142b',
  panelElevated: '#151a36',
  ink: '#eef0ff',
  muted: 'rgba(214, 220, 255, 0.68)',
  dim: 'rgba(214, 220, 255, 0.42)',
  line: 'rgba(148, 130, 255, 0.18)',
  lineStrong: 'rgba(148, 130, 255, 0.38)',
  purple: '#7c3aed',
  violet: '#a855f7',
  cyan: '#22d3ee',
  yellow: '#ffd619',
  green: '#10b981',
  red: '#ef4444',
  tabBarBg: '#080a18',
  inputBg: '#0d1024',
  badgeBg: 'rgba(124, 58, 237, 0.22)',
};

export const LIGHT_COLORS = {
  mode: 'light',
  bg: '#f4f6fc',
  panel: '#ffffff',
  panel2: '#ebeffa',
  panelElevated: '#e2e7f7',
  ink: '#0b0d1e',
  muted: 'rgba(15, 20, 48, 0.68)',
  dim: 'rgba(15, 20, 48, 0.45)',
  line: 'rgba(99, 85, 195, 0.16)',
  lineStrong: 'rgba(99, 85, 195, 0.34)',
  purple: '#6d28d9',
  violet: '#7c3aed',
  cyan: '#0891b2',
  yellow: '#ca8a04',
  green: '#059669',
  red: '#dc2626',
  tabBarBg: '#ffffff',
  inputBg: '#edf0fa',
  badgeBg: 'rgba(109, 40, 217, 0.12)',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') setThemeMode(saved);
      })
      .catch(() => {});
  }, []);

  const setTheme = (next) => {
    const mode = next === 'light' ? 'light' : 'dark';
    setThemeMode(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  };

  const toggleTheme = () => setTheme(themeMode === 'dark' ? 'light' : 'dark');

  const value = useMemo(
    () => ({
      themeMode,
      isDark: themeMode === 'dark',
      colors: themeMode === 'dark' ? DARK_COLORS : LIGHT_COLORS,
      setTheme,
      toggleTheme,
    }),
    [themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
