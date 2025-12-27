/**
 * Enhanced empty state component with animations.
 * State-of-the-art 2025 design.
 * @module coach/components/EmptyState
 */

import { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '../constants';
import { ThinkingDots } from './PulsingDot';
import { GlassCard } from './GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EmptyStateProps {
  isLoading: boolean;
}

export const EmptyState = memo(function EmptyState({ isLoading }: EmptyStateProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    float.start();

    // Subtle rotation
    const rotate = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );
    rotate.start();

    return () => {
      float.stop();
      rotate.stop();
    };
  }, [fadeAnim, scaleAnim, floatAnim, rotateAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '3deg'],
  });

  if (isLoading) {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <GlassCard variant="elevated" style={styles.loadingCard}>
          <View style={styles.loadingContent}>
            {/* Animated icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ translateY }, { rotate }],
                },
              ]}
            >
              <Text style={styles.icon}>🚀</Text>
            </Animated.View>

            <Text style={styles.loadingTitle}>Launching your session</Text>

            <ThinkingDots />

            <Text style={styles.loadingSubtext}>
              Preparing AI coach with your brand context...
            </Text>

            {/* Progress indicators */}
            <View style={styles.progressSteps}>
              <ProgressStep label="Loading brand" completed />
              <ProgressStep label="Setting mood" completed />
              <ProgressStep label="Connecting AI" active />
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Background decoration */}
      <View style={styles.decoration}>
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />
      </View>

      <GlassCard variant="elevated" style={styles.card}>
        <View style={styles.content}>
          {/* Animated icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ translateY }, { rotate }],
              },
            ]}
          >
            <Text style={styles.icon}>✨</Text>
          </Animated.View>

          <Text style={styles.title}>Ready to craft magic</Text>
          <Text style={styles.subtitle}>
            Your AI coach will help you create the perfect prompt for stunning
            assets that match your brand.
          </Text>

          {/* Feature highlights */}
          <View style={styles.features}>
            <FeatureItem icon="🎨" text="Brand-aware suggestions" delay={100} />
            <FeatureItem icon="🔍" text="Real-time validation" delay={200} />
            <FeatureItem icon="⚡" text="Instant refinements" delay={300} />
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
});

interface FeatureItemProps {
  icon: string;
  text: string;
  delay?: number;
}

const FeatureItem = memo(function FeatureItem({
  icon,
  text,
  delay = 0,
}: FeatureItemProps) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.featureItem,
        {
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </Animated.View>
  );
});

interface ProgressStepProps {
  label: string;
  completed?: boolean;
  active?: boolean;
}

const ProgressStep = memo(function ProgressStep({
  label,
  completed,
  active,
}: ProgressStepProps) {
  return (
    <View style={styles.progressStep}>
      <View
        style={[
          styles.progressDot,
          completed && styles.progressDotCompleted,
          active && styles.progressDotActive,
        ]}
      >
        {completed && <Text style={styles.progressCheck}>✓</Text>}
      </View>
      <Text
        style={[
          styles.progressLabel,
          (completed || active) && styles.progressLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  decoration: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  decorCircle1: {
    width: 200,
    height: 200,
    backgroundColor: colors.primary,
    top: -50,
    right: -50,
  },
  decorCircle2: {
    width: 150,
    height: 150,
    backgroundColor: colors.accent,
    bottom: 50,
    left: -30,
  },
  decorCircle3: {
    width: 100,
    height: 100,
    backgroundColor: colors.success,
    top: '40%',
    right: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 300,
  },
  content: {
    padding: 28,
    alignItems: 'center',
  },
  loadingContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  loadingSubtext: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  features: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureIconText: {
    fontSize: 14,
  },
  featureText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  progressStep: {
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressDotCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  progressDotActive: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}33`,
  },
  progressCheck: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  progressLabelActive: {
    color: colors.textSecondary,
  },
});
