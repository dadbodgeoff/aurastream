/**
 * JobsEmptyState Component
 * 
 * Empty state for the jobs/generation queue when nothing is generating.
 * Includes tier-specific messaging and Quick Create CTA.
 * 
 * @module empty-states/JobsEmptyState
 */

'use client';

import React from 'react';
import { EmptyStateBase } from './EmptyStateBase';
import { NoAssets } from './illustrations';
import type { SubscriptionTier } from '@aurastream/api-client';

/**
 * Props for the JobsEmptyState component.
 */
export interface JobsEmptyStateProps {
  /** User's subscription tier for tier-specific messaging */
  tier?: SubscriptionTier;
  /** Handler for the primary "Quick Create" action */
  onQuickCreate: () => void;
  /** Handler for the secondary "View Assets" action */
  onViewAssets?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sparkles icon for the create button.
 */
function SparklesIcon(): JSX.Element {
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
        d="M10 2L11.5 6.5L16 8L11.5 9.5L10 14L8.5 9.5L4 8L8.5 6.5L10 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M15 12L15.75 14.25L18 15L15.75 15.75L15 18L14.25 15.75L12 15L14.25 14.25L15 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M5 12L5.5 13.5L7 14L5.5 14.5L5 16L4.5 14.5L3 14L4.5 13.5L5 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
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
      return 'Your generation queue is empty. Start creating with the Prompt Coach for AI-guided asset creation.';
    case 'pro':
      return 'Nothing generating right now. Create new assets with faster processing and priority queue.';
    case 'free':
    default:
      return 'Your generation queue is empty. Start creating streaming assets with AI-powered generation.';
  }
}

/**
 * JobsEmptyState - Empty state for the jobs/generation queue.
 * 
 * Features:
 * - Illustration suggesting creative generation
 * - Tier-specific messaging (free, pro, studio)
 * - Quick Create CTA button
 * - Optional secondary action for viewing existing assets
 * - Fully accessible
 * 
 * @example
 * ```tsx
 * <JobsEmptyState
 *   tier="studio"
 *   onQuickCreate={() => openQuickCreateWizard()}
 *   onViewAssets={() => router.push('/dashboard/assets')}
 * />
 * ```
 */
export function JobsEmptyState({
  tier = 'free',
  onQuickCreate,
  onViewAssets,
  className,
}: JobsEmptyStateProps): JSX.Element {
  return (
    <EmptyStateBase
      illustration={<NoAssets />}
      title="Nothing generating"
      description={getDescription(tier)}
      primaryAction={{
        label: 'Quick Create',
        onClick: onQuickCreate,
        icon: <SparklesIcon />,
      }}
      secondaryAction={
        onViewAssets
          ? {
              label: 'View your assets',
              onClick: onViewAssets,
            }
          : undefined
      }
      className={className}
      testId="jobs-empty-state"
    />
  );
}

JobsEmptyState.displayName = 'JobsEmptyState';

export default JobsEmptyState;
