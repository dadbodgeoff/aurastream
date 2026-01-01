/**
 * Static tips component for non-premium users.
 * 
 * Displays helpful prompt crafting tips and an upgrade CTA
 * for users who don't have access to the full Prompt Coach.
 * 
 * @module CoachTips
 */

'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { AssetType } from '../../hooks/useCoachContext';

// ============================================================================
// Type Definitions
// ============================================================================

/** Tip category types */
export type TipCategory = 'style' | 'color' | 'composition' | 'gaming';

/** Individual tip structure */
export interface Tip {
  id: string;
  title: string;
  description: string;
  example: string;
  category: TipCategory;
}

export interface CoachTipsProps {
  /** Optional asset type to filter tips */
  assetType?: AssetType;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Static tips data */
const TIPS: Tip[] = [
  {
    id: 'style_001',
    title: 'Be Specific About Style',
    description: 'Instead of "cool style", specify the exact aesthetic you want.',
    example: '3D render style, vibrant neon colors, cyberpunk aesthetic',
    category: 'style',
  },
  {
    id: 'style_002',
    title: 'Use Your Brand Colors',
    description: 'Include your exact hex codes for consistent branding.',
    example: 'Using brand colors #FF5733 and #3498DB as primary palette',
    category: 'color',
  },
  {
    id: 'emote_001',
    title: 'Keep Emotes Simple',
    description: 'Emotes are viewed at tiny sizes. Simple, bold designs work best.',
    example: 'Simple expressive face, bold outlines, single emotion, sticker style',
    category: 'composition',
  },
  {
    id: 'emote_002',
    title: 'Focus on Expression',
    description: 'The emotion should be instantly readable even at 28x28 pixels.',
    example: 'Exaggerated happy expression, wide smile, sparkle eyes',
    category: 'composition',
  },
  {
    id: 'thumb_001',
    title: 'High Contrast is Key',
    description: 'Thumbnails compete for attention. Use bold, contrasting colors.',
    example: 'High contrast, bold colors, dramatic lighting, eye-catching',
    category: 'style',
  },
  {
    id: 'thumb_002',
    title: 'Leave Space for Text',
    description: "Don't fill the entire frame - leave room for your title overlay.",
    example: 'Subject on left side, negative space on right for text overlay',
    category: 'composition',
  },
  {
    id: 'game_001',
    title: 'Reference Current Seasons',
    description: 'Mention the current game season or event for timely content.',
    example: 'Fortnite Chapter 5 Season 1 themed, current battle pass aesthetic',
    category: 'gaming',
  },
  {
    id: 'game_002',
    title: 'Match Game Aesthetics',
    description: 'Each game has a visual style. Match it for authenticity.',
    example: 'Valorant art style, clean geometric shapes, tactical aesthetic',
    category: 'gaming',
  },
];

/** Upgrade CTA content */
const UPGRADE_CTA = {
  title: 'Unlock Prompt Coach',
  description: 'Get AI-powered prompt refinement with personalized suggestions.',
  features: [
    'AI-powered conversational assistance',
    'Real-time game season context',
    'Iterative prompt refinement',
    'Brand-aware suggestions',
  ],
  buttonText: 'Upgrade to Premium',
  buttonHref: '/dashboard/settings',
};

/** Category display configuration */
const CATEGORY_CONFIG: Record<TipCategory, { label: string; icon: string; color: string }> = {
  style: { label: 'Style', icon: '🎨', color: 'bg-interactive-600/10 text-interactive-400 border-interactive-600/20' },
  color: { label: 'Color', icon: '🌈', color: 'bg-accent-600/10 text-accent-400 border-accent-600/20' },
  composition: { label: 'Composition', icon: '📐', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  gaming: { label: 'Gaming', icon: '🎮', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
};

// ============================================================================
// Icon Components
// ============================================================================

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const LightbulbIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface TipCardProps {
  tip: Tip;
}

/**
 * Individual tip card component.
 */
function TipCard({ tip }: TipCardProps) {
  const categoryConfig = CATEGORY_CONFIG[tip.category];

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        'bg-background-surface border-border-default',
        'hover:border-border-hover transition-colors'
      )}
    >
      {/* Category Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
            categoryConfig.color
          )}
        >
          <span>{categoryConfig.icon}</span>
          <span>{categoryConfig.label}</span>
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-text-primary mb-2">{tip.title}</h3>

      {/* Description */}
      <p className="text-sm text-text-secondary mb-3">{tip.description}</p>

      {/* Example */}
      <div className="bg-background-elevated rounded-md p-3">
        <p className="text-xs text-text-tertiary mb-1">Example:</p>
        <p className="text-sm text-text-primary font-mono">{tip.example}</p>
      </div>
    </div>
  );
}

/**
 * Upgrade CTA component.
 */
function UpgradeCTA() {
  return (
    <div
      className={cn(
        'p-6 rounded-xl',
        'bg-interactive-600/10',
        'border border-interactive-600/20'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent-600/20 flex items-center justify-center">
          <SparklesIcon className="w-6 h-6 text-accent-600" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            {UPGRADE_CTA.title}
          </h3>
          <p className="text-text-secondary mb-4">{UPGRADE_CTA.description}</p>

          {/* Features List */}
          <ul className="space-y-2 mb-5" aria-label="Premium features">
            {UPGRADE_CTA.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-text-secondary">
                <CheckIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <Link
            href={UPGRADE_CTA.buttonHref}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-3 rounded-lg',
              'bg-accent-600 text-white font-medium',
              'hover:bg-accent-500 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-accent-600/50'
            )}
          >
            <SparklesIcon className="w-4 h-4" />
            {UPGRADE_CTA.buttonText}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Static tips component for non-premium users.
 * 
 * Displays helpful prompt crafting tips organized by category,
 * along with an upgrade CTA for the full Prompt Coach experience.
 * 
 * @example
 * ```tsx
 * // Show all tips
 * <CoachTips />
 * 
 * // Filter tips by asset type (future enhancement)
 * <CoachTips assetType="twitch_emote" />
 * ```
 */
export function CoachTips({ assetType, className }: CoachTipsProps) {
  // Filter tips based on asset type (if provided)
  const filteredTips = useMemo(() => {
    if (!assetType) {
      return TIPS;
    }

    // Map asset types to relevant categories
    const assetCategoryMap: Record<AssetType, TipCategory[]> = {
      twitch_emote: ['composition', 'style'],
      youtube_thumbnail: ['composition', 'style', 'color'],
      twitch_banner: ['style', 'color', 'composition'],
      twitch_badge: ['composition', 'style'],
      overlay: ['style', 'color', 'composition'],
      story_graphic: ['style', 'color', 'composition'],
      twitch_panel: ['style', 'color', 'composition'],
      twitch_offline: ['style', 'color', 'composition'],
      tiktok_story: ['style', 'color', 'composition'],
      instagram_story: ['style', 'color', 'composition'],
      instagram_reel: ['style', 'color', 'composition'],
      banner: ['style', 'color', 'composition'],
      thumbnail: ['composition', 'style', 'color'],
      clip_cover: ['composition', 'style', 'color'],
    };

    const relevantCategories = assetCategoryMap[assetType] || [];
    
    // Always include gaming tips
    return TIPS.filter(
      (tip) => relevantCategories.includes(tip.category) || tip.category === 'gaming'
    );
  }, [assetType]);

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent-600/10 flex items-center justify-center">
            <LightbulbIcon className="w-5 h-5 text-accent-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Prompt Tips</h1>
        </div>
        <p className="text-text-secondary">
          Learn how to craft effective prompts for your streaming assets.
        </p>
      </div>

      {/* Upgrade CTA */}
      <div className="mb-8">
        <UpgradeCTA />
      </div>

      {/* Tips Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Quick Tips
        </h2>
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          role="list"
          aria-label="Prompt tips"
        >
          {filteredTips.map((tip) => (
            <div key={tip.id} role="listitem">
              <TipCard tip={tip} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center p-4 bg-background-surface rounded-lg border border-border-default">
        <p className="text-sm text-text-secondary">
          Want personalized suggestions based on your brand?{' '}
          <Link
            href={UPGRADE_CTA.buttonHref}
            className="text-accent-600 hover:underline font-medium"
          >
            Upgrade to Premium
          </Link>{' '}
          for AI-powered prompt coaching.
        </p>
      </div>
    </div>
  );
}

export default CoachTips;

// Re-export types for convenience
export type { AssetType };
