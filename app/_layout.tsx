import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useGameStore } from '@/store/useGameStore';
import { useThemeStore } from '@/store/useThemeStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrateTheme);
  const themeGroup = useThemeStore((s) => s.theme.group);

  useEffect(() => {
    hydrate();
    hydrateTheme();
  }, [hydrate, hydrateTheme]);

  return (
    <ThemeProvider value={themeGroup === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={themeGroup === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
