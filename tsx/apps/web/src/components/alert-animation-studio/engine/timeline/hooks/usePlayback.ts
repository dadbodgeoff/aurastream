/**
 * usePlayback Hook
 *
 * Manages playback state and animation frame loop for timeline playback.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Playback state interface.
 */
export interface PlaybackState {
  /** Whether playback is active */
  isPlaying: boolean;
  /** Current playback time in milliseconds */
  currentTime: number;
  /** Playback speed multiplier */
  playbackSpeed: number;
}

/**
 * Playback controls interface.
 */
export interface PlaybackControls {
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Stop playback and reset to start */
  stop: () => void;
  /** Seek to a specific time */
  seek: (time: number) => void;
  /** Set playback speed */
  setPlaybackSpeed: (speed: number) => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Step forward by one frame */
  stepForward: () => void;
  /** Step backward by one frame */
  stepBackward: () => void;
  /** Jump to start */
  jumpToStart: () => void;
  /** Jump to end */
  jumpToEnd: () => void;
}

/**
 * usePlayback hook options.
 */
export interface UsePlaybackOptions {
  /** Total duration in milliseconds */
  duration: number;
  /** Frames per second for stepping */
  fps?: number;
  /** Whether to loop playback */
  loop?: boolean;
  /** Initial playback speed */
  initialSpeed?: number;
  /** Callback when time updates */
  onTimeUpdate?: (time: number) => void;
  /** Callback when playback starts */
  onPlay?: () => void;
  /** Callback when playback pauses */
  onPause?: () => void;
  /** Callback when playback stops */
  onStop?: () => void;
  /** Callback when playback completes (non-looping) */
  onComplete?: () => void;
}

/**
 * usePlayback hook return type.
 */
export interface UsePlaybackReturn extends PlaybackState, PlaybackControls {}

/**
 * Hook for managing timeline playback with requestAnimationFrame.
 *
 * @param options - Playback options
 * @returns Playback state and controls
 */
export function usePlayback(options: UsePlaybackOptions): UsePlaybackReturn {
  const {
    duration,
    fps = 30,
    loop = true,
    initialSpeed = 1,
    onTimeUpdate,
    onPlay,
    onPause,
    onStop,
    onComplete,
  } = options;

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(initialSpeed);

  // Refs for animation loop
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    lastFrameTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const deltaMs = (timestamp - lastFrameTimeRef.current) * playbackSpeed;
      lastFrameTimeRef.current = timestamp;

      setCurrentTime((prevTime) => {
        let newTime = prevTime + deltaMs;

        // Handle end of timeline
        if (newTime >= duration) {
          if (loop) {
            newTime = newTime % duration;
          } else {
            newTime = duration;
            // Stop playback at end
            setIsPlaying(false);
            onComplete?.();
            return newTime;
          }
        }

        // Handle negative time (reverse playback)
        if (newTime < 0) {
          if (loop) {
            newTime = duration + (newTime % duration);
          } else {
            newTime = 0;
            setIsPlaying(false);
            return newTime;
          }
        }

        onTimeUpdate?.(newTime);
        return newTime;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, duration, loop, onTimeUpdate, onComplete]);

  // Playback controls
  const play = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    onTimeUpdate?.(0);
    onStop?.();
  }, [onTimeUpdate, onStop]);

  const seek = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(duration, time));
      setCurrentTime(clampedTime);
      onTimeUpdate?.(clampedTime);
    },
    [duration, onTimeUpdate]
  );

  const setPlaybackSpeed = useCallback((speed: number) => {
    // Clamp speed to reasonable range
    const clampedSpeed = Math.max(-4, Math.min(4, speed));
    setPlaybackSpeedState(clampedSpeed);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const stepForward = useCallback(() => {
    const frameMs = 1000 / fps;
    seek(currentTime + frameMs);
  }, [currentTime, fps, seek]);

  const stepBackward = useCallback(() => {
    const frameMs = 1000 / fps;
    seek(currentTime - frameMs);
  }, [currentTime, fps, seek]);

  const jumpToStart = useCallback(() => {
    seek(0);
  }, [seek]);

  const jumpToEnd = useCallback(() => {
    seek(duration);
  }, [duration, seek]);

  return {
    // State
    isPlaying,
    currentTime,
    playbackSpeed,
    // Controls
    play,
    pause,
    stop,
    seek,
    setPlaybackSpeed,
    toggle,
    stepForward,
    stepBackward,
    jumpToStart,
    jumpToEnd,
  };
}

/**
 * Common playback speed presets.
 */
export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 4] as const;

/**
 * Get the next playback speed in the preset list.
 *
 * @param currentSpeed - Current playback speed
 * @returns Next speed in the list
 */
export function getNextPlaybackSpeed(currentSpeed: number): number {
  const currentIndex = PLAYBACK_SPEEDS.indexOf(currentSpeed as typeof PLAYBACK_SPEEDS[number]);
  if (currentIndex === -1 || currentIndex === PLAYBACK_SPEEDS.length - 1) {
    return PLAYBACK_SPEEDS[0];
  }
  return PLAYBACK_SPEEDS[currentIndex + 1];
}

/**
 * Get the previous playback speed in the preset list.
 *
 * @param currentSpeed - Current playback speed
 * @returns Previous speed in the list
 */
export function getPreviousPlaybackSpeed(currentSpeed: number): number {
  const currentIndex = PLAYBACK_SPEEDS.indexOf(currentSpeed as typeof PLAYBACK_SPEEDS[number]);
  if (currentIndex === -1 || currentIndex === 0) {
    return PLAYBACK_SPEEDS[PLAYBACK_SPEEDS.length - 1];
  }
  return PLAYBACK_SPEEDS[currentIndex - 1];
}
