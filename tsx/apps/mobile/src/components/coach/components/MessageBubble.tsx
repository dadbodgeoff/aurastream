/**
 * Enhanced Message bubble component with animations and modern design.
 * State-of-the-art 2025 AI chat experience.
 * @module coach/components/MessageBubble
 */

import { useRef, useEffect, memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors } from '../constants';
import type { ChatMessage } from '../types';
import { PromptBlock } from './PromptBlock';
import { QualityMeter } from './QualityMeter';
import { AnimatedText } from './AnimatedText';
import { ThinkingDots } from './PulsingDot';
import { GlassCard } from './GlassCard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

interface MessageBubbleProps {
  message: ChatMessage;
  index?: number;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  index = 0,
}: MessageBubbleProps) {
  const { role, content, isStreaming, validation, groundingUsed } = message;
  const isUser = role === 'user';

  const slideAnim = useRef(new Animated.Value(isUser ? 50 : -50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const [showDetails, setShowDetails] = useState(false);

  // Entrance animation
  useEffect(() => {
    const delay = index * 50;
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, scaleAnim, index]);

  // Parse content for prompt blocks
  const parts: Array<{ type: 'text' | 'prompt'; content: string }> = [];
  const promptRegex = /```prompt\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = promptRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    parts.push({ type: 'prompt', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex).trim();
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }
  }

  if (parts.length === 0 && content.trim()) {
    parts.push({ type: 'text', content: content.trim() });
  }

  const toggleDetails = useCallback(() => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowDetails((prev) => !prev);
  }, []);

  const hasValidation = !isUser && validation && !isStreaming;

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser && styles.messageRowUser,
        {
          opacity: opacityAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View
          style={[
            styles.avatar,
            isUser ? styles.avatarUser : styles.avatarAssistant,
          ]}
        >
          <Text style={styles.avatarText}>{isUser ? '👤' : '✨'}</Text>
        </View>
      </View>

      {/* Message Content */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={hasValidation ? toggleDetails : undefined}
        style={styles.bubbleContainer}
      >
        <GlassCard
          variant={isUser ? 'accent' : 'default'}
          style={[
            styles.messageBubble,
            isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant,
          ]}
        >
          <View style={styles.bubbleContent}>
            {/* Grounding indicator */}
            {!isUser && groundingUsed && (
              <View style={styles.groundingIndicator}>
                <View style={styles.groundingDot} />
                <Text style={styles.groundingText}>Enhanced with web context</Text>
              </View>
            )}

            {/* Message content */}
            {isStreaming && parts.length === 0 ? (
              <View style={styles.thinkingContainer}>
                <ThinkingDots />
                <Text style={styles.thinkingText}>Crafting your prompt...</Text>
              </View>
            ) : (
              parts.map((part, idx) => (
                <View key={idx}>
                  {part.type === 'prompt' ? (
                    <PromptBlock content={part.content} />
                  ) : (
                    <AnimatedText
                      text={part.content}
                      isStreaming={isStreaming && idx === parts.length - 1}
                      style={isUser ? styles.messageTextUser : styles.messageText}
                    />
                  )}
                </View>
              ))
            )}

            {/* Quality indicator */}
            {hasValidation && (
              <View style={styles.validationContainer}>
                <QualityMeter
                  score={validation.qualityScore}
                  label="Prompt Quality"
                  size="small"
                />

                {/* Expandable details */}
                {showDetails && validation.issues.length > 0 && (
                  <View style={styles.issuesContainer}>
                    {validation.issues.map((issue, idx) => (
                      <View key={idx} style={styles.issueItem}>
                        <Text style={styles.issueSeverity}>
                          {issue.severity === 'error'
                            ? '🔴'
                            : issue.severity === 'warning'
                            ? '🟡'
                            : '🔵'}
                        </Text>
                        <View style={styles.issueContent}>
                          <Text style={styles.issueMessage}>{issue.message}</Text>
                          {issue.suggestion && (
                            <Text style={styles.issueSuggestion}>
                              💡 {issue.suggestion}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {validation.issues.length > 0 && (
                  <Text style={styles.tapHint}>
                    {showDetails ? 'Tap to hide details' : 'Tap for suggestions'}
                  </Text>
                )}
              </View>
            )}

            {/* Ready badge */}
            {hasValidation && validation.isGenerationReady && (
              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>✓ Ready to generate</Text>
              </View>
            )}
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    position: 'relative',
    marginHorizontal: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarUser: {
    backgroundColor: colors.primary,
  },
  avatarAssistant: {
    backgroundColor: colors.backgroundElevated,
  },
  avatarText: {
    fontSize: 16,
  },
  bubbleContainer: {
    flex: 1,
    maxWidth: '82%',
  },
  messageBubble: {
    padding: 0,
  },
  messageBubbleUser: {
    borderBottomRightRadius: 6,
  },
  messageBubbleAssistant: {
    borderBottomLeftRadius: 6,
  },
  bubbleContent: {
    padding: 14,
  },
  groundingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  groundingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 8,
  },
  groundingText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  messageText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  messageTextUser: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  thinkingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  thinkingText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
  },
  validationContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  issuesContainer: {
    marginTop: 12,
    gap: 10,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
    borderRadius: 10,
  },
  issueSeverity: {
    fontSize: 12,
    marginRight: 8,
    marginTop: 2,
  },
  issueContent: {
    flex: 1,
  },
  issueMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  issueSuggestion: {
    fontSize: 12,
    color: colors.accent,
    marginTop: 4,
    lineHeight: 16,
  },
  tapHint: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 10,
  },
  readyBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  readyBadgeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
});
