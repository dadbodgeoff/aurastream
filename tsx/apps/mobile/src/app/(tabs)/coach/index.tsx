/**
 * Prompt Coach Screen for Mobile.
 *
 * Main screen for the Prompt Coach feature that combines the Context Capture UI
 * and Chat Interface. Premium users get the full AI-powered coaching experience,
 * while free/pro users see static tips with an upgrade CTA.
 *
 * @module CoachScreen
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@aurastream/shared';
import { CoachContextSheet } from '@/components/coach/CoachContextSheet';
import { CoachChatView } from '@/components/coach/CoachChatView';

// Haptics import - will be available when expo-haptics is installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

// ============================================================================
// Design Tokens - Import from shared package
// ============================================================================

import { colors as tokenColors } from '@aurastream/ui/tokens';

const colors = {
  backgroundBase: tokenColors.background.base,
  backgroundSurface: tokenColors.background.surface,
  backgroundElevated: tokenColors.background.elevated,
  textPrimary: tokenColors.text.primary,
  textSecondary: tokenColors.text.secondary,
  textTertiary: tokenColors.text.tertiary,
  primary: tokenColors.interactive[600],
  primaryHover: tokenColors.interactive[500],
  accent: tokenColors.accent[600],
  error: tokenColors.error.main,
  success: tokenColors.success.main,
  border: tokenColors.border.default,
};

// ============================================================================
// Type Definitions
// ============================================================================

/** Phase of the coach flow */
type CoachPhase = 'context' | 'chat';

/** Asset types supported by the Prompt Coach */
export type AssetType =
  | 'twitch_emote'
  | 'youtube_thumbnail'
  | 'twitch_banner'
  | 'twitch_badge'
  | 'overlay'
  | 'story_graphic';

/** Mood options for asset generation */
export type Mood = 'hype' | 'cozy' | 'rage' | 'chill' | 'custom';

/** Color information for brand context */
export interface ColorInfo {
  hex: string;
  name: string;
}

/** Font information for brand context */
export interface FontInfo {
  headline: string;
  body: string;
}

/** Brand context to send with coach request */
export interface BrandContext {
  brand_kit_id: string;
  colors: ColorInfo[];
  tone: string;
  fonts: FontInfo;
  logo_url?: string;
}

/** Request payload for starting a coach session */
export interface StartCoachRequest {
  brand_context: BrandContext;
  asset_type: AssetType;
  mood: Mood;
  custom_mood?: string;
  game_id?: string;
  game_name?: string;
  description: string;
}

// ============================================================================
// Static Tips Data
// ============================================================================

interface Tip {
  id: string;
  title: string;
  description: string;
  example: string;
  emoji: string;
}

const TIPS: Tip[] = [
  {
    id: 'style_001',
    title: 'Be Specific About Style',
    description: 'Instead of "cool style", specify the exact aesthetic you want.',
    example: '3D render style, vibrant neon colors, cyberpunk aesthetic',
    emoji: '🎨',
  },
  {
    id: 'style_002',
    title: 'Use Your Brand Colors',
    description: 'Include your exact hex codes for consistent branding.',
    example: 'Using brand colors #FF5733 and #3498DB as primary palette',
    emoji: '🌈',
  },
  {
    id: 'emote_001',
    title: 'Keep Emotes Simple',
    description: 'Emotes are viewed at tiny sizes. Simple, bold designs work best.',
    example: 'Simple expressive face, bold outlines, single emotion',
    emoji: '📐',
  },
  {
    id: 'thumb_001',
    title: 'High Contrast is Key',
    description: 'Thumbnails compete for attention. Use bold, contrasting colors.',
    example: 'High contrast, bold colors, dramatic lighting',
    emoji: '✨',
  },
];

const UPGRADE_FEATURES = [
  'AI-powered conversational assistance',
  'Real-time game season context',
  'Iterative prompt refinement',
  'Brand-aware suggestions',
];

// ============================================================================
// Sub-Components
// ============================================================================

interface TipCardProps {
  tip: Tip;
}

function TipCard({ tip }: TipCardProps) {
  return (
    <View style={styles.tipCard}>
      <View style={styles.tipHeader}>
        <Text style={styles.tipEmoji}>{tip.emoji}</Text>
        <Text style={styles.tipTitle}>{tip.title}</Text>
      </View>
      <Text style={styles.tipDescription}>{tip.description}</Text>
      <View style={styles.tipExampleContainer}>
        <Text style={styles.tipExampleLabel}>Example:</Text>
        <Text style={styles.tipExample}>{tip.example}</Text>
      </View>
    </View>
  );
}

function UpgradeCTA({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={styles.upgradeCta}>
      <View style={styles.upgradeIconContainer}>
        <Text style={styles.upgradeIcon}>✨</Text>
      </View>
      <Text style={styles.upgradeTitle}>Unlock Prompt Coach</Text>
      <Text style={styles.upgradeDescription}>
        Get AI-powered prompt refinement with personalized suggestions.
      </Text>
      <View style={styles.upgradeFeatures}>
        {UPGRADE_FEATURES.map((feature, index) => (
          <View key={index} style={styles.upgradeFeatureRow}>
            <Text style={styles.upgradeCheckmark}>✓</Text>
            <Text style={styles.upgradeFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={onUpgrade}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Upgrade to Premium"
      >
        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
      </TouchableOpacity>
    </View>
  );
}

function NonPremiumView({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>💡</Text>
        </View>
        <Text style={styles.headerTitle}>Prompt Tips</Text>
        <Text style={styles.headerSubtitle}>
          Learn how to craft effective prompts for your streaming assets.
        </Text>
      </View>

      {/* Upgrade CTA */}
      <UpgradeCTA onUpgrade={onUpgrade} />

      {/* Tips */}
      <Text style={styles.sectionTitle}>Quick Tips</Text>
      {TIPS.map((tip) => (
        <TipCard key={tip.id} tip={tip} />
      ))}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Want personalized suggestions based on your brand?{' '}
          <Text style={styles.footerLink} onPress={onUpgrade}>
            Upgrade to Premium
          </Text>{' '}
          for AI-powered prompt coaching.
        </Text>
      </View>
    </ScrollView>
  );
}

function LoadingView() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading your profile...</Text>
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CoachScreen() {
  const router = useRouter();
  const user = useUser();

  // Phase state
  const [phase, setPhase] = useState<CoachPhase>('context');

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contextRequest, setContextRequest] = useState<StartCoachRequest | null>(null);

  // Loading state for starting session
  const [isStartingSession, setIsStartingSession] = useState(false);

  /**
   * Check if user has premium access.
   * Premium tier is 'studio' in this system.
   */
  const isPremium = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio';

  /**
   * Handle starting the chat from context form.
   */
  const handleStartChat = useCallback((request: StartCoachRequest) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsStartingSession(true);
    setContextRequest(request);
    setPhase('chat');
    setIsStartingSession(false);
  }, []);

  /**
   * Handle session start from CoachChatView.
   */
  const handleSessionStart = useCallback((newSessionId: string) => {
    setSessionId(newSessionId);
  }, []);

  /**
   * Handle "Generate Now" action from CoachChatView.
   * Navigates to the generate screen with the refined prompt.
   */
  const handleGenerateNow = useCallback(
    (prompt: string) => {
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Navigate to generate screen with prompt params
      router.push({
        pathname: '/(tabs)/generate',
        params: {
          prompt: prompt,
          assetType: contextRequest?.asset_type,
          brandKitId: contextRequest?.brand_context.brand_kit_id,
        },
      });
    },
    [router, contextRequest]
  );

  /**
   * Handle going back to context phase.
   */
  const handleBackToContext = useCallback(() => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPhase('context');
    setSessionId(null);
  }, []);

  /**
   * Handle upgrade navigation.
   */
  const handleUpgrade = useCallback(() => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/(tabs)/settings');
  }, [router]);

  // Show loading state while user data is being fetched
  if (user === null) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingView />
      </SafeAreaView>
    );
  }

  // Non-premium users see tips with upgrade CTA
  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <NonPremiumView onUpgrade={handleUpgrade} />
      </SafeAreaView>
    );
  }

  // Premium users get the full coach experience
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {phase === 'context' ? (
        <CoachContextSheet
          onStartChat={handleStartChat}
          isLoading={isStartingSession}
        />
      ) : (
        <CoachChatView
          sessionId={sessionId}
          onSessionStart={handleSessionStart}
          onGenerateNow={handleGenerateNow}
          onBack={handleBackToContext}
          initialRequest={contextRequest ?? undefined}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Upgrade CTA
  upgradeCta: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  upgradeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  upgradeIcon: {
    fontSize: 24,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  upgradeFeatures: {
    marginBottom: 16,
  },
  upgradeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  upgradeCheckmark: {
    fontSize: 14,
    color: colors.success,
    marginRight: 8,
  },
  upgradeFeatureText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },

  // Tip Card
  tipCard: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tipDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  tipExampleContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 8,
    padding: 12,
  },
  tipExampleLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  tipExample: {
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Footer
  footer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '500',
  },
});
