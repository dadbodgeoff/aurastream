/**
 * Animated streaming text component with typewriter effect.
 * State-of-the-art 2025 AI chat experience.
 * @module coach/components/AnimatedText
 */

import { useEffect, useState, useRef, memo } from 'react';
import { Text, StyleSheet, Animated, View } from 'react-native';
import { colors } from '../constants';

interface AnimatedTextProps {
  text: string;
  isStreaming: boolean;
  style?: object;
  speed?: number;
}

export const AnimatedText = memo(function AnimatedText({
  text,
  isStreaming,
  style,
  speed = 15,
}: AnimatedTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const lastTextRef = useRef('');

  // Cursor blink animation
  useEffect(() => {
    if (isStreaming) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      blink.start();
      return () => blink.stop();
    } else {
      cursorOpacity.setValue(0);
    }
  }, [isStreaming, cursorOpacity]);

  // Typewriter effect for new characters
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      return;
    }

    // Only animate new characters
    const newChars = text.slice(lastTextRef.current.length);
    if (newChars.length === 0) return;

    let charIndex = 0;
    const baseText = lastTextRef.current;

    const interval = setInterval(() => {
      if (charIndex < newChars.length) {
        setDisplayedText(baseText + newChars.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(interval);
        lastTextRef.current = text;
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isStreaming, speed]);

  // Reset when streaming ends
  useEffect(() => {
    if (!isStreaming) {
      lastTextRef.current = text;
      setDisplayedText(text);
    }
  }, [isStreaming, text]);

  return (
    <View style={styles.container}>
      <Text style={[styles.text, style]}>{displayedText}</Text>
      {isStreaming && (
        <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  text: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  cursor: {
    width: 2,
    height: 18,
    backgroundColor: colors.accent,
    marginLeft: 2,
    borderRadius: 1,
  },
});
