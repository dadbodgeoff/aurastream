import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  AccessibilityInfo,
  Image,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth, AURASTREAM_BRANDING } from '@aurastream/shared';
// Haptics import - will be available when expo-haptics is installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  // Dynamic import for optional dependency
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available, haptic feedback will be disabled
}

import { colors as tokenColors } from '@aurastream/ui/tokens';

// Design tokens from shared package
const colors = {
  backgroundBase: tokenColors.background.base,
  backgroundSurface: tokenColors.background.surface,
  backgroundElevated: tokenColors.background.elevated,
  textPrimary: tokenColors.text.primary,
  textSecondary: tokenColors.text.secondary,
  primary: tokenColors.interactive[600],
  primaryHover: tokenColors.interactive[500],
  accent: tokenColors.accent[600],
  error: tokenColors.error.main,
  border: tokenColors.border.default,
  inputBackground: tokenColors.background.surface,
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear errors when inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
    if (localError) {
      setLocalError(null);
    }
  }, [email, password]);

  const validateInputs = useCallback((): boolean => {
    if (!email.trim()) {
      setLocalError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setLocalError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return false;
    }
    return true;
  }, [email, password]);

  const handleLogin = async () => {
    if (!validateInputs()) {
      // Haptic feedback on validation error
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    try {
      await login(email, password);
      // Success haptic feedback
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace('/dashboard');
    } catch (err) {
      // Error haptic feedback
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      // Error is handled by the store
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github' | 'twitch') => {
    // TODO: Implement OAuth login with expo-auth-session
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log(`OAuth login with ${provider}`);
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: AURASTREAM_BRANDING.logo.url }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Welcome back</Text>
        </View>

        {/* Error Message */}
        {displayError && (
          <View
            style={styles.errorContainer}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, displayError ? styles.inputError : undefined]}
            placeholder="Enter your email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isLoading}
            accessible={true}
            accessibilityLabel="Email address"
            accessibilityHint="Enter your email address to log in"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, displayError ? styles.inputError : undefined]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              editable={!isLoading}
              accessible={true}
              accessibilityLabel="Password"
              accessibilityHint="Enter your password to log in"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Text style={styles.passwordToggleText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotPassword}
          accessible={true}
          accessibilityRole="link"
          accessibilityLabel="Forgot password"
        >
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Log in"
          accessibilityState={{ disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.loginButtonText}>Log In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* OAuth Buttons */}
        <View style={styles.oauthContainer}>
          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleOAuthLogin('google')}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <Text style={styles.oauthButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleOAuthLogin('github')}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Continue with GitHub"
          >
            <Text style={styles.oauthButtonText}>GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleOAuthLogin('twitch')}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Continue with Twitch"
          >
            <Text style={styles.oauthButtonText}>Twitch</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <Link href="/signup" asChild>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="link"
              accessibilityLabel="Sign up for an account"
            >
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: AURASTREAM_BRANDING.logoSizes.lg.width,
    height: AURASTREAM_BRANDING.logoSizes.lg.height,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 70,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordToggleText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: colors.accent,
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginHorizontal: 16,
  },
  oauthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  oauthButton: {
    flex: 1,
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  oauthButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  signupText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
});
