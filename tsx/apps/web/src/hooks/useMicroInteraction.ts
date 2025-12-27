/**
 * useMicroInteraction - Hook for triggering micro-interaction animations
 * 
 * Provides subtle, purposeful feedback animations for user actions.
 * Respects reduced motion preferences.
 * 
 * @example
 * const { triggerSuccess, triggerError } = useMicroInteraction();
 * 
 * const handleSave = async () => {
 *   try {
 *     await saveData();
 *     triggerSuccess(buttonRef);
 *   } catch {
 *     triggerError(buttonRef);
 *   }
 * };
 */

'use client';

import { useCallback, useRef } from 'react';
import { useReducedMotion } from '@aurastream/shared';

export type MicroInteractionType = 'success' | 'error' | 'loading' | 'hover' | 'press' | 'bounce';

interface MicroInteractionOptions {
  /** Duration of the animation in ms */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

interface UseMicroInteractionReturn {
  /** Trigger a success animation (scale + green flash) */
  triggerSuccess: (element: HTMLElement | React.RefObject<HTMLElement>, options?: MicroInteractionOptions) => void;
  /** Trigger an error animation (shake + red flash) */
  triggerError: (element: HTMLElement | React.RefObject<HTMLElement>, options?: MicroInteractionOptions) => void;
  /** Trigger a loading animation (pulse) */
  triggerLoading: (element: HTMLElement | React.RefObject<HTMLElement>, options?: MicroInteractionOptions) => () => void;
  /** Trigger a hover lift effect */
  triggerHover: (element: HTMLElement | React.RefObject<HTMLElement>) => void;
  /** Trigger a press/click effect */
  triggerPress: (element: HTMLElement | React.RefObject<HTMLElement>) => void;
  /** Trigger a bounce animation */
  triggerBounce: (element: HTMLElement | React.RefObject<HTMLElement>, options?: MicroInteractionOptions) => void;
  /** Whether reduced motion is preferred */
  prefersReducedMotion: boolean;
}

const getElement = (ref: HTMLElement | React.RefObject<HTMLElement>): HTMLElement | null => {
  if (ref instanceof HTMLElement) return ref;
  return ref.current;
};

export function useMicroInteraction(): UseMicroInteractionReturn {
  const prefersReducedMotion = useReducedMotion();
  const activeAnimations = useRef<Map<HTMLElement, Animation>>(new Map());

  const cleanupAnimation = useCallback((element: HTMLElement) => {
    const existing = activeAnimations.current.get(element);
    if (existing) {
      existing.cancel();
      activeAnimations.current.delete(element);
    }
  }, []);

  const triggerSuccess = useCallback(
    (ref: HTMLElement | React.RefObject<HTMLElement>, options?: MicroInteractionOptions) => {
      const element = getElement(ref);
      if (!element || prefersReducedMotion) {
        options?.onComplete?.();
        return;
      }

      cleanupAnimation(element);

      const duration = options?.duration ?? 300;
      const animation = element.animate(
        [
          { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
          { transform: 'scale(1.05)', boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.3)' },
          { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
        ],
        { duration, easing: 'ease-out' }
      );

      activeAnimations.current.set(element, animation);
      animation.onfinish = () => {
        activeAnimations.current.delete(element);
        options?.onComplete?.();
      };
    },
    [prefersReducedMotion, cleanupAnimation]
  );

  const triggerError = useCallback(
    (ref: HTMLElement | React.RefObject<HTMLElement>, options?: MicroInteractionOptions) => {
      const element = getElement(ref);
      if (!element || prefersReducedMotion) {
        options?.onComplete?.();
        return;
      }

      cleanupAnimation(element);

      const duration = options?.duration ?? 400;
      const animation = element.animate(
        [
          { transform: 'translateX(0)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
          { transform: 'translateX(-4px)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.3)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(0)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
        ],
        { duration, easing: 'ease-out' }
      );

      activeAnimations.current.set(element, animation);
      animation.onfinish = () => {
        activeAnimations.current.delete(element);
        options?.onComplete?.();
      };
    },
    [prefersReducedMotion, cleanupAnimation]
  );

  const triggerLoading = useCallback(
    (ref: HTMLElement | React.RefObject<HTMLElement>, options?: MicroInteractionOptions): (() => void) => {
      const element = getElement(ref);
      if (!element || prefersReducedMotion) {
        return () => {};
      }

      cleanupAnimation(element);

      const animation = element.animate(
        [
          { opacity: 1 },
          { opacity: 0.6 },
          { opacity: 1 },
        ],
        { duration: options?.duration ?? 1000, iterations: Infinity, easing: 'ease-in-out' }
      );

      activeAnimations.current.set(element, animation);

      return () => {
        animation.cancel();
        activeAnimations.current.delete(element);
        options?.onComplete?.();
      };
    },
    [prefersReducedMotion, cleanupAnimation]
  );

  const triggerHover = useCallback(
    (ref: HTMLElement | React.RefObject<HTMLElement>) => {
      const element = getElement(ref);
      if (!element || prefersReducedMotion) return;

      element.animate(
        [
          { transform: 'translateY(0)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
          { transform: 'translateY(-2px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
        ],
        { duration: 150, fill: 'forwards', easing: 'ease-out' }
      );
    },
    [prefersReducedMotion]
  );

  const triggerPress = useCallback(
    (ref: HTMLElement | React.RefObject<HTMLElement>) => {
      const element = getElement(ref);
      if (!element || prefersReducedMotion) return;

      element.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(0.95)' },
          { transform: 'scale(1)' },
        ],
        { duration: 100, easing: 'ease-out' }
      );
    },
    [prefersReducedMotion]
  );

  const triggerBounce = useCallback(
    (ref: HTMLElement | React.RefObject<HTMLElement>, options?: MicroInteractionOptions) => {
      const element = getElement(ref);
      if (!element || prefersReducedMotion) {
        options?.onComplete?.();
        return;
      }

      cleanupAnimation(element);

      const duration = options?.duration ?? 500;
      const animation = element.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-8px)' },
          { transform: 'translateY(0)' },
          { transform: 'translateY(-4px)' },
          { transform: 'translateY(0)' },
        ],
        { duration, easing: 'ease-out' }
      );

      activeAnimations.current.set(element, animation);
      animation.onfinish = () => {
        activeAnimations.current.delete(element);
        options?.onComplete?.();
      };
    },
    [prefersReducedMotion, cleanupAnimation]
  );

  return {
    triggerSuccess,
    triggerError,
    triggerLoading,
    triggerHover,
    triggerPress,
    triggerBounce,
    prefersReducedMotion,
  };
}
