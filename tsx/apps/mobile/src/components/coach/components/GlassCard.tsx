/**
 * Glassmorphism card component with blur effects.
 * Modern 2025 design language.
 * @module coach/components/GlassCard
 */

import { memo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Platform,
  ViewStyle,
} from 'react-native';
import { colors } from '../constants';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'accent';
  animateIn?: boolean;
  delay?: number;
}

export const GlassCard = memo(function GlassCard({
  children,
  style,
  variant = 'default',
  animateIn = false,
  delay = 0,
}: GlassCardProps) {
  const opacity = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animateIn ? 20 : 0)).current;
  const scale = useRef(new Animated.Value(animateIn ? 0.95 : 1)).current;

  useEffect(() => {
    if (animateIn) {
      const animation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          delay,
          useNativeDriver: true,
        }),
      ]);
      animation.start();
    }
  }, [animateIn, delay, opacity, translateY, scale]);

  const variantStyles = {
    default: styles.variantDefault,
    elevated: styles.variantElevated,
    accent: styles.variantAccent,
  };

  return (
    <Animated.View
      style={[
        styles.card,
        variantStyles[variant],
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {/* Gradient overlay for glass effect */}
      <View style={styles.glassOverlay} />
      {/* Content */}
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  variantDefault: {
    backgroundColor: 'rgba(26, 26, 36, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  variantElevated: {
    backgroundColor: 'rgba(37, 37, 50, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  variantAccent: {
    backgroundColor: `${colors.primary}26`,
    borderWidth: 1,
    borderColor: `${colors.primary}4D`,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Simulated glass effect gradient
    opacity: 0.5,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
