/**
 * Enhanced grounding status indicator with animations.
 * State-of-the-art 2025 design.
 * @module coach/components/GroundingStatus
 */

import { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GroundingStatusProps {
  query: string | null;
}

export const GroundingStatus = memo(function GroundingStatus({
  query,
}: GroundingStatusProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Scanning line animation
    const scan = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    scan.start();

    return () => {
      pulse.stop();
      scan.stop();
    };
  }, [slideAnim, opacityAnim, pulseAnim, scanAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.2],
  });

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Scanning line effect */}
      <Animated.View
        style={[
          styles.scanLine,
          {
            transform: [{ translateX: scanTranslate }],
          },
        ]}
      />

      <View style={styles.content}>
        {/* Animated globe icon */}
        <View style={styles.iconContainer}>
          <Animated.View
            style={[
              styles.iconPulse,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <View style={styles.iconInner}>
            <Text style={styles.icon}>🌐</Text>
          </View>
        </View>

        {/* Status text */}
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>Searching the web</Text>
          {query && (
            <Text style={styles.queryText} numberOfLines={1}>
              "{query}"
            </Text>
          )}
        </View>

        {/* Animated dots */}
        <View style={styles.dotsContainer}>
          <AnimatedDot delay={0} />
          <AnimatedDot delay={200} />
          <AnimatedDot delay={400} />
        </View>
      </View>
    </Animated.View>
  );
});

const AnimatedDot = memo(function AnimatedDot({ delay }: { delay: number }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            delay,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scaleAnim, opacityAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${colors.accent}14`,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${colors.accent}26`,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: `${colors.accent}1A`,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconContainer: {
    position: 'relative',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  iconInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.accent}33`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 14,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.3,
  },
  queryText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
});
