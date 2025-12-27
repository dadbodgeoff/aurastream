/**
 * InputGroup - Combines input with icons, buttons, or addons
 * 
 * Follows Shadcn/UI patterns with Tailwind CSS styling.
 * Supports left/right icons and addons.
 * 
 * @example
 * <InputGroup leftIcon={<SearchIcon />}>
 *   <input type="text" placeholder="Search..." />
 * </InputGroup>
 * 
 * @example
 * <InputGroup rightAddon={<Button>Submit</Button>}>
 *   <input type="email" placeholder="Email" />
 * </InputGroup>
 */

'use client';

import { cn } from '@/lib/utils';
import React, { Children, cloneElement, isValidElement } from 'react';

export type InputGroupSize = 'sm' | 'md' | 'lg';

export interface InputGroupProps {
  /** The input element */
  children: React.ReactNode;
  /** Icon to display on the left side of the input */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right side of the input */
  rightIcon?: React.ReactNode;
  /** Addon element (button, text) on the left side */
  leftAddon?: React.ReactNode;
  /** Addon element (button, text) on the right side */
  rightAddon?: React.ReactNode;
  /** Size variant */
  size?: InputGroupSize;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input has an error state */
  error?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
}

const sizeClasses: Record<InputGroupSize, { container: string; icon: string; input: string }> = {
  sm: {
    container: 'h-8',
    icon: 'w-4 h-4',
    input: 'text-sm px-3',
  },
  md: {
    container: 'h-10',
    icon: 'w-5 h-5',
    input: 'text-sm px-4',
  },
  lg: {
    container: 'h-12',
    icon: 'w-5 h-5',
    input: 'text-base px-4',
  },
};

const iconPaddingClasses: Record<InputGroupSize, { left: string; right: string }> = {
  sm: { left: 'pl-8', right: 'pr-8' },
  md: { left: 'pl-10', right: 'pr-10' },
  lg: { left: 'pl-12', right: 'pr-12' },
};

export function InputGroup({
  children,
  leftIcon,
  rightIcon,
  leftAddon,
  rightAddon,
  size = 'md',
  disabled = false,
  error = false,
  className,
}: InputGroupProps) {
  const sizeConfig = sizeClasses[size];
  const paddingConfig = iconPaddingClasses[size];

  // Find and enhance the input child
  const enhancedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;

    // Check if it's an input-like element
    const isInput =
      child.type === 'input' ||
      child.type === 'textarea' ||
      child.type === 'select' ||
      (typeof child.type === 'string' && ['input', 'textarea', 'select'].includes(child.type));

    if (!isInput) return child;

    return cloneElement(child as React.ReactElement<any>, {
      className: cn(
        // Base input styles
        'w-full bg-background-surface text-text-primary',
        'border border-border-default rounded-lg',
        'placeholder:text-text-muted',
        'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-transparent',
        'disabled:bg-background-elevated disabled:text-text-muted disabled:cursor-not-allowed',
        'transition-colors duration-150',
        // Size
        sizeConfig.container,
        sizeConfig.input,
        // Icon padding
        leftIcon && paddingConfig.left,
        rightIcon && paddingConfig.right,
        // Addon border adjustments
        leftAddon && 'rounded-l-none border-l-0',
        rightAddon && 'rounded-r-none border-r-0',
        // Error state
        error && 'border-error-500 focus:ring-error-500',
        // Existing classes
        (child.props as any).className
      ),
      disabled: disabled || (child.props as any).disabled,
    });
  });

  return (
    <div
      className={cn(
        'relative flex items-center',
        disabled && 'opacity-50',
        className
      )}
    >
      {/* Left Addon */}
      {leftAddon && (
        <div
          className={cn(
            'flex items-center justify-center',
            'px-3 bg-background-elevated',
            'border border-r-0 border-border-default rounded-l-lg',
            'text-text-secondary text-sm',
            sizeConfig.container
          )}
        >
          {leftAddon}
        </div>
      )}

      {/* Input Container */}
      <div className="relative flex-1">
        {/* Left Icon */}
        {leftIcon && (
          <div
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2',
              'text-text-muted pointer-events-none',
              sizeConfig.icon
            )}
          >
            {leftIcon}
          </div>
        )}

        {enhancedChildren}

        {/* Right Icon */}
        {rightIcon && (
          <div
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'text-text-muted pointer-events-none',
              sizeConfig.icon
            )}
          >
            {rightIcon}
          </div>
        )}
      </div>

      {/* Right Addon */}
      {rightAddon && (
        <div
          className={cn(
            'flex items-center justify-center',
            'px-3 bg-background-elevated',
            'border border-l-0 border-border-default rounded-r-lg',
            'text-text-secondary text-sm',
            sizeConfig.container
          )}
        >
          {rightAddon}
        </div>
      )}
    </div>
  );
}

/**
 * InputAddon - A styled addon for use with InputGroup
 */
export interface InputAddonProps {
  children: React.ReactNode;
  className?: string;
}

export function InputAddon({ children, className }: InputAddonProps) {
  return (
    <span className={cn('text-text-secondary whitespace-nowrap', className)}>
      {children}
    </span>
  );
}
