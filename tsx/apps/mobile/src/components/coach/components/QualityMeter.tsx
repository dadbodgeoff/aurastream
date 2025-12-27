/**
 * Animated quality meter with gradient fill.
 * Visual representation of prompt quality score.
 * @module coach/components/QualityMeter
 */

import { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../constants';

interface QualityMeterProps {
  score: number; // 0-1
  label?: string;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const QualityMeter = memo(function QualityMeter({
  score,
  label,
  showPercentage = true,
  size = 'medium',
}: QualityMeterProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedWidth, {
        toValue: score,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.spring(animatedScale, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [score, animatedWidth, animatedScale]);

  const percentage = Math.round(score * 100);

  // Color based on score
  const getColor = () => {
    if (score >= 0.8) return colors.success;
    if (score >= 0.6) return '#F59E0B';
    if (score >= 0.4) return '#F97316';
    return colors.error;
  };

  const sizeStyles = {
    small: { height: 4, borderRadius: 2 },
    medium: { height: 8, borderRadius: 4 },
    large: { height: 12, borderRadius: 6 },
  };

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale: animatedScale }] }]}
    >
      {(label || showPercentage) && (
        <View style={styles.header}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercentage && (
            <Text style={[styles.percentage, { color: getColor() }]}>
              {percentage}%
            </Text>
          )}
        </View>
      )}
      <View style={[styles.track, sizeStyles[size]]}>
        <Animated.View
          style={[
            styles.fill,
            sizeStyles[size],
            {
              width: widthInterpolation,
              backgroundColor: getColor(),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
});

interface CircularQualityMeterProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export const CircularQualityMeter = memo(function CircularQualityMeter({
  score,
  size = 60,
  strokeWidth = 6,
}: CircularQualityMeterProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: score,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [score, animatedValue]);

  const percentage = Math.round(score * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const getColor = () => {
    if (score >= 0.8) return colors.success;
    if (score >= 0.6) return '#F59E0B';
    if (score >= 0.4) return '#F97316';
    return colors.error;
  };

  return (
    <View style={[styles.circularContainer, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.circularTrack,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
          },
        ]}
      />
      {/* Progress indicator (simplified - would use SVG in production) */}
      <View style={styles.circularContent}>
        <Text style={[styles.circularPercentage, { color: getColor() }]}>
          {percentage}
        </Text>
        <Text style={styles.circularLabel}>%</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  circularContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circularTrack: {
    position: 'absolute',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  circularContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  circularPercentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  circularLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginLeft: 1,
  },
});
