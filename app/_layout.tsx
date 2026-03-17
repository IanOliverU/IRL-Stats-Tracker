import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StatusBar, Text, View } from 'react-native';
import 'react-native-reanimated';

import { useGameStore } from '@/store/useGameStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { configureNotificationPresentationAsync, initializeNotificationsAsync } from '@/services/notificationService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const hydrate = useGameStore((s) => s.hydrate);
  const authInitialized = useAuthStore((s) => s.initialized);
  const handleDeepLink = useAuthStore((s) => s.handleDeepLink);
  const initializeAuth = useAuthStore((s) => s.initialize);
  const authUser = useAuthStore((s) => s.user);
  const hydrateTheme = useThemeStore((s) => s.hydrateTheme);
  const colors = useThemeStore((s) => s.theme.colors);
  const themeGroup = useThemeStore((s) => s.theme.group);

  useEffect(() => {
    void initializeAuth();
    hydrate();
    hydrateTheme();
  }, [hydrate, hydrateTheme, initializeAuth]);

  useEffect(() => {
    let active = true;

    async function handleInitialUrl() {
      const initialUrl = await Linking.getInitialURL();
      if (active && initialUrl) {
        try {
          await handleDeepLink(initialUrl);
        } catch (error) {
          console.warn('Failed to handle initial auth link', error);
        }
      }
    }

    void handleInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleDeepLink(url).catch((error) => {
        console.warn('Failed to handle auth link', error);
      });
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [handleDeepLink]);

  useEffect(() => {
    StatusBar.setHidden(true, 'fade');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
    }
  }, []);

  useEffect(() => {
    void configureNotificationPresentationAsync();
    void initializeNotificationsAsync();
  }, []);

  return (
    <ThemeProvider value={themeGroup === 'dark' ? DarkTheme : DefaultTheme}>
      {!authInitialized ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Connecting to your account...</Text>
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!authUser}>
            <Stack.Screen name="auth" />
          </Stack.Protected>
          <Stack.Protected guard={!!authUser}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="quest/[questType]/[questId]"
              options={{ headerShown: true, title: 'Quest Detail' }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack.Protected>
        </Stack>
      )}
    </ThemeProvider>
  );
}
