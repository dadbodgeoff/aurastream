/**
 * Skeleton loading component with shimmer effect.
 * @module coach/components/SkeletonLoader
 */

import { useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export const Skeleton = memo(function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmerPosition = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerPosition]);

  const translateX = shimmerPosition.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
});

export const MessageSkeleton = memo(function MessageSkeleton() {
  return (
    <View style={styles.messageSkeleton}>
      <View style={styles.avatarSkeleton}>
        <Skeleton width={36} height={36} borderRadius={18} />
      </View>
      <View style={styles.contentSkeleton}>
        <Skeleton width="90%" height={14} style={styles.lineSkeleton} />
        <Skeleton width="75%" height={14} style={styles.lineSkeleton} />
        <Skeleton width="60%" height={14} />
      </View>
    </View>
  );
});

export const PromptSkeleton = memo(function PromptSkeleton() {
  return (
    <View style={styles.promptSkeleton}>
      <Skeleton width={120} height={12} style={styles.labelSkeleton} />
      <Skeleton width="100%" height={60} borderRadius={12} />
    </View>
  );
});

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '50%',
  },
  messageSkeleton: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  avatarSkeleton: {},
  contentSkeleton: {
    flex: 1,
    gap: 8,
  },
  lineSkeleton: {
    marginBottom: 4,
  },
  promptSkeleton: {
    padding: 16,
    gap: 12,
  },
  labelSkeleton: {
    marginBottom: 4,
  },
});
