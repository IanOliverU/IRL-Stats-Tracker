import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

export type OAuthProvider = 'discord' | 'facebook' | 'github' | 'google' | 'twitter';

type EmailCredentials = {
  email: string;
  password: string;
};

type SignUpCredentials = EmailCredentials & {
  name?: string;
};

type SignUpResult = {
  needsEmailConfirmation: boolean;
};

interface AuthState {
  initialized: boolean;
  session: Session | null;
  user: User | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  handleDeepLink: (url: string) => Promise<void>;
  signInWithEmail: (credentials: EmailCredentials) => Promise<void>;
  signInWithProvider: (provider: OAuthProvider) => Promise<void>;
  signUpWithEmail: (credentials: SignUpCredentials) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;
const authRedirectTo = Linking.createURL('auth/callback');

async function setSessionFromUrl(url: string): Promise<void> {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const hashParams = hashIndex >= 0 ? new URLSearchParams(url.slice(hashIndex + 1)) : null;
  const queryParams =
    queryIndex >= 0
      ? new URLSearchParams(url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined))
      : null;

  const accessToken = hashParams?.get('access_token') ?? queryParams?.get('access_token');
  const refreshToken = hashParams?.get('refresh_token') ?? queryParams?.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }
}

async function ensureProfile(user: User): Promise<void> {
  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null;
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('Failed to upsert Supabase profile', error);
  }
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  initialized: false,
  session: null,
  user: null,

  initialize: async () => {
    if (!authSubscription) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          void ensureProfile(session.user);
        }

        set({
          initialized: true,
          session,
          user: session?.user ?? null,
        });
      });

      authSubscription = data.subscription;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Failed to load Supabase session', error);
    }

    set({
      initialized: true,
      session: data.session,
      user: data.session?.user ?? null,
    });

    if (data.session?.user) {
      await ensureProfile(data.session.user);
    }
  },

  handleDeepLink: async (url: string) => {
    await setSessionFromUrl(url);
  },

  signInWithEmail: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await ensureProfile(data.user);
    }
  },

  signInWithProvider: async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authRedirectTo,
      },
    });

    if (error) {
      throw error;
    }

    if (data.url) {
      await Linking.openURL(data.url);
    }
  },

  signUpWithEmail: async ({ email, password, name }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: name ? { name } : undefined,
        emailRedirectTo: authRedirectTo,
      },
    });

    if (error) {
      throw error;
    }

    if (data.user && data.session) {
      await ensureProfile(data.user);
    }

    return {
      needsEmailConfirmation: !data.session,
    };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  },
}));
