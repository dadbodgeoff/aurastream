import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBrandKits, useGenerateAsset } from '@aurastream/api-client';
import type { BrandKit, AssetType } from '@aurastream/api-client';

// Haptics import - will be available when expo-haptics is installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

import { colors as tokenColors } from '@aurastream/ui/tokens';

// Design tokens from shared package
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

// Asset types with their specifications
const ASSET_TYPES = [
  { id: 'thumbnail' as AssetType, label: 'Thumbnail', dimensions: '1280×720' },
  { id: 'overlay' as AssetType, label: 'Stream Overlay', dimensions: '1920×1080' },
  { id: 'banner' as AssetType, label: 'Channel Banner', dimensions: '1200×480' },
  { id: 'story_graphic' as AssetType, label: 'Story Graphic', dimensions: '1080×1920' },
  { id: 'clip_cover' as AssetType, label: 'Clip Cover', dimensions: '1080×1080' },
];

const MAX_PROMPT_LENGTH = 500;

// Check icon component
function CheckIcon() {
  return (
    <View style={styles.checkIcon}>
      <Text style={styles.checkIconText}>✓</Text>
    </View>
  );
}

// Sparkles icon component
function SparklesIcon() {
  return (
    <Text style={styles.sparklesIcon}>✨</Text>
  );
}

// Color swatch component
function ColorSwatch({ color }: { color: string }) {
  return <View style={[styles.colorSwatch, { backgroundColor: color }]} />;
}

// Asset type selection card
function AssetTypeCard({
  type,
  isSelected,
  onPress,
}: {
  type: typeof ASSET_TYPES[0];
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.assetTypeCard, isSelected && styles.assetTypeCardSelected]}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${type.label}, ${type.dimensions}`}
    >
      <View style={styles.assetTypeContent}>
        <Text style={styles.assetTypeLabel}>{type.label}</Text>
        <Text style={styles.assetTypeDimensions}>{type.dimensions}</Text>
      </View>
      {isSelected && <CheckIcon />}
    </TouchableOpacity>
  );
}

// Brand kit selection card
function BrandKitCard({
  brandKit,
  isSelected,
  onPress,
}: {
  brandKit: BrandKit;
  isSelected: boolean;
  onPress: () => void;
}) {
  const allColors = [...brandKit.primary_colors, ...brandKit.accent_colors].slice(0, 4);

  return (
    <TouchableOpacity
      style={[styles.brandKitCard, isSelected && styles.brandKitCardSelected]}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${brandKit.name} brand kit`}
    >
      <View style={styles.brandKitContent}>
        <Text style={styles.brandKitName} numberOfLines={1}>
          {brandKit.name}
        </Text>
        <View style={styles.brandKitColors}>
          {allColors.map((color, index) => (
            <ColorSwatch key={`${color}-${index}`} color={color} />
          ))}
        </View>
      </View>
      {isSelected && <CheckIcon />}
    </TouchableOpacity>
  );
}

// Empty brand kits state
function EmptyBrandKits({ onCreatePress }: { onCreatePress: () => void }) {
  return (
    <View style={styles.emptyBrandKits}>
      <Text style={styles.emptyBrandKitsText}>No brand kits found</Text>
      <TouchableOpacity
        style={styles.createBrandKitButton}
        onPress={onCreatePress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Create brand kit"
      >
        <Text style={styles.createBrandKitButtonText}>Create Brand Kit</Text>
      </TouchableOpacity>
    </View>
  );
}

// Section header component
function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function GenerateScreen() {
  const router = useRouter();
  const { data: brandKitsData, isLoading: brandKitsLoading } = useBrandKits();
  const generateAsset = useGenerateAsset();

  const [selectedType, setSelectedType] = useState<AssetType>('thumbnail');
  const [selectedBrandKit, setSelectedBrandKit] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');

  const brandKits = brandKitsData?.brand_kits ?? [];
  const isGenerating = generateAsset.isPending;

  const handleTypeSelect = useCallback((typeId: AssetType) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedType(typeId);
  }, []);

  const handleBrandKitSelect = useCallback((kitId: string) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedBrandKit(kitId);
  }, []);

  const handleCreateBrandKit = useCallback(() => {
    router.push('/brand-kits/create');
  }, [router]);

  const handleGenerate = useCallback(async () => {
    if (!selectedBrandKit) {
      Alert.alert('Select Brand Kit', 'Please select a brand kit to continue.');
      return;
    }

    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await generateAsset.mutateAsync({
        assetType: selectedType,
        brandKitId: selectedBrandKit,
        customPrompt: customPrompt.trim() || undefined,
      });

      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        'Generation Started',
        'Your asset is being generated. Check the Assets tab for results.',
        [
          {
            text: 'View Assets',
            onPress: () => router.push('/(tabs)/assets'),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );

      // Reset form
      setCustomPrompt('');
    } catch (error) {
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to start generation';
      Alert.alert('Generation Failed', errorMessage);
    }
  }, [selectedType, selectedBrandKit, customPrompt, generateAsset, router]);

  const canGenerate = selectedBrandKit && !isGenerating;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
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
            <Text style={styles.headerTitle}>Generate Asset</Text>
            <Text style={styles.headerSubtitle}>
              Create AI-powered streaming assets using your brand kit
            </Text>
          </View>

          {/* Step 1: Select Asset Type */}
          <View style={styles.section}>
            <SectionHeader step={1} title="Select Asset Type" />
            <View style={styles.assetTypeGrid}>
              {ASSET_TYPES.map((type) => (
                <AssetTypeCard
                  key={type.id}
                  type={type}
                  isSelected={selectedType === type.id}
                  onPress={() => handleTypeSelect(type.id)}
                />
              ))}
            </View>
          </View>

          {/* Step 2: Select Brand Kit */}
          <View style={styles.section}>
            <SectionHeader step={2} title="Select Brand Kit" />
            {brandKitsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading brand kits...</Text>
              </View>
            ) : brandKits.length > 0 ? (
              <View style={styles.brandKitList}>
                {brandKits.map((kit) => (
                  <BrandKitCard
                    key={kit.id}
                    brandKit={kit}
                    isSelected={selectedBrandKit === kit.id}
                    onPress={() => handleBrandKitSelect(kit.id)}
                  />
                ))}
              </View>
            ) : (
              <EmptyBrandKits onCreatePress={handleCreateBrandKit} />
            )}
          </View>

          {/* Step 3: Custom Prompt (Optional) */}
          <View style={styles.section}>
            <SectionHeader step={3} title="Custom Prompt (Optional)" />
            <View style={styles.promptContainer}>
              <TextInput
                style={styles.promptInput}
                value={customPrompt}
                onChangeText={setCustomPrompt}
                placeholder="Add specific details for your asset... (e.g., 'Epic gaming moment with dramatic lighting')"
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={MAX_PROMPT_LENGTH}
                textAlignVertical="top"
              />
              <View style={styles.promptFooter}>
                <Text style={styles.promptCounter}>
                  {customPrompt.length}/{MAX_PROMPT_LENGTH}
                </Text>
              </View>
            </View>
          </View>

          {/* Spacer for button */}
          <View style={styles.buttonSpacer} />
        </ScrollView>

        {/* Generate Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={!canGenerate}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Generate asset"
            accessibilityState={{ disabled: !canGenerate }}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color={colors.textPrimary} />
                <Text style={styles.generateButtonText}>Generating...</Text>
              </>
            ) : (
              <>
                <SparklesIcon />
                <Text style={styles.generateButtonText}>Generate Asset</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Header
  header: {
    marginBottom: 24,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Asset Type Grid
  assetTypeGrid: {
    gap: 10,
  },
  assetTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetTypeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  assetTypeContent: {
    flex: 1,
  },
  assetTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  assetTypeDimensions: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  // Check Icon
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Sparkles Icon
  sparklesIcon: {
    fontSize: 18,
  },

  // Brand Kit List
  brandKitList: {
    gap: 10,
  },
  brandKitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandKitCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  brandKitContent: {
    flex: 1,
  },
  brandKitName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  brandKitColors: {
    flexDirection: 'row',
    gap: 6,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Empty Brand Kits
  emptyBrandKits: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyBrandKitsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  createBrandKitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBrandKitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Loading
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

  // Prompt Input
  promptContainer: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  promptInput: {
    padding: 16,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 100,
  },
  promptFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  promptCounter: {
    fontSize: 12,
    color: colors.textTertiary,
  },

  // Button
  buttonSpacer: {
    height: 80,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.backgroundBase,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: colors.backgroundElevated,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
