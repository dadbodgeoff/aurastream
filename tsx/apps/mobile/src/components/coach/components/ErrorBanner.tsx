/**
 * Error banner component.
 * @module coach/components/ErrorBanner
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>⚠️ {message}</Text>
      <TouchableOpacity onPress={onDismiss} accessible={true} accessibilityRole="button">
        <Text style={styles.errorDismiss}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: colors.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    color: colors.textPrimary,
    fontSize: 13,
    flex: 1,
  },
  errorDismiss: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    paddingLeft: 12,
  },
});
