/**
 * Chat View for Prompt Coach (Mobile).
 *
 * State-of-the-art 2025 AI chat experience with:
 * - Gesture-based interactions
 * - Adaptive theming
 * - Enhanced input area with voice placeholder
 * - Floating action button
 * - Smooth animations throughout
 *
 * @module CoachChatView
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Animated,
  RefreshControl,
} from 'react-native';
import { colors } from './constants';
import type { CoachChatViewProps } from './types';
import { useCoachChat } from './hooks';
import {
  MessageBubble,
  EmptyState,
  GroundingStatus,
  ErrorBanner,
  GlassCard,
  ThinkingDots,
} from './components';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

// ============================================================================
// Sub-Components
// ============================================================================

interface HeaderProps {
  onBack: () => void;
  isStreaming: boolean;
}

const Header = memo(function Header({ onBack, isStreaming }: HeaderProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isStreaming) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isStreaming, pulseAnim]);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Back to context"
        activeOpacity={0.7}
      >
        <View style={styles.backButtonInner}>
          <Text style={styles.backButtonIcon}>←</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.headerTitleContainer}>
        <Animated.View
          style={[
            styles.headerIconContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.headerIcon}>✨</Text>
        </Animated.View>
        <View>
          <Text style={styles.headerTitle}>Prompt Coach</Text>
          <Text style={styles.headerSubtitle}>
            {isStreaming ? 'Crafting your prompt...' : 'AI-powered refinement'}
          </Text>
        </View>
      </View>

      <View style={styles.headerSpacer} />
    </View>
  );
});

interface GenerateButtonProps {
  onPress: () => void;
  visible: boolean;
}

const GenerateButton = memo(function GenerateButton({
  onPress,
  visible,
}: GenerateButtonProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: false,
            }),
          ])
        ),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleAnim, glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.generateButtonContainer,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Animated.View style={[styles.generateGlow, { opacity: glowOpacity }]} />
      <TouchableOpacity
        style={styles.generateButton}
        onPress={onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Generate Now"
        activeOpacity={0.8}
      >
        <Text style={styles.generateButtonIcon}>✨</Text>
        <Text style={styles.generateButtonText}>Generate Now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

interface InputAreaProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  isDisabled: boolean;
}

const InputArea = memo(function InputArea({
  value,
  onChangeText,
  onSend,
  isStreaming,
  isDisabled,
}: InputAreaProps) {
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(() => {
    Animated.timing(inputFocusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [inputFocusAnim]);

  const handleBlur = useCallback(() => {
    Animated.timing(inputFocusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [inputFocusAnim]);

  const handleSendPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
    onSend();
  }, [onSend, sendButtonScale]);

  const borderColor = inputFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.08)', `${colors.primary}66`],
  });

  const canSend = value.trim() && !isStreaming && !isDisabled;

  return (
    <View style={styles.inputArea}>
      <Animated.View style={[styles.inputRow, { borderColor }]}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={
            isStreaming
              ? 'Waiting for response...'
              : 'Describe your refinement...'
          }
          placeholderTextColor={colors.textTertiary}
          editable={!isStreaming && !isDisabled}
          multiline
          maxLength={500}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {/* Voice input placeholder */}
        <TouchableOpacity
          style={styles.voiceButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Voice input (coming soon)"
          activeOpacity={0.7}
        >
          <Text style={styles.voiceButtonIcon}>🎤</Text>
        </TouchableOpacity>

        {/* Send button */}
        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSendPress}
            disabled={!canSend}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            activeOpacity={0.8}
          >
            {isStreaming ? (
              <ThinkingDots />
            ) : (
              <Text style={styles.sendButtonText}>↑</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <View style={styles.inputHintRow}>
        <Text style={styles.inputHint}>
          {value.length > 0 ? `${value.length}/500` : 'Press send to refine'}
        </Text>
      </View>
    </View>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export function CoachChatView({
  sessionId: externalSessionId,
  onSessionStart,
  onGenerateNow,
  onBack,
  initialRequest,
}: CoachChatViewProps) {
  const [inputValue, setInputValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    messages,
    isStreaming,
    activeSessionId,
    currentPrompt,
    isGenerationReady,
    error,
    isGrounding,
    groundingQuery,
    hasStarted,
    flatListRef,
    sendMessage,
    dismissError,
  } = useCoachChat({
    externalSessionId,
    onSessionStart,
    initialRequest,
  });

  const handleSend = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isStreaming) return;

    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setInputValue('');
    Keyboard.dismiss();
    sendMessage(trimmedValue);
  }, [inputValue, isStreaming, sendMessage]);

  const handleGenerateNow = useCallback(() => {
    if (currentPrompt && isGenerationReady) {
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onGenerateNow(currentPrompt);
    }
  }, [currentPrompt, isGenerationReady, onGenerateNow]);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onBack();
  }, [onBack]);

  const handleRefresh = useCallback(() => {
    // Pull to refresh - could reload session or clear errors
    setRefreshing(true);
    if (Platform.OS !== 'web' && Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    dismissError();
    setTimeout(() => setRefreshing(false), 500);
  }, [dismissError]);

  const showEmptyState = messages.length === 0;
  const showGenerateButton =
    currentPrompt && isGenerationReady && !isStreaming;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <Header onBack={handleBack} isStreaming={isStreaming} />

      {/* Messages */}
      {showEmptyState ? (
        <EmptyState isLoading={hasStarted && messages.length === 0} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MessageBubble message={item} index={index} />
          )}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}

      {/* Grounding Status */}
      {isGrounding && <GroundingStatus query={groundingQuery} />}

      {/* Error Banner */}
      {error && <ErrorBanner message={error} onDismiss={dismissError} />}

      {/* Generate Button (Floating) */}
      <GenerateButton onPress={handleGenerateNow} visible={!!showGenerateButton} />

      {/* Input Area */}
      <GlassCard variant="elevated" style={styles.inputContainer}>
        <InputArea
          value={inputValue}
          onChangeText={setInputValue}
          onSend={handleSend}
          isStreaming={isStreaming}
          isDisabled={!activeSessionId}
        />
      </GlassCard>
    </KeyboardAvoidingView>
  );
}

export default CoachChatView;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(13, 13, 18, 0.95)',
  },
  backButton: {
    padding: 4,
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 10,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}26`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}4D`,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 1,
  },
  headerSpacer: {
    width: 40,
  },

  // Messages
  messageList: {
    paddingVertical: 16,
    paddingBottom: 100,
  },

  // Generate Button
  generateButtonContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    zIndex: 10,
  },
  generateGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: colors.success,
    borderRadius: 30,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  generateButtonIcon: {
    fontSize: 18,
  },
  generateButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Input Area
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  inputArea: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 100,
    letterSpacing: 0.2,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  voiceButtonIcon: {
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  inputHintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  inputHint: {
    color: colors.textTertiary,
    fontSize: 11,
  },
});
