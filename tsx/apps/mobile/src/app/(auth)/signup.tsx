import { useState, useEffect, useCallback, useMemo } from 'react';
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
  success: tokenColors.success.main,
  warning: '#F59E0B',
  border: tokenColors.border.default,
  inputBackground: tokenColors.background.surface,
};

// Password strength levels
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number;
  feedback: string[];
}

function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return { strength: 'weak', score: 0, feedback: [] };
  }

  // Length checks
  if (password.length >= 8) score += 1;
  else feedback.push('At least 8 characters');

  if (password.length >= 12) score += 1;

  // Character type checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');

  // Determine strength level
  let strength: PasswordStrength;
  if (score <= 2) strength = 'weak';
  else if (score <= 3) strength = 'fair';
  else if (score <= 5) strength = 'good';
  else strength = 'strong';

  return { strength, score, feedback };
}

function getStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return colors.error;
    case 'fair':
      return colors.warning;
    case 'good':
      return colors.accent;
    case 'strong':
      return colors.success;
  }
}

function getStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'fair':
      return 'Fair';
    case 'good':
      return 'Good';
    case 'strong':
      return 'Strong';
  }
}

export default function SignupScreen() {
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Calculate password strength
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  // Clear errors when inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
    if (localError) {
      setLocalError(null);
    }
  }, [displayName, email, password, confirmPassword, acceptedTerms]);

  const validateInputs = useCallback((): boolean => {
    if (!displayName.trim()) {
      setLocalError('Display name is required');
      return false;
    }
    if (displayName.trim().length < 2) {
      setLocalError('Display name must be at least 2 characters');
      return false;
    }
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
    if (passwordStrength.strength === 'weak') {
      setLocalError('Please choose a stronger password');
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }
    if (!acceptedTerms) {
      setLocalError('You must accept the Terms of Service and Privacy Policy');
      return false;
    }
    return true;
  }, [displayName, email, password, confirmPassword, acceptedTerms, passwordStrength]);

  const handleSignup = async () => {
    if (!validateInputs()) {
      // Haptic feedback on validation error
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    try {
      await signup(email, password, displayName.trim(), acceptedTerms);
      // Success haptic feedback
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Navigate to login after successful signup
      router.replace('/login');
    } catch (err) {
      // Error haptic feedback
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      // Error is handled by the store
    }
  };

  const handleOAuthSignup = async (provider: 'google' | 'github' | 'twitch') => {
    // TODO: Implement OAuth signup with expo-auth-session
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log(`OAuth signup with ${provider}`);
  };

  const toggleTerms = () => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAcceptedTerms(!acceptedTerms);
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
          <Text style={styles.tagline}>Create your account</Text>
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

        {/* Display Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={[styles.input, displayError ? styles.inputError : undefined]}
            placeholder="Enter your display name"
            placeholderTextColor={colors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect={false}
            editable={!isLoading}
            accessible={true}
            accessibilityLabel="Display name"
            accessibilityHint="Enter the name that will be shown to others"
          />
        </View>

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
            accessibilityHint="Enter your email address for your account"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, displayError ? styles.inputError : undefined]}
              placeholder="Create a password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!isLoading}
              accessible={true}
              accessibilityLabel="Password"
              accessibilityHint="Create a secure password for your account"
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

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          passwordStrength.score >= level * 1.5
                            ? getStrengthColor(passwordStrength.strength)
                            : colors.border,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text
                style={[
                  styles.strengthLabel,
                  { color: getStrengthColor(passwordStrength.strength) },
                ]}
                accessible={true}
                accessibilityLabel={`Password strength: ${getStrengthLabel(passwordStrength.strength)}`}
              >
                {getStrengthLabel(passwordStrength.strength)}
              </Text>
            </View>
          )}

          {/* Password Requirements */}
          {password.length > 0 && passwordStrength.feedback.length > 0 && (
            <View style={styles.feedbackContainer}>
              {passwordStrength.feedback.map((item, index) => (
                <Text key={index} style={styles.feedbackText}>
                  • {item}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                confirmPassword.length > 0 && password !== confirmPassword ? styles.inputError : undefined,
              ]}
              placeholder="Confirm your password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!isLoading}
              accessible={true}
              accessibilityLabel="Confirm password"
              accessibilityHint="Re-enter your password to confirm"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              <Text style={styles.passwordToggleText}>
                {showConfirmPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={styles.mismatchText}>Passwords do not match</Text>
          )}
          {confirmPassword.length > 0 && password === confirmPassword && (
            <Text style={styles.matchText}>Passwords match</Text>
          )}
        </View>

        {/* Terms Checkbox */}
        <TouchableOpacity
          style={styles.termsContainer}
          onPress={toggleTerms}
          disabled={isLoading}
          accessible={true}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
          accessibilityLabel="Accept Terms of Service and Privacy Policy"
        >
          <View
            style={[
              styles.checkbox,
              acceptedTerms && styles.checkboxChecked,
            ]}
          >
            {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        {/* Signup Button */}
        <TouchableOpacity
          style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
          onPress={handleSignup}
          disabled={isLoading}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Create account"
          accessibilityState={{ disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.signupButtonText}>Create Account</Text>
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
            onPress={() => handleOAuthSignup('google')}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Sign up with Google"
          >
            <Text style={styles.oauthButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleOAuthSignup('github')}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Sign up with GitHub"
          >
            <Text style={styles.oauthButtonText}>GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleOAuthSignup('twitch')}
            disabled={isLoading}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Sign up with Twitch"
          >
            <Text style={styles.oauthButtonText}>Twitch</Text>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="link"
              accessibilityLabel="Log in to your account"
            >
              <Text style={styles.loginLink}>Log in</Text>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'right',
  },
  feedbackContainer: {
    marginTop: 8,
  },
  feedbackText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  mismatchText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  matchText: {
    fontSize: 12,
    color: colors.success,
    marginTop: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.accent,
    fontWeight: '500',
  },
  signupButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
});
