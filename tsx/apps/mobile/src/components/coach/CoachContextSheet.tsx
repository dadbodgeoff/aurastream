/**
 * Context Capture Sheet for Prompt Coach (Mobile).
 *
 * State-of-the-art 2025 design with:
 * - Step-by-step animated transitions
 * - Card selection animations with haptic feedback
 * - Progress indicator
 * - Glassmorphism design language
 *
 * @module CoachContextSheet
 */

import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { useBrandKits } from '@aurastream/api-client';
import type { BrandKit } from '@aurastream/api-client';
import type {
  StartCoachRequest,
  AssetType,
  Mood,
  BrandContext,
} from '../../app/(tabs)/coach/index';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

// ============================================================================
// Design Tokens - Import from shared constants
// ============================================================================

import { colors } from './constants';

// ============================================================================
// Constants
// ============================================================================

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CUSTOM_MOOD_LENGTH = 100;
const MIN_DESCRIPTION_LENGTH = 5;
const TOTAL_STEPS = 5;

const ASSET_TYPES: Array<{
  id: AssetType;
  label: string;
  description: string;
  icon: string;
  dimensions: string;
}> = [
  { id: 'twitch_emote', label: 'Twitch Emote', description: 'Custom emotes', icon: '😊', dimensions: '512×512 (1:1)' },
  { id: 'youtube_thumbnail', label: 'YouTube Thumbnail', description: 'Video thumbnails', icon: '🎬', dimensions: '1280×720 (16:9)' },
  { id: 'twitch_banner', label: 'Twitch Banner', description: 'Channel headers', icon: '🖼️', dimensions: '1200×480 (~3:1)' },
  { id: 'twitch_badge', label: 'Twitch Badge', description: 'Sub badges', icon: '🏅', dimensions: '72×72 (1:1)' },
  { id: 'overlay', label: 'Stream Overlay', description: 'Live overlays', icon: '📺', dimensions: '1920×1080 (16:9)' },
  { id: 'story_graphic', label: 'Story Graphic', description: 'Social stories', icon: '📱', dimensions: '1080×1920 (9:16)' },
];

const MOODS: Array<{
  id: Mood;
  label: string;
  emoji: string;
}> = [
  { id: 'hype', label: 'Hype', emoji: '🔥' },
  { id: 'cozy', label: 'Cozy', emoji: '☕' },
  { id: 'rage', label: 'Rage', emoji: '😤' },
  { id: 'chill', label: 'Chill', emoji: '😎' },
  { id: 'custom', label: 'Custom', emoji: '✨' },
];

// ============================================================================
// Type Definitions
// ============================================================================

export interface CoachContextSheetProps {
  onStartChat: (request: StartCoachRequest) => void;
  isLoading?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateColorName(_hex: string, index: number): string {
  return `Color ${index + 1}`;
}

function brandKitToBrandContext(kit: BrandKit): BrandContext {
  const allColors = [...(kit.primary_colors || []), ...(kit.accent_colors || [])];
  const colorInfos = allColors.map((hex, index) => ({
    hex: hex.startsWith('#') ? hex : `#${hex}`,
    name: generateColorName(hex, index),
  }));

  return {
    brand_kit_id: kit.id,
    colors: colorInfos,
    tone: kit.tone,
    fonts: {
      headline: kit.fonts.headline,
      body: kit.fonts.body,
    },
    logo_url: kit.logo_url || undefined,
  };
}

// ============================================================================
// Progress Indicator Component
// ============================================================================

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressIndicator = memo(function ProgressIndicator({
  currentStep,
  totalSteps,
}: ProgressIndicatorProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: currentStep / totalSteps,
      tension: 50,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <Text style={styles.progressText}>
        {currentStep} of {totalSteps} completed
      </Text>
    </View>
  );
});

// ============================================================================
// Section Header Component
// ============================================================================

interface SectionHeaderProps {
  step: number;
  title: string;
  isCompleted: boolean;
}

const SectionHeader = memo(function SectionHeader({
  step,
  title,
  isCompleted,
}: SectionHeaderProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCompleted) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isCompleted, scaleAnim]);

  return (
    <View style={styles.sectionHeader}>
      <Animated.View
        style={[
          styles.stepBadge,
          isCompleted && styles.stepBadgeCompleted,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.stepBadgeText}>{isCompleted ? '✓' : step}</Text>
      </Animated.View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
});

// ============================================================================
// Animated Selection Card
// ============================================================================

interface AnimatedCardProps {
  children: React.ReactNode;
  isSelected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  delay?: number;
}

const AnimatedCard = memo(function AnimatedCard({
  children,
  isSelected,
  onPress,
  accessibilityLabel,
  delay = 0,
}: AnimatedCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const selectedAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim, delay]);

  useEffect(() => {
    Animated.spring(selectedAnim, {
      toValue: isSelected ? 1 : 0,
      tension: 100,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [isSelected, selectedAnim]);

  const borderColor = selectedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const backgroundColor = selectedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(26, 26, 36, 1)', `${colors.primary}1A`],
  });

  return (
    <Animated.View
      style={[
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        accessible={true}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={accessibilityLabel}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.selectionCard,
            { borderColor, backgroundColor },
          ]}
        >
          {children}
          {isSelected && (
            <View style={styles.checkIcon}>
              <Text style={styles.checkIconText}>✓</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ============================================================================
// Brand Kit Card
// ============================================================================

interface BrandKitCardProps {
  brandKit: BrandKit;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

const BrandKitCard = memo(function BrandKitCard({
  brandKit,
  isSelected,
  onPress,
  index,
}: BrandKitCardProps) {
  const allColors = [...(brandKit.primary_colors || []), ...(brandKit.accent_colors || [])].slice(0, 4);

  return (
    <AnimatedCard
      isSelected={isSelected}
      onPress={onPress}
      accessibilityLabel={`${brandKit.name} brand kit`}
      delay={index * 50}
    >
      <View style={styles.selectionCardContent}>
        <Text style={styles.selectionCardTitle} numberOfLines={1}>
          {brandKit.name}
        </Text>
        <Text style={styles.selectionCardSubtitle}>{brandKit.tone}</Text>
        <View style={styles.colorSwatchRow}>
          {allColors.map((color, idx) => (
            <View
              key={`${color}-${idx}`}
              style={[styles.colorSwatch, { backgroundColor: color }]}
            />
          ))}
        </View>
      </View>
    </AnimatedCard>
  );
});

// ============================================================================
// Asset Type Card
// ============================================================================

interface AssetTypeCardProps {
  type: (typeof ASSET_TYPES)[0];
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

const AssetTypeCard = memo(function AssetTypeCard({
  type,
  isSelected,
  onPress,
  index,
}: AssetTypeCardProps) {
  return (
    <AnimatedCard
      isSelected={isSelected}
      onPress={onPress}
      accessibilityLabel={`${type.label}: ${type.description}, ${type.dimensions}`}
      delay={index * 50}
    >
      <View style={styles.assetTypeContent}>
        <View style={styles.assetTypeIcon}>
          <Text style={styles.assetTypeEmoji}>{type.icon}</Text>
        </View>
        <View style={styles.assetTypeText}>
          <Text style={styles.selectionCardTitle}>{type.label}</Text>
          <Text style={styles.selectionCardSubtitle}>{type.description}</Text>
          <Text style={styles.dimensionText}>{type.dimensions}</Text>
        </View>
      </View>
    </AnimatedCard>
  );
});

// ============================================================================
// Mood Chip
// ============================================================================

interface MoodChipProps {
  mood: (typeof MOODS)[0];
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

const MoodChip = memo(function MoodChip({
  mood,
  isSelected,
  onPress,
  index,
}: MoodChipProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim, index]);

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  }, [onPress, scaleAnim]);

  return (
    <Animated.View
      style={[
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={[styles.moodChip, isSelected && styles.moodChipSelected]}
        onPress={handlePress}
        accessible={true}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${mood.label} mood`}
        activeOpacity={0.8}
      >
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>
          {mood.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ============================================================================
// Empty & Loading States
// ============================================================================

const EmptyBrandKits = memo(function EmptyBrandKits() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📦</Text>
      <Text style={styles.emptyStateText}>No brand kits found</Text>
      <Text style={styles.emptyStateSubtext}>
        Create a brand kit first to use Prompt Coach
      </Text>
    </View>
  );
});

const LoadingBrandKits = memo(function LoadingBrandKits() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.loadingText}>Loading brand kits...</Text>
    </View>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export function CoachContextSheet({ onStartChat, isLoading = false }: CoachContextSheetProps) {
  const { data: brandKitsData, isLoading: isBrandKitsLoading } = useBrandKits();

  // Form state
  const [selectedBrandKit, setSelectedBrandKit] = useState<BrandKit | null>(null);
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [customMood, setCustomMood] = useState('');
  const [gameName, setGameName] = useState('');
  const [description, setDescription] = useState('');

  const brandKits = useMemo(() => brandKitsData?.brandKits ?? [], [brandKitsData]);

  // Calculate completed steps
  const completedSteps = useMemo(() => {
    let count = 0;
    if (selectedBrandKit) count++;
    if (assetType) count++;
    if (mood && (mood !== 'custom' || customMood.trim())) count++;
    // Step 4 (game) is optional, always count as complete
    count++;
    if (description.trim().length >= MIN_DESCRIPTION_LENGTH) count++;
    return count;
  }, [selectedBrandKit, assetType, mood, customMood, description]);

  // Validation
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!selectedBrandKit) errs.brandKit = 'Please select a brand kit';
    if (!assetType) errs.assetType = 'Please select an asset type';
    if (!mood) errs.mood = 'Please select a mood';
    if (mood === 'custom' && !customMood.trim()) errs.customMood = 'Please enter a custom mood';
    if (!description.trim()) {
      errs.description = 'Please enter a description';
    } else if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      errs.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
    }
    return errs;
  }, [selectedBrandKit, assetType, mood, customMood, description]);

  const isValid = Object.keys(errors).length === 0;

  // Handlers with haptic feedback
  const handleBrandKitSelect = useCallback((kit: BrandKit) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedBrandKit(kit);
  }, []);

  const handleAssetTypeSelect = useCallback((type: AssetType) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAssetType(type);
  }, []);

  const handleMoodSelect = useCallback((selectedMood: Mood) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMood(selectedMood);
  }, []);

  const handleStartChat = useCallback(() => {
    if (!isValid || !selectedBrandKit || !assetType || !mood) return;

    if (Platform.OS !== 'web' && Haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const request: StartCoachRequest = {
      brand_context: brandKitToBrandContext(selectedBrandKit),
      asset_type: assetType,
      mood,
      description: description.trim(),
    };

    if (mood === 'custom' && customMood.trim()) {
      request.custom_mood = customMood.trim();
    }
    if (gameName.trim()) {
      request.game_name = gameName.trim();
    }

    onStartChat(request);
  }, [isValid, selectedBrandKit, assetType, mood, customMood, gameName, description, onStartChat]);

  const canSubmit = isValid && !isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>✨</Text>
          </View>
          <Text style={styles.headerTitle}>Prompt Coach</Text>
          <Text style={styles.headerSubtitle}>
            Let's craft the perfect prompt for your asset
          </Text>
        </View>

        {/* Progress Indicator */}
        <ProgressIndicator currentStep={completedSteps} totalSteps={TOTAL_STEPS} />

        {/* Step 1: Brand Kit */}
        <View style={styles.section}>
          <SectionHeader step={1} title="Select Brand Kit" isCompleted={!!selectedBrandKit} />
          {isBrandKitsLoading ? (
            <LoadingBrandKits />
          ) : brandKits.length > 0 ? (
            <View style={styles.cardList}>
              {brandKits.map((kit, index) => (
                <BrandKitCard
                  key={kit.id}
                  brandKit={kit}
                  isSelected={selectedBrandKit?.id === kit.id}
                  onPress={() => handleBrandKitSelect(kit)}
                  index={index}
                />
              ))}
            </View>
          ) : (
            <EmptyBrandKits />
          )}
        </View>

        {/* Step 2: Asset Type */}
        <View style={styles.section}>
          <SectionHeader step={2} title="Select Asset Type" isCompleted={!!assetType} />
          <View style={styles.cardGrid}>
            {ASSET_TYPES.map((type, index) => (
              <AssetTypeCard
                key={type.id}
                type={type}
                isSelected={assetType === type.id}
                onPress={() => handleAssetTypeSelect(type.id)}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Step 3: Mood */}
        <View style={styles.section}>
          <SectionHeader
            step={3}
            title="Select Mood"
            isCompleted={!!mood && (mood !== 'custom' || !!customMood.trim())}
          />
          <View style={styles.moodContainer}>
            {MOODS.map((m, index) => (
              <MoodChip
                key={m.id}
                mood={m}
                isSelected={mood === m.id}
                onPress={() => handleMoodSelect(m.id)}
                index={index}
              />
            ))}
          </View>
          {mood === 'custom' && (
            <View style={styles.customMoodContainer}>
              <TextInput
                style={[styles.textInput, errors.customMood ? styles.textInputError : undefined]}
                value={customMood}
                onChangeText={setCustomMood}
                placeholder="Describe your custom mood..."
                placeholderTextColor={colors.textTertiary}
                maxLength={MAX_CUSTOM_MOOD_LENGTH}
              />
              <Text style={styles.charCount}>{customMood.length}/{MAX_CUSTOM_MOOD_LENGTH}</Text>
            </View>
          )}
        </View>

        {/* Step 4: Game (Optional) */}
        <View style={styles.section}>
          <SectionHeader step={4} title="Game (Optional)" isCompleted={true} />
          <TextInput
            style={styles.textInput}
            value={gameName}
            onChangeText={setGameName}
            placeholder="Enter game name (e.g., 'Fortnite')"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Step 5: Description */}
        <View style={styles.section}>
          <SectionHeader
            step={5}
            title="Describe Your Asset"
            isCompleted={description.trim().length >= MIN_DESCRIPTION_LENGTH}
          />
          <TextInput
            style={[styles.textArea, errors.description ? styles.textInputError : undefined]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what you want to create..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={MAX_DESCRIPTION_LENGTH}
            textAlignVertical="top"
          />
          <View style={styles.inputFooter}>
            {errors.description ? (
              <Text style={styles.errorText}>{errors.description}</Text>
            ) : (
              <Text style={styles.helperText}>Be specific about what you want</Text>
            )}
            <Text style={styles.charCount}>{description.length}/{MAX_DESCRIPTION_LENGTH}</Text>
          </View>
        </View>

        <View style={styles.buttonSpacer} />
      </ScrollView>

      {/* Start Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.startButton, !canSubmit && styles.startButtonDisabled]}
          onPress={handleStartChat}
          disabled={!canSubmit}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Start Chat"
          accessibilityState={{ disabled: !canSubmit }}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <>
              <ActivityIndicator size="small" color={colors.textPrimary} />
              <Text style={styles.startButtonText}>Starting...</Text>
            </>
          ) : (
            <>
              <Text style={styles.sparklesIcon}>✨</Text>
              <Text style={styles.startButtonText}>Start Chat</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default CoachContextSheet;

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
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}26`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}4D`,
  },
  headerIcon: {
    fontSize: 28,
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
    textAlign: 'center',
  },

  // Progress
  progressContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepBadgeCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Cards
  cardList: {
    gap: 10,
  },
  cardGrid: {
    gap: 10,
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  selectionCardContent: {
    flex: 1,
  },
  selectionCardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  selectionCardSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  dimensionText: {
    fontSize: 11,
    color: colors.accent,
    marginTop: 2,
    fontWeight: '500',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Asset Type
  assetTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  assetTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetTypeEmoji: {
    fontSize: 20,
  },
  assetTypeText: {
    flex: 1,
  },

  // Color Swatches
  colorSwatchRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Mood
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  moodChipSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}26`,
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  moodLabelSelected: {
    fontWeight: '500',
  },
  customMoodContainer: {
    marginTop: 12,
  },

  // Inputs
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textInputError: {
    borderColor: colors.error,
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 100,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  charCount: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
  },

  // Empty/Loading
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyStateIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Button
  buttonSpacer: {
    height: 100,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: colors.backgroundBase,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  startButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sparklesIcon: {
    fontSize: 18,
  },
});
