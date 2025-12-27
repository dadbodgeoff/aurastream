import { Tabs } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
import { colors as tokenColors } from '@aurastream/ui/tokens';

// Design tokens from shared package
const colors = {
  backgroundBase: tokenColors.background.base,
  backgroundSurface: tokenColors.background.surface,
  backgroundElevated: tokenColors.background.elevated,
  textPrimary: tokenColors.text.primary,
  textSecondary: tokenColors.text.secondary,
  primary: tokenColors.interactive[600],
  accent: tokenColors.accent[600],
  error: tokenColors.error.main,
  success: tokenColors.success.main,
  border: tokenColors.border.default,
};

// Simple icon components (can be replaced with expo-vector-icons later)
function DashboardIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <View style={[styles.iconSquare, focused && styles.iconFocused]}>
        <View style={styles.dashboardGrid}>
          <View style={[styles.gridItem, focused && styles.gridItemFocused]} />
          <View style={[styles.gridItem, focused && styles.gridItemFocused]} />
          <View style={[styles.gridItem, focused && styles.gridItemFocused]} />
          <View style={[styles.gridItem, focused && styles.gridItemFocused]} />
        </View>
      </View>
    </View>
  );
}

function GenerateIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <View style={[styles.iconSquare, focused && styles.iconFocused]}>
        <Text style={[styles.sparklesEmoji, focused && styles.sparklesEmojiFocused]}>✨</Text>
      </View>
    </View>
  );
}

function AssetsIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <View style={[styles.iconSquare, focused && styles.iconFocused]}>
        <View style={styles.assetsGrid}>
          <View style={[styles.assetItem, focused && styles.assetItemFocused]} />
          <View style={[styles.assetItem, focused && styles.assetItemFocused]} />
          <View style={[styles.assetItemLarge, focused && styles.assetItemFocused]} />
        </View>
      </View>
    </View>
  );
}

function BrandKitsIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <View style={[styles.iconSquare, focused && styles.iconFocused]}>
        <View style={styles.paletteContainer}>
          <View style={[styles.colorDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.colorDot, { backgroundColor: colors.accent }]} />
          <View style={[styles.colorDot, { backgroundColor: colors.success }]} />
        </View>
      </View>
    </View>
  );
}

function SettingsIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <View style={[styles.iconSquare, focused && styles.iconFocused]}>
        <View style={[styles.settingsGear, focused && styles.settingsGearFocused]} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.backgroundBase,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: colors.backgroundSurface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <DashboardIcon focused={focused} />,
          headerTitle: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="generate/index"
        options={{
          title: 'Generate',
          tabBarIcon: ({ focused }) => <GenerateIcon focused={focused} />,
          headerTitle: 'Generate',
        }}
      />
      <Tabs.Screen
        name="assets/index"
        options={{
          title: 'Assets',
          tabBarIcon: ({ focused }) => <AssetsIcon focused={focused} />,
          headerTitle: 'My Assets',
        }}
      />
      <Tabs.Screen
        name="brand-kits/index"
        options={{
          title: 'Brand Kits',
          tabBarIcon: ({ focused }) => <BrandKitsIcon focused={focused} />,
          headerTitle: 'Brand Kits',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <SettingsIcon focused={focused} />,
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  iconContainerFocused: {},
  iconSquare: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocused: {},
  // Dashboard icon styles
  dashboardGrid: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridItem: {
    width: 8,
    height: 8,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
  },
  gridItemFocused: {
    backgroundColor: colors.primary,
  },
  // Generate icon styles
  sparklesEmoji: {
    fontSize: 16,
    opacity: 0.6,
  },
  sparklesEmojiFocused: {
    opacity: 1,
  },
  // Assets icon styles
  assetsGrid: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  assetItem: {
    width: 8,
    height: 8,
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
  },
  assetItemLarge: {
    width: 18,
    height: 8,
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
  },
  assetItemFocused: {
    backgroundColor: colors.primary,
  },
  // Brand Kits icon styles
  paletteContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Settings icon styles
  settingsGear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textSecondary,
  },
  settingsGearFocused: {
    borderColor: colors.primary,
  },
});
