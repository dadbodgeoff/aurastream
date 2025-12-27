import { View, Text, StyleSheet } from 'react-native';
import { colors as tokenColors } from '@aurastream/ui/tokens';

// Design tokens from shared package
const colors = {
  backgroundBase: tokenColors.background.base,
  backgroundSurface: tokenColors.background.surface,
  textPrimary: tokenColors.text.primary,
  textSecondary: tokenColors.text.secondary,
  primary: tokenColors.interactive[600],
};

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome to Aurastream</Text>
        <Text style={styles.placeholder}>Dashboard content coming soon...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.primary,
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
