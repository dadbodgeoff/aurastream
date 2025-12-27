/**
 * Validation badge component for showing prompt quality.
 * @module coach/components/ValidationBadge
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants';
import type { ValidationResult } from '../types';

interface ValidationBadgeProps {
  validation: ValidationResult;
}

export function ValidationBadge({ validation }: ValidationBadgeProps) {
  const { qualityScore, isGenerationReady, issues } = validation;
  const percentage = Math.round(qualityScore * 100);

  const hasErrors = issues.some((i) => i.severity === 'error');
  const hasWarnings = issues.some((i) => i.severity === 'warning');

  let badgeStyle = styles.badgeInProgress;
  let badgeText = 'In Progress';

  if (hasErrors) {
    badgeStyle = styles.badgeError;
    badgeText = 'Needs Work';
  } else if (hasWarnings) {
    badgeStyle = styles.badgeWarning;
    badgeText = 'Good';
  } else if (isGenerationReady) {
    badgeStyle = styles.badgeReady;
    badgeText = 'Ready';
  }

  return (
    <View style={styles.validationContainer}>
      <View style={[styles.validationBadge, badgeStyle]}>
        <Text style={styles.validationBadgeText}>
          {badgeText} {percentage}%
        </Text>
      </View>
      {issues.length > 0 && (
        <Text style={styles.validationIssues}>
          {issues.length} {issues.length === 1 ? 'suggestion' : 'suggestions'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  validationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  validationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badgeInProgress: {
    backgroundColor: colors.textTertiary,
  },
  badgeError: {
    backgroundColor: colors.error,
  },
  badgeWarning: {
    backgroundColor: '#F59E0B',
  },
  badgeReady: {
    backgroundColor: colors.success,
  },
  validationIssues: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});
