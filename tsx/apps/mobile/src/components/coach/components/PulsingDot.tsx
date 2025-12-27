/**
 * Pulsing dot animation for loading states.
 * @module coach/components/PulsingDot
 */

import { useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../constants';

interface PulsingDotProps {
  color?: string;
  size?: number;
  delay?: number;
}

export const PulsingDot = memo(function PulsingDot({
  color = colors.accent,
  size = 8,
  delay = 0,
}: PulsingDotProps) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 600,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            delay,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale, opacity, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
});

interface ThinkingDotsProps {
  color?: string;
}

export const ThinkingDots = memo(function ThinkingDots({
  color = colors.accent,
}: ThinkingDotsProps) {
  return (
    <View style={styles.dotsContainer}>
      <PulsingDot color={color} delay={0} />
      <PulsingDot color={color} delay={200} />
      <PulsingDot color={color} delay={400} />
    </View>
  );
});

const styles = StyleSheet.create({
  dot: {
    marginHorizontal: 3,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
