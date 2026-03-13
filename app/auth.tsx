import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore, type OAuthProvider } from '@/store/useAuthStore';

type AuthMode = 'signIn' | 'signUp';

const AUTH_COLORS = {
  background: '#090b0f',
  surface: '#10141a',
  surfaceMuted: '#151a22',
  border: '#262d37',
  borderStrong: '#323947',
  text: '#f4f7fb',
  textMuted: '#a4adbd',
  textSubtle: '#70798a',
  accent: '#067a43',
  accentPressed: '#056436',
  errorBg: '#321417',
  errorBorder: '#552126',
  errorText: '#ff9da6',
  infoBg: '#10241a',
  infoBorder: '#1e4730',
  infoText: '#7bdca0',
} as const;

const OAUTH_PROVIDERS: readonly {
  id: OAuthProvider;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'discord', label: 'Discord', icon: 'logo-discord' },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook' },
  { id: 'github', label: 'GitHub', icon: 'logo-github' },
  { id: 'google', label: 'Google', icon: 'logo-google' },
  { id: 'twitter', label: 'X', icon: 'logo-twitter' },
];

export default function AuthScreen() {
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signInWithProvider = useAuthStore((s) => s.signInWithProvider);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [showSsoProviders, setShowSsoProviders] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<OAuthProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setShowSsoProviders(false);
    setErrorMessage(null);
    setInfoMessage(null);
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    setErrorMessage(null);
    setInfoMessage(null);

    if (!trimmedEmail || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const result = await signUpWithEmail({
          email: trimmedEmail,
          password,
          name: trimmedName || undefined,
        });

        if (result.needsEmailConfirmation) {
          setInfoMessage('Check your email to confirm your account, then sign in here.');
          setMode('signIn');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        await signInWithEmail({
          email: trimmedEmail,
          password,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleProviderSignIn(provider: OAuthProvider) {
    setErrorMessage(null);
    setInfoMessage(null);
    setOauthLoadingProvider(provider);

    try {
      await signInWithProvider(provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SSO sign-in failed.';
      setErrorMessage(message);
    } finally {
      setOauthLoadingProvider(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AUTH_COLORS.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ backgroundColor: AUTH_COLORS.background }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 18,
            paddingTop: 56,
            paddingBottom: 36,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
            <View style={{ marginBottom: 36 }}>
              <Text
                style={{
                  color: AUTH_COLORS.text,
                  fontSize: 31,
                  fontWeight: '700',
                }}
              >
                {isSignUp ? 'Create account' : 'Welcome back'}
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  color: AUTH_COLORS.textMuted,
                  fontSize: 16,
                  lineHeight: 22,
                }}
              >
                {isSignUp ? 'Create your account to sync your progress' : 'Sign in to your account'}
              </Text>
            </View>

            <Pressable
              onPress={() => setShowSsoProviders((current) => !current)}
              disabled={isSubmitting || oauthLoadingProvider !== null}
              style={({ pressed }) => ({
                width: '100%',
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <View
                style={{
                  minHeight: 56,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: AUTH_COLORS.border,
                  backgroundColor: AUTH_COLORS.surface,
                  paddingHorizontal: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <Ionicons name="lock-closed-outline" size={17} color={AUTH_COLORS.textMuted} />
                <Text
                  style={{
                    marginLeft: 10,
                    color: AUTH_COLORS.text,
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  Continue with SSO
                </Text>
              </View>
            </Pressable>

            {showSsoProviders ? (
              <View style={{ marginTop: 22 }}>
                {OAUTH_PROVIDERS.map((provider, index) => (
                  <View key={provider.id} style={{ marginTop: index === 0 ? 0 : 18 }}>
                    <Pressable
                      onPress={() => void handleProviderSignIn(provider.id)}
                      disabled={isSubmitting || oauthLoadingProvider !== null}
                      style={({ pressed }) => ({
                        width: '100%',
                        opacity: oauthLoadingProvider === provider.id ? 0.88 : pressed ? 0.92 : 1,
                      })}
                    >
                      <View
                        style={{
                          minHeight: 54,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: AUTH_COLORS.border,
                          backgroundColor: AUTH_COLORS.surface,
                          paddingHorizontal: 18,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name={provider.icon} size={18} color={AUTH_COLORS.text} />
                        </View>
                        <Text
                          style={{
                            marginLeft: 12,
                            color: AUTH_COLORS.text,
                            fontSize: 14,
                            fontWeight: '600',
                          }}
                        >
                          {provider.label}
                        </Text>
                        {oauthLoadingProvider === provider.id ? (
                          <View style={{ marginLeft: 'auto', width: 20, alignItems: 'flex-end' }}>
                            <ActivityIndicator color={AUTH_COLORS.infoText} />
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {!showSsoProviders ? (
              <>
                <View style={{ marginTop: 28, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: AUTH_COLORS.border }} />
                  <Text
                    style={{
                      marginHorizontal: 12,
                      color: AUTH_COLORS.textMuted,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    or
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: AUTH_COLORS.border }} />
                </View>

                {isSignUp ? (
                  <View style={{ marginTop: 24 }}>
                    <Text
                      style={{
                        color: AUTH_COLORS.text,
                        fontSize: 14,
                        fontWeight: '600',
                        marginBottom: 10,
                      }}
                    >
                      Display name
                    </Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      placeholder="Hero name"
                      placeholderTextColor={AUTH_COLORS.textSubtle}
                      selectionColor={AUTH_COLORS.infoText}
                      style={{
                        minHeight: 50,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: AUTH_COLORS.border,
                        backgroundColor: AUTH_COLORS.background,
                        color: AUTH_COLORS.text,
                        paddingHorizontal: 16,
                        fontSize: 15,
                      }}
                    />
                  </View>
                ) : null}

                <View style={{ marginTop: 24 }}>
                  <Text
                    style={{
                      color: AUTH_COLORS.text,
                      fontSize: 14,
                      fontWeight: '600',
                      marginBottom: 10,
                    }}
                  >
                    Email
                  </Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={AUTH_COLORS.textSubtle}
                    selectionColor={AUTH_COLORS.infoText}
                    style={{
                      minHeight: 50,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: AUTH_COLORS.border,
                      backgroundColor: AUTH_COLORS.background,
                      color: AUTH_COLORS.text,
                      paddingHorizontal: 16,
                      fontSize: 15,
                    }}
                  />
                </View>

                <View style={{ marginTop: 22 }}>
                  <View
                    style={{
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: AUTH_COLORS.text, fontSize: 14, fontWeight: '600' }}>Password</Text>
                    {!isSignUp ? (
                      <Pressable onPress={() => setInfoMessage('Password reset is not wired yet. We can add it next.')}>
                        <Text style={{ color: AUTH_COLORS.textMuted, fontSize: 14 }}>Forgot password?</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View
                    style={{
                      minHeight: 50,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: AUTH_COLORS.border,
                      backgroundColor: AUTH_COLORS.background,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingLeft: 16,
                      paddingRight: 8,
                    }}
                  >
                    <TextInput
                      secureTextEntry={!showPassword}
                      textContentType={isSignUp ? 'newPassword' : 'password'}
                      autoComplete={isSignUp ? 'new-password' : 'password'}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                      placeholderTextColor={AUTH_COLORS.textSubtle}
                      selectionColor={AUTH_COLORS.infoText}
                      style={{
                        flex: 1,
                        color: AUTH_COLORS.text,
                        fontSize: 15,
                        paddingVertical: 13,
                      }}
                    />
                    <Pressable
                      onPress={() => setShowPassword((current) => !current)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: AUTH_COLORS.border,
                        backgroundColor: AUTH_COLORS.surface,
                      }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={AUTH_COLORS.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>

                {isSignUp ? (
                  <View style={{ marginTop: 18 }}>
                    <Text
                      style={{
                        color: AUTH_COLORS.text,
                        fontSize: 14,
                        fontWeight: '600',
                        marginBottom: 10,
                      }}
                    >
                      Confirm password
                    </Text>
                    <View
                      style={{
                        minHeight: 50,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: AUTH_COLORS.border,
                        backgroundColor: AUTH_COLORS.background,
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingLeft: 16,
                        paddingRight: 8,
                      }}
                    >
                      <TextInput
                        secureTextEntry={!showConfirmPassword}
                        textContentType="newPassword"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Repeat your password"
                        placeholderTextColor={AUTH_COLORS.textSubtle}
                        selectionColor={AUTH_COLORS.infoText}
                        style={{
                          flex: 1,
                          color: AUTH_COLORS.text,
                          fontSize: 15,
                          paddingVertical: 13,
                        }}
                      />
                      <Pressable
                        onPress={() => setShowConfirmPassword((current) => !current)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: AUTH_COLORS.border,
                          backgroundColor: AUTH_COLORS.surface,
                        }}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={AUTH_COLORS.textMuted}
                        />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}

            {errorMessage ? (
              <View
                style={{
                  marginTop: 18,
                  borderRadius: 12,
                  backgroundColor: AUTH_COLORS.errorBg,
                  borderWidth: 1,
                  borderColor: AUTH_COLORS.errorBorder,
                  padding: 12,
                }}
              >
                <Text style={{ color: AUTH_COLORS.errorText, fontSize: 13, lineHeight: 19 }}>{errorMessage}</Text>
              </View>
            ) : null}

            {infoMessage ? (
              <View
                style={{
                  marginTop: 18,
                  borderRadius: 12,
                  backgroundColor: AUTH_COLORS.infoBg,
                  borderWidth: 1,
                  borderColor: AUTH_COLORS.infoBorder,
                  padding: 12,
                }}
              >
                <Text style={{ color: AUTH_COLORS.infoText, fontSize: 13, lineHeight: 19 }}>{infoMessage}</Text>
              </View>
            ) : null}

            {!showSsoProviders ? (
              <>
                <View style={{ marginTop: isSignUp ? 38 : 34 }}>
                  <Pressable
                    onPress={() => void handleSubmit()}
                    disabled={isSubmitting || oauthLoadingProvider !== null}
                    style={({ pressed }) => ({
                      width: '100%',
                      opacity: pressed || isSubmitting ? 0.96 : 1,
                    })}
                  >
                    <View
                      style={{
                        minHeight: 54,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: AUTH_COLORS.border,
                        backgroundColor: AUTH_COLORS.accent,
                        paddingHorizontal: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text
                          style={{
                            color: '#ffffff',
                            fontSize: 16,
                            fontWeight: '700',
                            textAlign: 'center',
                          }}
                        >
                          {isSignUp ? 'Create account' : 'Sign in'}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                </View>

                <View
                  style={{
                    marginTop: 34,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: AUTH_COLORS.textMuted, fontSize: 14 }}>
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  </Text>
                  <Pressable onPress={() => switchMode(isSignUp ? 'signIn' : 'signUp')}>
                    <Text style={{ color: AUTH_COLORS.text, fontSize: 14, fontWeight: '700' }}>
                      {isSignUp ? 'Sign in' : 'Sign up'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
