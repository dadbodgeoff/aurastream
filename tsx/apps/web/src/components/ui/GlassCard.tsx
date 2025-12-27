/**
 * Glassmorphism card component with blur effects.
 * Modern 2025 design language for web.
 * @module ui/GlassCard
 */

'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Variant styles for the GlassCard component.
 * - default: Subtle glass effect with light blur
 * - elevated: More prominent glass with stronger blur and shadow
 * - glow: Glass effect with interactive color glow
 */
type GlassCardVariant = 'default' | 'elevated' | 'glow';

/**
 * Polymorphic element types supported by GlassCard.
 */
type GlassCardElement = 'div' | 'article' | 'section';

/**
 * Props for the GlassCard component.
 */
export interface GlassCardProps {
  /** Content to render inside the card */
  children: React.ReactNode;
  /** Additional CSS classes to apply */
  className?: string;
  /** Visual variant of the card */
  variant?: GlassCardVariant;
  /** Whether to animate the card on mount */
  animateIn?: boolean;
  /** Animation delay in milliseconds */
  delay?: number;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** HTML element to render as */
  as?: GlassCardElement;
}

/**
 * Variant-specific Tailwind classes.
 */
const variantClasses: Record<GlassCardVariant, string> = {
  default: 'bg-background-surface/50 backdrop-blur-sm border border-border-subtle',
  elevated: 'bg-background-surface/70 backdrop-blur-md border border-border-default shadow-lg',
  glow: 'bg-background-surface/50 backdrop-blur-sm border border-interactive-500/30 shadow-lg shadow-interactive-500/10',
};

/**
 * Base classes applied to all GlassCard variants.
 */
const baseClasses = cn(
  'rounded-xl overflow-hidden relative',
  'transition-all duration-300 ease-out',
);

/**
 * Hover and active state classes for interactive cards.
 * Active states provide touch feedback on mobile devices.
 */
const hoverClasses = cn(
  'hover:scale-[1.02] hover:shadow-xl',
  'active:scale-[0.98] active:shadow-lg',
  'motion-reduce:hover:scale-100 motion-reduce:hover:shadow-lg',
  'motion-reduce:active:scale-100',
);

/**
 * Animation classes for animate-in effect.
 * Uses the project's existing animate-fade-in-up utility.
 */
const animateInClasses = 'animate-fade-in-up motion-reduce:animate-none';

/**
 * GlassCard - A glassmorphism card component with variants.
 *
 * Features:
 * - Glassmorphism effect with backdrop blur
 * - Three variants: default, elevated, glow
 * - Hover state animations with scale and shadow
 * - Support for animate-in effect with configurable delay
 * - Respects reduced motion preference
 * - Polymorphic component (can render as div, article, or section)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <GlassCard>
 *   <p>Card content</p>
 * </GlassCard>
 *
 * // With variant and animation
 * <GlassCard variant="elevated" animateIn delay={200}>
 *   <p>Animated elevated card</p>
 * </GlassCard>
 *
 * // As a semantic element
 * <GlassCard as="article" variant="glow" onClick={() => console.log('clicked')}>
 *   <h2>Article title</h2>
 *   <p>Article content</p>
 * </GlassCard>
 * ```
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard(
    {
      children,
      className,
      variant = 'default',
      animateIn = false,
      delay = 0,
      onClick,
      as: Component = 'div',
    },
    ref
  ) {
    const isInteractive = Boolean(onClick);

    // Build animation delay style
    const animationStyle = animateIn && delay > 0
      ? { animationDelay: `${delay}ms`, animationFillMode: 'backwards' as const }
      : undefined;

    // Combine all classes
    const combinedClasses = cn(
      baseClasses,
      variantClasses[variant],
      isInteractive && hoverClasses,
      isInteractive && 'cursor-pointer',
      animateIn && animateInClasses,
      className
    );

    return (
      <Component
        ref={ref}
        className={combinedClasses}
        style={animationStyle}
        onClick={onClick}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={
          isInteractive
            ? (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
      >
        {/* Glass overlay for enhanced effect */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
          aria-hidden="true"
        />
        {/* Content container */}
        <div className="relative z-10">{children}</div>
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
