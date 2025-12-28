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
import { 
  useBrandKits, 
  useGenerateTwitchAsset, 
  useGeneratePack 
} from '@aurastream/api-client';
import type { BrandKit, TwitchAssetType, PackType } from '@aurastream/api-client';

// Haptics import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

import { colors as tokenColors } from '@aurastream/ui/tokens';

// Design tokens from shared package
// Note: Twitch tab uses Twitch purple (#9146FF) for primary to match Twitch branding
const colors = {
  backgroundBase: tokenColors.background.base,
  backgroundSurface: tokenColors.background.surface,
  backgroundElevated: tokenColors.background.elevated,
  textPrimary: tokenColors.text.primary,
  textSecondary: tokenColors.text.secondary,
  textTertiary: tokenColors.text.tertiary,
  primary: '#9146FF', // Twitch purple - intentionally kept for Twitch branding
  primaryHover: tokenColors.interactive[500],
  accent: tokenColors.accent[600],
  error: tokenColors.error.main,
  success: tokenColors.success.main,
  border: tokenColors.border.default,
};

// Twitch asset types
const TWITCH_ASSET_TYPES: { id: TwitchAssetType; label: string; dimensions: string }[] = [
  { id: 'twitch_emote', label: 'Emote', dimensions: '512×512' },
  { id: 'twitch_badge', label: 'Badge', dimensions: '72×72' },
  { id: 'twitch_panel', label: 'Panel', dimensions: '320×160' },
  { id: 'twitch_offline', label: 'Offline Screen', dimensions: '1920×1080' },
  { id: 'twitch_banner', label: 'Banner', dimensions: '1200×480' },
];

// Pack types
const PACK_TYPES: { id: PackType; label: string; description: string }[] = [
  { id: 'seasonal', label: 'Seasonal Pack', description: '5 assets' },
  { id: 'emote', label: 'Emote Pack', description: '5 emotes' },
  { id: 'stream', label: 'Stream Pack', description: '4 assets' },
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

// Color swatch component
function ColorSwatch({ color }: { color: string }) {
  return <View style={[styles.colorSwatch, { backgroundColor: color }]} />;
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

// Mode toggle component
function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: 'single' | 'pack';
  onModeChange: (mode: 'single' | 'pack') => void;
}) {
  return (
    <View style={styles.modeToggle}>
      <TouchableOpacity
        style={[styles.modeButton, mode === 'single' && styles.modeButtonActive]}
        onPress={() => onModeChange('single')}
        accessible={true}
        accessibilityRole="button"
        accessibilityState={{ selected: mode === 'single' }}
        accessibilityLabel="Single Asset mode"
      >
        <Text style={[styles.modeButtonText, mode === 'single' && styles.modeButtonTextActive]}>
          Single Asset
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, mode === 'pack' && styles.modeButtonActive]}
        onPress={() => onModeChange('pack')}
        accessible={true}
        accessibilityRole="button"
        accessibilityState={{ selected: mode === 'pack' }}
        accessibilityLabel="Asset Pack mode"
      >
        <Text style={[styles.modeButtonText, mode === 'pack' && styles.modeButtonTextActive]}>
          Asset Pack
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Asset type card
function AssetTypeCard({
  type,
  isSelected,
  onPress,
}: {
  type: (typeof TWITCH_ASSET_TYPES)[0];
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

// Pack type card
function PackTypeCard({
  pack,
  isSelected,
  onPress,
}: {
  pack: (typeof PACK_TYPES)[0];
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
      accessibilityLabel={`${pack.label}, ${pack.description}`}
    >
      <View style={styles.assetTypeContent}>
        <Text style={styles.assetTypeLabel}>{pack.label}</Text>
        <Text style={styles.assetTypeDimensions}>{pack.description}</Text>
      </View>
      {isSelected && <CheckIcon />}
    </TouchableOpacity>
  );
}

// Brand kit card
function BrandKitCard({
  brandKit,
  isSelected,
  onPress,
}: {
  brandKit: BrandKit;
  isSelected: boolean;
  onPress: () => void;
}) {
  const allColors = [...(brandKit.primary_colors || []), ...(brandKit.accent_colors || [])].slice(0, 4);

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

export default function TwitchGenerateScreen() {
  const router = useRouter();
  const { data: brandKitsData, isLoading: brandKitsLoading } = useBrandKits();
  const generateAsset = useGenerateTwitchAsset();
  const generatePack = useGeneratePack();

  const [mode, setMode] = useState<'single' | 'pack'>('single');
  const [selectedAssetType, setSelectedAssetType] = useState<TwitchAssetType>('twitch_emote');
  const [selectedPackType, setSelectedPackType] = useState<PackType>('seasonal');
  const [selectedBrandKit, setSelectedBrandKit] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');

  const brandKits = brandKitsData?.brandKits ?? [];
  const isGenerating = generateAsset.isPending || generatePack.isPending;

  const handleModeChange = useCallback((newMode: 'single' | 'pack') => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMode(newMode);
  }, []);

  const handleAssetTypeSelect = useCallback((typeId: TwitchAssetType) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedAssetType(typeId);
  }, []);

  const handlePackTypeSelect = useCallback((packId: PackType) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPackType(packId);
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
      if (mode === 'single') {
        await generateAsset.mutateAsync({
          assetType: selectedAssetType,
          brandKitId: selectedBrandKit,
          customPrompt: customPrompt.trim() || undefined,
        });
      } else {
        await generatePack.mutateAsync({
          packType: selectedPackType,
          brandKitId: selectedBrandKit,
          customPrompt: customPrompt.trim() || undefined,
        });
      }

      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        'Generation Started',
        mode === 'single' 
          ? 'Your Twitch asset is being generated.'
          : 'Your asset pack is being generated.',
        [
          {
            text: 'View Assets',
            onPress: () => router.push('/(tabs)/assets'),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );

      setCustomPrompt('');
    } catch (error) {
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to start generation';
      Alert.alert('Generation Failed', errorMessage);
    }
  }, [mode, selectedAssetType, selectedPackType, selectedBrandKit, customPrompt, generateAsset, generatePack, router]);

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
            <Text style={styles.headerTitle}>Twitch Assets</Text>
            <Text style={styles.headerSubtitle}>
              Generate Twitch-optimized assets using your brand kit
            </Text>
          </View>

          {/* Step 1: Generation Mode */}
          <View style={styles.section}>
            <SectionHeader step={1} title="Generation Mode" />
            <ModeToggle mode={mode} onModeChange={handleModeChange} />
          </View>

          {/* Step 2: Select Asset/Pack Type */}
          <View style={styles.section}>
            <SectionHeader step={2} title={mode === 'single' ? 'Select Asset Type' : 'Select Pack Type'} />
            {mode === 'single' ? (
              <View style={styles.assetTypeGrid}>
                {TWITCH_ASSET_TYPES.map((type) => (
                  <AssetTypeCard
                    key={type.id}
                    type={type}
                    isSelected={selectedAssetType === type.id}
                    onPress={() => handleAssetTypeSelect(type.id)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.assetTypeGrid}>
                {PACK_TYPES.map((pack) => (
                  <PackTypeCard
                    key={pack.id}
                    pack={pack}
                    isSelected={selectedPackType === pack.id}
                    onPress={() => handlePackTypeSelect(pack.id)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Step 3: Select Brand Kit */}
          <View style={styles.section}>
            <SectionHeader step={3} title="Select Brand Kit" />
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

          {/* Step 4: Custom Prompt */}
          <View style={styles.section}>
            <SectionHeader step={4} title="Custom Prompt (Optional)" />
            <View style={styles.promptContainer}>
              <TextInput
                style={styles.promptInput}
                value={customPrompt}
                onChangeText={setCustomPrompt}
                placeholder="Add specific details... (e.g., 'Excited expression with sparkles')"
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
            accessibilityLabel={mode === 'single' ? 'Generate asset' : 'Generate pack'}
            accessibilityState={{ disabled: !canGenerate }}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color={colors.textPrimary} />
                <Text style={styles.generateButtonText}>Generating...</Text>
              </>
            ) : (
              <Text style={styles.generateButtonText}>
                {mode === 'single' ? 'Generate Asset' : 'Generate Pack'}
              </Text>
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

  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
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
    backgroundColor: 'rgba(145, 70, 255, 0.1)',
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
    backgroundColor: 'rgba(145, 70, 255, 0.1)',
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
