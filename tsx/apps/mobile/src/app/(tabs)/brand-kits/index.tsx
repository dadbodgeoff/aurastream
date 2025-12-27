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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useBrandKits,
  useDeleteBrandKit,
  useActivateBrandKit,
} from '@aurastream/api-client';
import type { BrandKit } from '@aurastream/api-client';

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
  primary: tokenColors.interactive[600],
  primaryHover: tokenColors.interactive[500],
  accent: tokenColors.accent[600],
  error: tokenColors.error.main,
  success: tokenColors.success.main,
  border: tokenColors.border.default,
};

// Color swatch component
function ColorSwatch({ color }: { color: string }) {
  return <View style={[styles.colorSwatch, { backgroundColor: color }]} />;
}

// Active badge component
function ActiveBadge() {
  return (
    <View style={styles.activeBadge}>
      <View style={styles.activeDot} />
      <Text style={styles.activeBadgeText}>Active</Text>
    </View>
  );
}

// Brand Kit Card component
function BrandKitCard({
  brandKit,
  onPress,
  onLongPress,
}: {
  brandKit: BrandKit;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const allColors = [...brandKit.primary_colors, ...brandKit.accent_colors].slice(0, 5);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${brandKit.name} brand kit${brandKit.is_active ? ', active' : ''}`}
      accessibilityHint="Tap to view, long press for options"
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {brandKit.name}
        </Text>
        {brandKit.is_active && <ActiveBadge />}
      </View>

      <View style={styles.colorSwatches}>
        {allColors.map((color, index) => (
          <ColorSwatch key={`${color}-${index}`} color={color} />
        ))}
        {allColors.length === 0 && (
          <Text style={styles.noColorsText}>No colors defined</Text>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>
          {brandKit.fonts.headline} / {brandKit.fonts.body}
        </Text>
        <Text style={styles.cardTone}>{brandKit.tone}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Empty state component
function EmptyState({ onCreatePress }: { onCreatePress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <View style={styles.emptyIcon}>
          <View style={[styles.emptyColorDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.emptyColorDot, { backgroundColor: colors.accent }]} />
          <View style={[styles.emptyColorDot, { backgroundColor: colors.success }]} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No Brand Kits Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first brand kit to maintain consistent styling across all your content.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={onCreatePress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Create your first brand kit"
      >
        <Text style={styles.emptyButtonText}>Create Brand Kit</Text>
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
        accessibilityLabel="Retry loading brand kits"
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
      <Text style={styles.loadingText}>Loading brand kits...</Text>
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
      accessibilityLabel="Create new brand kit"
    >
      <Text style={styles.fabIcon}>+</Text>
    </TouchableOpacity>
  );
}

export default function BrandKitsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useBrandKits();
  const deleteBrandKit = useDeleteBrandKit();
  const activateBrandKit = useActivateBrandKit();
  const [refreshing, setRefreshing] = useState(false);

  const brandKits = data?.brand_kits ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleCreatePress = useCallback(() => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Navigate to create brand kit screen
    router.push('/brand-kits/create');
  }, [router]);

  const handleCardPress = useCallback(
    (brandKit: BrandKit) => {
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      // Navigate to brand kit detail/edit screen
      router.push(`/brand-kits/${brandKit.id}`);
    },
    [router]
  );

  const handleCardLongPress = useCallback(
    (brandKit: BrandKit) => {
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const options = [
        {
          text: 'Cancel',
          style: 'cancel' as const,
        },
        {
          text: brandKit.is_active ? 'Already Active' : 'Set as Active',
          onPress: () => handleActivate(brandKit),
          style: 'default' as const,
        },
        {
          text: 'Delete',
          onPress: () => handleDeleteConfirm(brandKit),
          style: 'destructive' as const,
        },
      ];

      Alert.alert(brandKit.name, 'Choose an action', options);
    },
    []
  );

  const handleActivate = useCallback(
    async (brandKit: BrandKit) => {
      if (brandKit.is_active) return;

      try {
        await activateBrandKit.mutateAsync(brandKit.id);
        if (Platform.OS !== 'web' && Haptics) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (err) {
        if (Platform.OS !== 'web' && Haptics) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert('Error', 'Failed to activate brand kit. Please try again.');
      }
    },
    [activateBrandKit]
  );

  const handleDeleteConfirm = useCallback((brandKit: BrandKit) => {
    Alert.alert(
      'Delete Brand Kit',
      `Are you sure you want to delete "${brandKit.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(brandKit),
        },
      ]
    );
  }, []);

  const handleDelete = useCallback(
    async (brandKit: BrandKit) => {
      try {
        await deleteBrandKit.mutateAsync(brandKit.id);
        if (Platform.OS !== 'web' && Haptics) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (err) {
        if (Platform.OS !== 'web' && Haptics) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert('Error', 'Failed to delete brand kit. Please try again.');
      }
    },
    [deleteBrandKit]
  );

  const renderItem = useCallback(
    ({ item }: { item: BrandKit }) => (
      <BrandKitCard
        brandKit={item}
        onPress={() => handleCardPress(item)}
        onLongPress={() => handleCardLongPress(item)}
      />
    ),
    [handleCardPress, handleCardLongPress]
  );

  const keyExtractor = useCallback((item: BrandKit) => item.id, []);

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <LoadingState />
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={error?.message ?? 'Failed to load brand kits'}
          onRetry={refetch}
        />
      </View>
    );
  }

  // Empty state
  if (brandKits.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState onCreatePress={handleCreatePress} />
      </View>
    );
  }

  // Main list view
  return (
    <View style={styles.container}>
      <FlatList
        data={brandKits}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <FloatingActionButton onPress={handleCreatePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  separator: {
    height: 12,
  },

  // Card styles
  card: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardTone: {
    fontSize: 12,
    color: colors.accent,
    textTransform: 'capitalize',
  },

  // Color swatches
  colorSwatches: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noColorsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Active badge
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.success,
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
    flexDirection: 'row',
    gap: 6,
  },
  emptyColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
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
