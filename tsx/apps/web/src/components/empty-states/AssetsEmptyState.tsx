/**
 * AssetsEmptyState Component
 * 
 * Empty state for the assets page when user has no generated assets.
 * Includes tier-specific messaging and Quick Create CTA.
 * 
 * @module empty-states/AssetsEmptyState
 */

'use client';

import React from 'react';
import { EmptyStateBase } from './EmptyStateBase';
import { NoAssets } from './illustrations';
import type { SubscriptionTier } from '@aurastream/api-client';

/**
 * Props for the AssetsEmptyState component.
 */
export interface AssetsEmptyStateProps {
  /** User's subscription tier for tier-specific messaging */
  tier?: SubscriptionTier;
  /** Handler for the primary "Create Asset" action */
  onCreateAsset: () => void;
  /** Handler for the secondary "Browse Templates" action */
  onBrowseTemplates?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Plus icon for the create button.
 */
function PlusIcon(): JSX.Element {
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
        d="M10 4V16M4 10H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Get tier-specific description text.
 */
function getDescription(tier?: SubscriptionTier): string {
  switch (tier) {
    case 'studio':
      return 'Use AI to generate professional streaming assets with full brand customization and the Prompt Coach.';
    case 'pro':
      return 'Create stunning streaming assets with AI. Upgrade to Studio for the Prompt Coach and advanced features.';
    case 'free':
    default:
      return 'Start creating professional streaming assets with AI. Upgrade anytime for more features and higher limits.';
  }
}

/**
 * AssetsEmptyState - Empty state for the assets page.
 * 
 * Features:
 * - Engaging illustration with abstract media shapes
 * - Tier-specific messaging (free, pro, studio)
 * - Quick Create CTA button
 * - Optional secondary action for browsing templates
 * - Fully accessible
 * 
 * @example
 * ```tsx
 * <AssetsEmptyState
 *   tier="free"
 *   onCreateAsset={() => router.push('/dashboard/create')}
 *   onBrowseTemplates={() => router.push('/templates')}
 * />
 * ```
 */
export function AssetsEmptyState({
  tier = 'free',
  onCreateAsset,
  onBrowseTemplates,
  className,
}: AssetsEmptyStateProps): JSX.Element {
  return (
    <EmptyStateBase
      illustration={<NoAssets />}
      title="Create your first asset"
      description={getDescription(tier)}
      primaryAction={{
        label: 'Quick Create',
        onClick: onCreateAsset,
        icon: <PlusIcon />,
      }}
      secondaryAction={
        onBrowseTemplates
          ? {
              label: 'Browse templates',
              onClick: onBrowseTemplates,
            }
          : undefined
      }
      className={className}
      testId="assets-empty-state"
    />
  );
}

AssetsEmptyState.displayName = 'AssetsEmptyState';

export default AssetsEmptyState;
