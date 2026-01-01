/**
 * ButtonGroup - Groups multiple buttons together with proper styling
 * 
 * Follows Shadcn/UI patterns with Tailwind CSS styling.
 * Handles border-radius on first/last children automatically.
 * 
 * @example
 * <ButtonGroup>
 *   <Button>Option 1</Button>
 *   <Button>Option 2</Button>
 *   <Button>Option 3</Button>
 * </ButtonGroup>
 */

'use client';

import { cn } from '@/lib/utils';
import React, { Children, cloneElement, isValidElement } from 'react';

export type ButtonGroupVariant = 'default' | 'outline' | 'ghost';
export type ButtonGroupSize = 'sm' | 'md' | 'lg';
export type ButtonGroupOrientation = 'horizontal' | 'vertical';

export interface ButtonGroupProps {
  /** Button elements to group */
  children: React.ReactNode;
  /** Visual variant applied to all buttons */
  variant?: ButtonGroupVariant;
  /** Size applied to all buttons */
  size?: ButtonGroupSize;
  /** Orientation of the button group */
  orientation?: ButtonGroupOrientation;
  /** Additional CSS classes */
  className?: string;
  /** Whether the group is disabled */
  disabled?: boolean;
  /** Full width mode */
  fullWidth?: boolean;
}

const sizeClasses: Record<ButtonGroupSize, string> = {
  // sm: 32px height, but min-h-[44px] ensures touch target compliance on mobile
  sm: 'h-8 min-h-[44px] px-3 text-sm',
  // md: 40px height, but min-h-[44px] ensures touch target compliance on mobile
  md: 'h-10 min-h-[44px] px-4 text-sm',
  // lg: 48px height already meets 44px minimum touch target
  lg: 'h-12 px-6 text-base',
};

const variantClasses: Record<ButtonGroupVariant, string> = {
  default: cn(
    'bg-interactive-500 text-white',
    'hover:bg-interactive-600',
    'active:bg-interactive-700',
    'disabled:bg-text-disabled disabled:text-text-muted'
  ),
  outline: cn(
    'bg-transparent text-text-primary',
    'border border-border-default',
    'hover:bg-background-elevated hover:border-interactive-500',
    'active:bg-background-surface',
    'disabled:border-border-subtle disabled:text-text-muted'
  ),
  ghost: cn(
    'bg-transparent text-text-primary',
    'hover:bg-background-elevated',
    'active:bg-background-surface',
    'disabled:text-text-muted'
  ),
};

export function ButtonGroup({
  children,
  variant = 'default',
  size = 'md',
  orientation = 'horizontal',
  className,
  disabled = false,
  fullWidth = false,
}: ButtonGroupProps) {
  const isHorizontal = orientation === 'horizontal';
  
  // Process children to apply group styling
  const childArray = Children.toArray(children).filter(isValidElement);
  const childCount = childArray.length;

  const processedChildren = childArray.map((child, index) => {
    if (!isValidElement(child)) return child;

    const isFirst = index === 0;
    const isLast = index === childCount - 1;
    const isMiddle = !isFirst && !isLast;

    // Build border-radius classes based on position
    let radiusClasses = '';
    if (isHorizontal) {
      if (isFirst) {
        radiusClasses = 'rounded-r-none';
      } else if (isLast) {
        radiusClasses = 'rounded-l-none';
      } else if (isMiddle) {
        radiusClasses = 'rounded-none';
      }
    } else {
      if (isFirst) {
        radiusClasses = 'rounded-b-none';
      } else if (isLast) {
        radiusClasses = 'rounded-t-none';
      } else if (isMiddle) {
        radiusClasses = 'rounded-none';
      }
    }

    // Build border classes to avoid double borders
    let borderClasses = '';
    if (variant === 'outline') {
      if (isHorizontal && !isFirst) {
        borderClasses = 'border-l-0';
      } else if (!isHorizontal && !isFirst) {
        borderClasses = 'border-t-0';
      }
    }

    // Clone element with merged classes
    return cloneElement(child as React.ReactElement<any>, {
      className: cn(
        // Base button styles
        'inline-flex items-center justify-center font-medium',
        'rounded-lg transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
        // Size
        sizeClasses[size],
        // Variant
        variantClasses[variant],
        // Position-based radius
        radiusClasses,
        // Border adjustments
        borderClasses,
        // Full width
        fullWidth && 'flex-1',
        // Disabled state
        disabled && 'pointer-events-none opacity-50',
        // Existing classes from child
        (child.props as any).className
      ),
      disabled: disabled || (child.props as any).disabled,
    });
  });

  return (
    <div
      role="group"
      className={cn(
        'inline-flex',
        isHorizontal ? 'flex-row' : 'flex-col',
        fullWidth && 'w-full',
        className
      )}
    >
      {processedChildren}
    </div>
  );
}

/**
 * ButtonGroupItem - A button specifically styled for use in ButtonGroup
 * Can be used standalone or ButtonGroup will style regular buttons too
 */
export interface ButtonGroupItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether this item is currently active/selected */
  active?: boolean;
  children: React.ReactNode;
}

export function ButtonGroupItem({
  active = false,
  children,
  className,
  ...props
}: ButtonGroupItemProps) {
  return (
    <button
      type="button"
      className={cn(
        active && 'bg-interactive-600 ring-1 ring-interactive-400',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
