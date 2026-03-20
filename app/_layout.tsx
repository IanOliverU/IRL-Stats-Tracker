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
import { supabaseConfig } from '@/lib/supabase';
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
  const supabaseConfigured = supabaseConfig.isConfigured;

  useEffect(() => {
    hydrate();
    hydrateTheme();

    if (supabaseConfigured) {
      void initializeAuth();
    }
  }, [hydrate, hydrateTheme, initializeAuth, supabaseConfigured]);

  useEffect(() => {
    if (!supabaseConfigured) {
      return;
    }

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
  }, [handleDeepLink, supabaseConfigured]);

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
      {!supabaseConfigured ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
              padding: 20,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>
              Build configuration missing
            </Text>
            <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
              This APK was built without the Supabase environment variables the app needs before it can show the
              login screen.
            </Text>
            <Text style={{ marginTop: 16, color: colors.text, fontSize: 14, fontWeight: '600' }}>
              Missing values
            </Text>
            <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
              {supabaseConfig.missingEnvVars.join('\n')}
            </Text>
            <Text style={{ marginTop: 16, color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
              Add them to your EAS build environment, rebuild the APK, and reinstall it.
            </Text>
          </View>
        </View>
      ) : !authInitialized ? (
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
