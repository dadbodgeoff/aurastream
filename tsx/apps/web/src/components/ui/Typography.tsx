'use client';

/**
 * Typography Component System
 * 
 * Provides consistent text styling across the application.
 * Based on the AuraStream Premium Design System tokens.
 * 
 * Usage:
 *   <Text variant="h1">Page Title</Text>
 *   <Text variant="body">Regular paragraph text</Text>
 *   <Text variant="caption" color="secondary">Helper text</Text>
 *   <Text variant="label" uppercase>SECTION LABEL</Text>
 */

import { forwardRef, type ReactNode, type ElementType } from 'react';
import { cn } from '@/lib/utils';

// Typography variants matching our token presets
export type TypographyVariant = 
  | 'display'   // 36px, bold - Hero sections
  | 'h1'        // 24px, bold - Page titles
  | 'h2'        // 20px, semibold - Section headers
  | 'h3'        // 18px, semibold - Card titles
  | 'h4'        // 16px, semibold - Subsection headers
  | 'body'      // 16px, normal - Default paragraph
  | 'bodySmall' // 14px, normal - Compact body text
  | 'caption'   // 14px, normal - Descriptions, helper text
  | 'label'     // 12px, medium - Form labels, tags
  | 'overline'  // 12px, semibold, uppercase - Section labels
  | 'micro';    // 11px, normal - Timestamps, metadata

// Text colors from our token system
export type TypographyColor = 
  | 'primary'   // Main text - #FCFCF9
  | 'secondary' // Secondary text - #B8BABA
  | 'tertiary'  // Helper text - #9A9E9E
  | 'muted'     // Very subtle - #7D8282
  | 'inverse'   // Dark text on light bg
  | 'inherit'   // Inherit from parent
  | 'link'      // Interactive link color
  | 'success'   // Success state
  | 'warning'   // Warning state
  | 'error';    // Error state

export interface TypographyProps {
  variant?: TypographyVariant;
  color?: TypographyColor;
  as?: ElementType;
  children: ReactNode;
  className?: string;
  uppercase?: boolean;
  truncate?: boolean;
  lineClamp?: 1 | 2 | 3;
  align?: 'left' | 'center' | 'right';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

// Variant styles - using Tailwind classes that map to our tokens
const variantStyles: Record<TypographyVariant, string> = {
  display: 'text-4xl font-bold leading-tight tracking-tight',
  h1: 'text-2xl font-bold leading-snug tracking-tight',
  h2: 'text-xl font-semibold leading-snug tracking-tight',
  h3: 'text-lg font-semibold leading-snug',
  h4: 'text-base font-semibold leading-normal',
  body: 'text-base font-normal leading-normal',
  bodySmall: 'text-sm font-normal leading-normal',
  caption: 'text-sm font-normal leading-normal',
  label: 'text-xs font-medium leading-snug',
  overline: 'text-xs font-semibold leading-normal tracking-widest',
  micro: 'text-[11px] font-normal leading-snug',
};

// Color styles - using our semantic text color tokens
const colorStyles: Record<TypographyColor, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  muted: 'text-text-muted',
  inverse: 'text-text-inverse',
  inherit: 'text-inherit',
  link: 'text-interactive-300',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
};

// Default HTML elements for each variant
const defaultElements: Record<TypographyVariant, ElementType> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  bodySmall: 'p',
  caption: 'p',
  label: 'span',
  overline: 'span',
  micro: 'span',
};

export const Text = forwardRef<HTMLElement, TypographyProps>(function Text(
  {
    variant = 'body',
    color = 'primary',
    as,
    children,
    className,
    uppercase = false,
    truncate = false,
    lineClamp,
    align,
    weight,
    ...props
  },
  ref
) {
  const Component = as || defaultElements[variant];
  
  // Override weight if specified
  const weightOverride = weight ? {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  }[weight] : '';

  return (
    <Component
      ref={ref}
      className={cn(
        variantStyles[variant],
        colorStyles[color],
        weightOverride,
        uppercase && 'uppercase',
        truncate && 'truncate',
        lineClamp === 1 && 'line-clamp-1',
        lineClamp === 2 && 'line-clamp-2',
        lineClamp === 3 && 'line-clamp-3',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

// Convenience components for common use cases
export const Heading = forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant'> & { level?: 1 | 2 | 3 | 4 }>(
  function Heading({ level = 1, ...props }, ref) {
    const variant = `h${level}` as TypographyVariant;
    return <Text ref={ref} variant={variant} {...props} />;
  }
);

export const Body = forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant'> & { small?: boolean }>(
  function Body({ small = false, ...props }, ref) {
    return <Text ref={ref} variant={small ? 'bodySmall' : 'body'} {...props} />;
  }
);

export const Caption = forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant'>>(
  function Caption(props, ref) {
    return <Text ref={ref} variant="caption" color="secondary" {...props} />;
  }
);

export const Label = forwardRef<HTMLSpanElement, Omit<TypographyProps, 'variant'>>(
  function Label(props, ref) {
    return <Text ref={ref} variant="label" {...props} />;
  }
);

export const Overline = forwardRef<HTMLSpanElement, Omit<TypographyProps, 'variant' | 'uppercase'>>(
  function Overline(props, ref) {
    return <Text ref={ref} variant="overline" color="tertiary" uppercase {...props} />;
  }
);

export const Micro = forwardRef<HTMLSpanElement, Omit<TypographyProps, 'variant'>>(
  function Micro(props, ref) {
    return <Text ref={ref} variant="micro" color="tertiary" {...props} />;
  }
);
