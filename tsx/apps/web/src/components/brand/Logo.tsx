'use client';

/**
 * AuraStream Logo Component
 * 
 * Displays the AuraStream logo from Supabase storage.
 * Falls back to text if image fails to load.
 */

import { useState } from 'react';
import Image from 'next/image';
import { AURASTREAM_BRANDING, getLogoDimensions } from '@aurastream/shared';
import { cn } from '@/lib/utils';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  /** Size preset for the logo */
  size?: LogoSize;
  /** Custom width (overrides size preset) */
  width?: number;
  /** Custom height (overrides size preset) */
  height?: number;
  /** Show text alongside logo */
  showText?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Text-only mode (no image) */
  textOnly?: boolean;
}

/**
 * AuraStream Logo
 * 
 * @example
 * // Standard usage
 * <Logo size="md" />
 * 
 * @example
 * // With text
 * <Logo size="sm" showText />
 * 
 * @example
 * // Custom size
 * <Logo width={100} height={56} />
 */
export function Logo({
  size = 'md',
  width,
  height,
  showText = false,
  className,
  textOnly = false,
}: LogoProps) {
  const [imageError, setImageError] = useState(false);
  
  // Get dimensions from preset or custom values
  const dimensions = width && height 
    ? { width, height }
    : getLogoDimensions(size);
  
  // Text size based on logo size
  const textSizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[size];
  
  // Fallback to text if image fails or textOnly mode
  if (textOnly || imageError) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div 
          className={cn(
            'rounded-lg bg-interactive-600 flex items-center justify-center text-white font-bold',
            size === 'sm' && 'w-6 h-6 text-xs',
            size === 'md' && 'w-8 h-8 text-sm',
            size === 'lg' && 'w-10 h-10 text-base',
            size === 'xl' && 'w-12 h-12 text-lg',
          )}
        >
          A
        </div>
        {showText && (
          <span className={cn('font-semibold text-text-primary', textSizeClass)}>
            {AURASTREAM_BRANDING.name}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Image
        src={AURASTREAM_BRANDING.logo.url}
        alt={AURASTREAM_BRANDING.logo.alt}
        width={dimensions.width}
        height={dimensions.height}
        className="object-contain"
        onError={() => setImageError(true)}
        priority={size === 'lg' || size === 'xl'}
      />
      {showText && (
        <span className={cn('font-semibold text-text-primary', textSizeClass)}>
          {AURASTREAM_BRANDING.name}
        </span>
      )}
    </div>
  );
}

export default Logo;
