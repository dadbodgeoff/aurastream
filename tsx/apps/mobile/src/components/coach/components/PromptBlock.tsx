/**
 * Enhanced Prompt block component with animations and modern design.
 * State-of-the-art 2025 design.
 * @module coach/components/PromptBlock
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

interface PromptBlockProps {
  content: string;
}

export const PromptBlock = memo(function PromptBlock({ content }: PromptBlockProps) {
  const [copied, setCopied] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const copyScaleAnim = useRef(new Animated.Value(1)).current;

  // Entrance animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleCopy = useCallback(async () => {
    try {
      // Haptic feedback
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Copy animation
      Animated.sequence([
        Animated.timing(copyScaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(copyScaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      await Clipboard.setStringAsync(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [content, copyScaleAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Main content */}
      <View style={styles.promptBlock}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.labelContainer}>
            <View style={styles.sparkle}>
              <Text style={styles.sparkleText}>✨</Text>
            </View>
            <Text style={styles.label}>Generated Prompt</Text>
          </View>

          <Animated.View style={{ transform: [{ scale: copyScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copyButtonCopied]}
              onPress={handleCopy}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Copied!' : 'Copy prompt'}
              activeOpacity={0.7}
            >
              <Text style={styles.copyButtonText}>
                {copied ? '✓ Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content */}
        <Text style={styles.content} selectable>
          {content}
        </Text>

        {/* Footer hint */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tap "Copy" to use this prompt for generation
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    position: 'relative',
  },
  promptBlock: {
    backgroundColor: `${colors.accent}14`,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.accent}33`,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.accent}26`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleText: {
    fontSize: 12,
  },
  label: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  copyButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: `${colors.accent}26`,
    borderWidth: 1,
    borderColor: `${colors.accent}4D`,
  },
  copyButtonCopied: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: `${colors.accent}1A`,
    marginHorizontal: 14,
  },
  content: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    padding: 14,
    letterSpacing: 0.2,
  },
  footer: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
