/**
 * Sound Effects Hook
 * Plays audio feedback for user actions
 *
 * Features:
 * - Respects user sound preferences
 * - Uses Web Audio API for low-latency playback
 * - Graceful fallback for unsupported browsers
 * - Preloads sounds for instant playback
 *
 * @module hooks/useSoundEffects
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { usePreferencesStore } from '@aurastream/shared';

/**
 * Sound effect types available
 */
export type SoundEffect = 'success' | 'error' | 'notification' | 'click';

/**
 * Sound configuration with frequency and duration for Web Audio API
 */
interface SoundConfig {
  /** Base frequency in Hz */
  frequency: number;
  /** Duration in seconds */
  duration: number;
  /** Volume (0-1) */
  volume: number;
  /** Frequency pattern for multi-tone sounds */
  pattern?: number[];
}

/**
 * Sound configurations for each effect type
 */
const SOUND_CONFIGS: Record<SoundEffect, SoundConfig> = {
  success: {
    frequency: 523.25, // C5
    duration: 0.15,
    volume: 0.3,
    pattern: [523.25, 659.25, 783.99], // C5, E5, G5 - major chord arpeggio
  },
  error: {
    frequency: 220, // A3
    duration: 0.2,
    volume: 0.25,
    pattern: [220, 196], // A3, G3 - descending
  },
  notification: {
    frequency: 440, // A4
    duration: 0.1,
    volume: 0.2,
    pattern: [440, 554.37], // A4, C#5
  },
  click: {
    frequency: 1000,
    duration: 0.05,
    volume: 0.1,
  },
};

/**
 * Return type for useSoundEffects hook
 */
export interface UseSoundEffectsReturn {
  /** Play the success sound */
  playSuccess: () => void;
  /** Play the error sound */
  playError: () => void;
  /** Play the notification sound */
  playNotification: () => void;
  /** Play the click sound */
  playClick: () => void;
  /** Play a specific sound effect */
  playSound: (effect: SoundEffect) => void;
  /** Whether sound is enabled */
  soundEnabled: boolean;
}

/**
 * Create an oscillator-based sound using Web Audio API
 */
function createOscillatorSound(
  audioContext: AudioContext,
  config: SoundConfig
): void {
  const { frequency, duration, volume, pattern } = config;
  const frequencies = pattern || [frequency];
  const noteDuration = duration / frequencies.length;

  frequencies.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = freq;

    const startTime = audioContext.currentTime + index * noteDuration;
    const endTime = startTime + noteDuration;

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, endTime - 0.02);
    gainNode.gain.linearRampToValueAtTime(0, endTime);

    oscillator.start(startTime);
    oscillator.stop(endTime);
  });
}

/**
 * Hook for playing sound effects with user preference support
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { playSuccess, playError, soundEnabled } = useSoundEffects();
 *
 *   const handleSubmit = async () => {
 *     try {
 *       await submitForm();
 *       playSuccess();
 *     } catch (error) {
 *       playError();
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleSubmit}>
 *       Submit {soundEnabled && '🔊'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSoundEffects(): UseSoundEffectsReturn {
  const soundEnabled = usePreferencesStore((state) => state.soundEnabled);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Get or create the AudioContext
   * AudioContext must be created after user interaction in most browsers
   */
  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!audioContextRef.current) {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
        return null;
      }
    }

    // Resume if suspended (required after user interaction)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {
        // Ignore resume errors
      });
    }

    return audioContextRef.current;
  }, []);

  /**
   * Play a sound effect
   */
  const playSound = useCallback(
    (effect: SoundEffect) => {
      if (!soundEnabled) {
        return;
      }

      const audioContext = getAudioContext();
      if (!audioContext) {
        return;
      }

      const config = SOUND_CONFIGS[effect];
      try {
        createOscillatorSound(audioContext, config);
      } catch (error) {
        console.warn('Failed to play sound:', error);
      }
    },
    [soundEnabled, getAudioContext]
  );

  /**
   * Convenience methods for specific sounds
   */
  const playSuccess = useCallback(() => playSound('success'), [playSound]);
  const playError = useCallback(() => playSound('error'), [playSound]);
  const playNotification = useCallback(() => playSound('notification'), [playSound]);
  const playClick = useCallback(() => playSound('click'), [playSound]);

  /**
   * Clean up AudioContext on unmount
   */
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // Ignore close errors
        });
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    playSuccess,
    playError,
    playNotification,
    playClick,
    playSound,
    soundEnabled,
  };
}
