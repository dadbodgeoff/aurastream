/**
 * BrandKitsEmptyState Component
 * 
 * Empty state for the brand kits page when user has no brand kits.
 * Includes tier-specific messaging and Create Brand Kit CTA.
 * 
 * @module empty-states/BrandKitsEmptyState
 */

'use client';

import React from 'react';
import { EmptyStateBase } from './EmptyStateBase';
import { NoBrandKits } from './illustrations';
import type { SubscriptionTier } from '@aurastream/api-client';

/**
 * Props for the BrandKitsEmptyState component.
 */
export interface BrandKitsEmptyStateProps {
  /** User's subscription tier for tier-specific messaging */
  tier?: SubscriptionTier;
  /** Handler for the primary "Create Brand Kit" action */
  onCreateBrandKit: () => void;
  /** Handler for the secondary "Learn More" action */
  onLearnMore?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Palette icon for the create button.
 */
function PaletteIcon(): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C10.55 18 11 17.55 11 17V16.5C11 16.22 11.11 15.97 11.29 15.79C11.47 15.61 11.72 15.5 12 15.5H13C14.66 15.5 16 14.16 16 12.5V12C16 11.45 16.45 11 17 11H17.5C17.78 11 18 10.78 18 10.5C18 5.81 14.42 2 10 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="6" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="6" r="1.5" fill="currentColor" />
      <circle cx="14" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Get tier-specific description text.
 */
function getDescription(tier?: SubscriptionTier): string {
  switch (tier) {
    case 'studio':
      return 'Create a brand kit to ensure all your assets maintain consistent colors, fonts, and style across every platform.';
    case 'pro':
      return 'Set up your brand identity for consistent assets. Upgrade to Studio for advanced brand guidelines and voice settings.';
    case 'free':
    default:
      return 'Define your brand colors and style to create cohesive streaming assets. Upgrade for more customization options.';
  }
}

/**
 * BrandKitsEmptyState - Empty state for the brand kits page.
 * 
 * Features:
 * - Color palette illustration representing brand identity
 * - Tier-specific messaging (free, pro, studio)
 * - Create Brand Kit CTA button
 * - Optional secondary action for learning more
 * - Fully accessible
 * 
 * @example
 * ```tsx
 * <BrandKitsEmptyState
 *   tier="pro"
 *   onCreateBrandKit={() => router.push('/dashboard/brand-kits/new')}
 *   onLearnMore={() => window.open('/docs/brand-kits')}
 * />
 * ```
 */
export function BrandKitsEmptyState({
  tier = 'free',
  onCreateBrandKit,
  onLearnMore,
  className,
}: BrandKitsEmptyStateProps): JSX.Element {
  return (
    <EmptyStateBase
      illustration={<NoBrandKits />}
      title="Set up your brand"
      description={getDescription(tier)}
      primaryAction={{
        label: 'Create Brand Kit',
        onClick: onCreateBrandKit,
        icon: <PaletteIcon />,
      }}
      secondaryAction={
        onLearnMore
          ? {
              label: 'Learn about brand kits',
              onClick: onLearnMore,
            }
          : undefined
      }
      className={className}
      testId="brand-kits-empty-state"
    />
  );
}

BrandKitsEmptyState.displayName = 'BrandKitsEmptyState';

export default BrandKitsEmptyState;
