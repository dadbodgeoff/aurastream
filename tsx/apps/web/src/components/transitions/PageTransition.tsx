/**
 * PageTransition Component
 * 
 * Provides smooth enter/exit animations for page content during route changes.
 * Supports multiple transition types and respects reduced motion preferences.
 * 
 * @module transitions/PageTransition
 */

'use client';

import { useReducedMotion } from '@aurastream/shared';
import { cn } from '@/lib/utils';

/**
 * Available transition animation types.
 * - fade: Simple opacity fade in
 * - slide: Directional slide with fade
 * - zoom: Scale up with fade
 * - none: No animation (instant)
 */
export type TransitionType = 'fade' | 'slide' | 'zoom' | 'none';

/**
 * Direction for slide transitions.
 * Determines which direction the content slides in from.
 */
export type SlideDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Props for the PageTransition component.
 */
export interface PageTransitionProps {
  /** Content to render inside the transition wrapper */
  children: React.ReactNode;
  /** Additional CSS classes to apply */
  className?: string;
  /** Type of transition animation to use */
  type?: TransitionType;
  /** Direction for slide transitions (only used when type is 'slide') */
  direction?: SlideDirection;
  /** Animation duration in milliseconds */
  duration?: number;
}

/**
 * CSS animation class mappings for slide directions.
 * Maps each direction to its corresponding CSS animation class.
 */
const slideAnimationClasses: Record<SlideDirection, string> = {
  left: 'animate-slide-in-left',
  right: 'animate-slide-in-right',
  up: 'animate-slide-in-up',
  down: 'animate-slide-in-down',
};

/**
 * CSS animation class mappings for transition types.
 * Maps each type to its corresponding CSS animation class.
 */
const transitionAnimationClasses: Record<Exclude<TransitionType, 'slide' | 'none'>, string> = {
  fade: 'animate-page-fade-in',
  zoom: 'animate-page-zoom-in',
};

/**
 * Default animation duration in milliseconds.
 */
const DEFAULT_DURATION = 300;

/**
 * PageTransition - Wraps page content for smooth enter/exit animations.
 * 
 * Features:
 * - Multiple transition types: fade, slide, zoom, none
 * - Direction-aware slide transitions (left, right, up, down)
 * - Configurable animation duration
 * - Respects user's reduced motion preference
 * - Works seamlessly with Next.js App Router
 * - CSS-based animations for optimal performance
 * 
 * @example
 * ```tsx
 * // Basic fade transition
 * <PageTransition>
 *   <div>Page content</div>
 * </PageTransition>
 * 
 * // Slide from left with custom duration
 * <PageTransition type="slide" direction="left" duration={400}>
 *   <div>Page content</div>
 * </PageTransition>
 * 
 * // Zoom transition
 * <PageTransition type="zoom">
 *   <div>Page content</div>
 * </PageTransition>
 * 
 * // No animation (useful for conditional transitions)
 * <PageTransition type="none">
 *   <div>Page content</div>
 * </PageTransition>
 * ```
 */
export function PageTransition({
  children,
  className,
  type = 'fade',
  direction = 'right',
  duration = DEFAULT_DURATION,
}: PageTransitionProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  // Determine the animation class based on type and direction
  const getAnimationClass = (): string => {
    // No animation if type is 'none' or user prefers reduced motion
    if (type === 'none' || prefersReducedMotion) {
      return '';
    }

    if (type === 'slide') {
      return slideAnimationClasses[direction];
    }

    return transitionAnimationClasses[type];
  };

  // Build custom CSS properties for animation duration
  const animationStyle: React.CSSProperties = {
    '--page-transition-duration': `${duration}ms`,
  } as React.CSSProperties;

  // Combine all classes
  const combinedClasses = cn(
    // Base styles
    'w-full',
    // Animation class (empty if none or reduced motion)
    getAnimationClass(),
    // Reduced motion override - ensures no animation
    'motion-reduce:animate-none',
    // Custom classes
    className
  );

  return (
    <div
      className={combinedClasses}
      style={animationStyle}
    >
      {children}
    </div>
  );
}

PageTransition.displayName = 'PageTransition';

export default PageTransition;
