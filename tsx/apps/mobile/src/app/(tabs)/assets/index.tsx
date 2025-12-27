import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Image,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAssets, useDeleteAsset } from '@aurastream/api-client';
import type { AssetResponse, AssetType } from '@aurastream/api-client';

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

// Asset type labels
const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  thumbnail: 'Thumbnail',
  overlay: 'Stream Overlay',
  banner: 'Channel Banner',
  story_graphic: 'Story Graphic',
  clip_cover: 'Clip Cover',
};

// Filter options
const FILTER_OPTIONS: Array<{ id: AssetType | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'thumbnail', label: 'Thumbnails' },
  { id: 'overlay', label: 'Overlays' },
  { id: 'banner', label: 'Banners' },
  { id: 'story_graphic', label: 'Stories' },
  { id: 'clip_cover', label: 'Clips' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 8;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_MARGIN * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// Filter chip component
function FilterChip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, isSelected && styles.filterChipSelected]}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Filter by ${label}`}
    >
      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Asset card component
function AssetCard({
  asset,
  onPress,
  onLongPress,
}: {
  asset: AssetResponse;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity
      style={styles.assetCard}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${ASSET_TYPE_LABELS[asset.assetType]} asset`}
      accessibilityHint="Tap to view, long press for options"
    >
      <View style={styles.assetImageContainer}>
        {imageError ? (
          <View style={styles.assetImagePlaceholder}>
            <Text style={styles.assetImagePlaceholderText}>🖼️</Text>
          </View>
        ) : (
          <Image
            source={{ uri: asset.url }}
            style={styles.assetImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
      </View>
      <View style={styles.assetInfo}>
        <View style={styles.assetTypeBadge}>
          <Text style={styles.assetTypeBadgeText}>
            {ASSET_TYPE_LABELS[asset.assetType]}
          </Text>
        </View>
        <Text style={styles.assetDimensions}>
          {asset.width}×{asset.height}
        </Text>
        <View style={styles.assetMeta}>
          <Text style={styles.assetDate}>
            {new Date(asset.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.assetSize}>
            {(asset.fileSize / 1024).toFixed(0)} KB
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Empty state component
function EmptyState({ onGeneratePress }: { onGeneratePress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>🖼️</Text>
      </View>
      <Text style={styles.emptyTitle}>No Assets Yet</Text>
      <Text style={styles.emptySubtitle}>
        Generate your first asset using AI. Create thumbnails, overlays, banners, and more.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={onGeneratePress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Generate your first asset"
      >
        <Text style={styles.emptyButtonIcon}>✨</Text>
        <Text style={styles.emptyButtonText}>Generate Your First Asset</Text>
      </TouchableOpacity>
    </View>
  );
}

// Error state component
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorState}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={onRetry}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Retry loading assets"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

// Loading state component
function LoadingState() {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading assets...</Text>
    </View>
  );
}

// Loading skeleton for grid
function LoadingSkeleton() {
  return (
    <View style={styles.skeletonGrid}>
      {[...Array(6)].map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonInfo}>
            <View style={styles.skeletonBadge} />
            <View style={styles.skeletonText} />
          </View>
        </View>
      ))}
    </View>
  );
}

// FAB component
function FloatingActionButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Generate new asset"
    >
      <Text style={styles.fabIcon}>+</Text>
    </TouchableOpacity>
  );
}

export default function AssetsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<AssetType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const assetFilters = filter === 'all' ? undefined : { assetType: filter };
  const { data, isLoading, isError, error, refetch } = useAssets(assetFilters);
  const deleteAsset = useDeleteAsset();

  const assets = data?.assets ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleFilterChange = useCallback((newFilter: AssetType | 'all') => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFilter(newFilter);
  }, []);

  const handleGeneratePress = useCallback(() => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/(tabs)/generate');
  }, [router]);

  const handleAssetPress = useCallback((asset: AssetResponse) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Navigate to asset detail or show preview
    // For now, show action sheet
    handleAssetLongPress(asset);
  }, []);

  const handleAssetLongPress = useCallback((asset: AssetResponse) => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      ASSET_TYPE_LABELS[asset.assetType],
      `${asset.width}×${asset.height} • ${(asset.fileSize / 1024).toFixed(0)} KB`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Share',
          onPress: () => handleShare(asset),
        },
        {
          text: 'Download',
          onPress: () => handleDownload(asset),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteConfirm(asset),
        },
      ]
    );
  }, []);

  const handleShare = useCallback(async (asset: AssetResponse) => {
    try {
      await Share.share({
        url: asset.url,
        message: `Check out my ${ASSET_TYPE_LABELS[asset.assetType]}!`,
      });
    } catch (error) {
      // User cancelled or error
    }
  }, []);

  const handleDownload = useCallback((asset: AssetResponse) => {
    // In a real app, this would use expo-file-system and expo-media-library
    Alert.alert(
      'Download',
      'Asset download will be available in a future update.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleDeleteConfirm = useCallback((asset: AssetResponse) => {
    Alert.alert(
      'Delete Asset',
      'Are you sure you want to delete this asset? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(asset),
        },
      ]
    );
  }, []);

  const handleDelete = useCallback(async (asset: AssetResponse) => {
    try {
      await deleteAsset.mutateAsync(asset.id);
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Error', 'Failed to delete asset. Please try again.');
    }
  }, [deleteAsset]);

  const renderItem = useCallback(
    ({ item }: { item: AssetResponse }) => (
      <AssetCard
        asset={item}
        onPress={() => handleAssetPress(item)}
        onLongPress={() => handleAssetLongPress(item)}
      />
    ),
    [handleAssetPress, handleAssetLongPress]
  );

  const keyExtractor = useCallback((item: AssetResponse) => item.id, []);

  const renderHeader = useCallback(() => (
    <View style={styles.filterContainer}>
      <FlatList
        data={FILTER_OPTIONS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FilterChip
            label={item.label}
            isSelected={filter === item.id}
            onPress={() => handleFilterChange(item.id)}
          />
        )}
      />
    </View>
  ), [filter, handleFilterChange]);

  // Initial loading state
  if (isLoading && !refreshing && assets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {renderHeader()}
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  // Error state
  if (isError && assets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {renderHeader()}
        <ErrorState
          message={error?.message ?? 'Failed to load assets'}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  // Empty state
  if (assets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {renderHeader()}
        <EmptyState onGeneratePress={handleGeneratePress} />
      </SafeAreaView>
    );
  }

  // Main grid view
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={assets}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
      <FloatingActionButton onPress={handleGeneratePress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for FAB
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_MARGIN,
  },

  // Filter styles
  filterContainer: {
    marginBottom: 16,
  },
  filterList: {
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextSelected: {
    color: colors.textPrimary,
  },

  // Asset card styles
  assetCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundElevated,
  },
  assetImage: {
    width: '100%',
    height: '100%',
  },
  assetImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetImagePlaceholderText: {
    fontSize: 32,
  },
  assetInfo: {
    padding: 10,
  },
  assetTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}26`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  assetTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  assetDimensions: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  assetMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assetDate: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  assetSize: {
    fontSize: 10,
    color: colors.textTertiary,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonIcon: {
    fontSize: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Error state
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Loading state
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
  },

  // Skeleton loading
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: CARD_MARGIN,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundElevated,
  },
  skeletonInfo: {
    padding: 10,
    gap: 8,
  },
  skeletonBadge: {
    width: 60,
    height: 20,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 4,
  },
  skeletonText: {
    width: '80%',
    height: 12,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 4,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.textPrimary,
    marginTop: -2,
  },
});
