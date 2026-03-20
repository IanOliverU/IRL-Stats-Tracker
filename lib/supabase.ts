import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'expo-sqlite/localStorage/install';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

const missingSupabaseEnvVars = [
  !supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
  !supabasePublishableKey ? 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY' : null,
].filter((value): value is string => value !== null);

const supabaseConfigErrorMessage =
  missingSupabaseEnvVars.length > 0
    ? `Missing Supabase environment variables: ${missingSupabaseEnvVars.join(', ')}`
    : null;

let supabaseClient: SupabaseClient | null = null;

if (!supabaseConfigErrorMessage) {
  const resolvedSupabaseUrl = supabaseUrl;
  const resolvedSupabasePublishableKey = supabasePublishableKey;

  supabaseClient = createClient(resolvedSupabaseUrl!, resolvedSupabasePublishableKey!, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabaseConfig = {
  isConfigured: supabaseConfigErrorMessage === null,
  errorMessage: supabaseConfigErrorMessage,
  missingEnvVars: missingSupabaseEnvVars,
} as const;

function getSupabaseHost(): string | null {
  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).host;
  } catch {
    return null;
  }
}

export function getSupabaseNetworkErrorMessage(): string {
  const host = getSupabaseHost();

  if (host) {
    return `Couldn't reach Supabase at ${host}. Check that EXPO_PUBLIC_SUPABASE_URL is your project API URL, then rebuild the app.`;
  }

  return "Couldn't reach Supabase. Check that EXPO_PUBLIC_SUPABASE_URL is valid, then rebuild the app.";
}

export function requireSupabase(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error(
      supabaseConfig.errorMessage ?? 'Supabase is not configured for this build.'
    );
  }

  return supabaseClient;
}
