'use client';

/**
 * TipsSection Component
 * 
 * Dashboard 2.0 - Task 1.4
 * Contextual tips based on user state with dismissible functionality.
 * Shows relevant tips: new user, no assets, has assets, etc.
 * 
 * @module dashboard/overview/TipsSection
 */

import { memo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@aurastream/shared';
import { useBrandKits, useAssets } from '@aurastream/api-client';
import { 
  BrandIcon, 
  CreateIcon, 
  CoachIcon,
  CloseIcon,
  ArrowRightIcon,
  LightbulbIcon,
} from '../icons';

// =============================================================================
// Types
// =============================================================================

export interface TipsSectionProps {
  /** Additional CSS classes */
  className?: string;
  /** Force show a specific tip (for testing) */
  forceTip?: TipType;
}

type TipType = 'create_brand_kit' | 'generate_first_asset' | 'try_ai_coach' | 'explore_community';

interface Tip {
  id: TipType;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  ctaLabel: string;
  variant: 'default' | 'primary' | 'accent';
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'aurastream_dismissed_tips';

const TIPS: Record<TipType, Tip> = {
  create_brand_kit: {
    id: 'create_brand_kit',
    title: 'Create your first brand kit',
    description: 'Set up your brand colors, fonts, and style to ensure consistent assets.',
    icon: <BrandIcon size="md" />,
    href: '/dashboard/brand-kits',
    ctaLabel: 'Create Brand Kit',
    variant: 'primary',
  },
  generate_first_asset: {
    id: 'generate_first_asset',
    title: 'Generate your first asset',
    description: 'Use AI to create thumbnails, overlays, emotes, and more for your content.',
    icon: <CreateIcon size="md" />,
    href: '/dashboard/create',
    ctaLabel: 'Create Asset',
    variant: 'primary',
  },
  try_ai_coach: {
    id: 'try_ai_coach',
    title: 'Try the AI Coach',
    description: 'Get personalized prompt suggestions to create better assets faster.',
    icon: <CoachIcon size="md" />,
    href: '/dashboard/create?tab=coach',
    ctaLabel: 'Open Coach',
    variant: 'accent',
  },
  explore_community: {
    id: 'explore_community',
    title: 'Explore the community',
    description: 'Discover assets from other creators and get inspired for your next project.',
    icon: <LightbulbIcon size="md" />,
    href: '/community',
    ctaLabel: 'Browse Gallery',
    variant: 'default',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

function getDismissedTips(): Set<TipType> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored) as TipType[]);
    }
  } catch {
    // Ignore localStorage errors
  }
  return new Set();
}

function saveDismissedTips(tips: Set<TipType>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...tips]));
  } catch {
    // Ignore localStorage errors
  }
}

// =============================================================================
// TipCard Component
// =============================================================================

interface TipCardProps {
  tip: Tip;
  onDismiss: () => void;
}

const TipCard = memo(function TipCard({ tip, onDismiss }: TipCardProps) {
  const { title, description, icon, href, ctaLabel, variant } = tip;
  
  const variantStyles = {
    default: {
      container: 'bg-background-surface/50 border-border-subtle',
      icon: 'bg-background-elevated text-text-secondary',
      cta: 'bg-background-elevated hover:bg-background-elevated/80 text-text-primary',
    },
    primary: {
      container: 'bg-gradient-to-r from-interactive-600/10 via-interactive-600/5 to-transparent border-interactive-600/20',
      icon: 'bg-interactive-600 text-white shadow-lg shadow-interactive-600/20',
      cta: 'bg-interactive-600 hover:bg-interactive-500 text-white',
    },
    accent: {
      container: 'bg-gradient-to-r from-accent-500/10 via-accent-500/5 to-transparent border-accent-500/20',
      icon: 'bg-accent-500 text-white shadow-lg shadow-accent-500/20',
      cta: 'bg-accent-500 hover:bg-accent-400 text-white',
    },
  };
  
  const styles = variantStyles[variant];
  
  return (
    <div className={cn(
      'relative p-4 rounded-xl border',
      'transition-all duration-200 motion-reduce:transition-none',
      styles.container
    )}>
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className={cn(
          'absolute top-3 right-3 p-1.5 rounded-lg',
          'text-text-muted hover:text-text-secondary',
          'hover:bg-white/5 transition-colors motion-reduce:transition-none',
          'focus:outline-none focus:ring-2 focus:ring-interactive-500'
        )}
        aria-label={`Dismiss tip: ${title}`}
        type="button"
      >
        <CloseIcon size="sm" aria-hidden="true" />
      </button>
      
      <div className="flex items-start gap-3 pr-8">
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          styles.icon
        )}>
          {icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-text-primary mb-0.5">
            {title}
          </h3>
          <p className="text-xs text-text-secondary mb-3 line-clamp-2">
            {description}
          </p>
          
          {/* CTA */}
          <Link
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'text-xs font-medium transition-colors motion-reduce:transition-none',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
              styles.cta
            )}
          >
            {ctaLabel}
            <ArrowRightIcon size="sm" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
});

TipCard.displayName = 'TipCard';

// =============================================================================
// Main TipsSection Component
// =============================================================================

/**
 * Contextual tips section for the dashboard overview.
 * 
 * Features:
 * - Shows relevant tip based on user state
 * - Dismissible tips (persisted to localStorage)
 * - Subtle, non-intrusive styling
 * - Multiple tip variants
 * 
 * Tip Priority:
 * 1. New user with no brand kits → "Create your first brand kit"
 * 2. Has brand kit but no assets → "Generate your first asset"
 * 3. Has assets, is premium → "Try the AI Coach"
 * 4. Has assets, not premium → "Explore the community"
 * 
 * @example
 * ```tsx
 * <TipsSection />
 * 
 * // Force specific tip (testing)
 * <TipsSection forceTip="try_ai_coach" />
 * ```
 */
export const TipsSection = memo(function TipsSection({
  className,
  forceTip,
}: TipsSectionProps) {
  const { user } = useAuth();
  const { data: brandKitsData, isLoading: brandKitsLoading } = useBrandKits();
  const { data: assetsData, isLoading: assetsLoading } = useAssets({ limit: 1 });
  
  const [dismissedTips, setDismissedTips] = useState<Set<TipType>>(new Set());
  const [mounted, setMounted] = useState(false);
  
  // Load dismissed tips from localStorage on mount
  useEffect(() => {
    setDismissedTips(getDismissedTips());
    setMounted(true);
  }, []);
  
  // Determine which tip to show based on user state
  const activeTip = (() => {
    // Force tip for testing
    if (forceTip && !dismissedTips.has(forceTip)) {
      return TIPS[forceTip];
    }
    
    // Still loading data
    if (brandKitsLoading || assetsLoading) {
      return null;
    }
    
    const hasBrandKits = (brandKitsData?.brandKits?.length ?? 0) > 0;
    const hasAssets = (assetsData?.assets?.length ?? 0) > 0;
    const isPremium = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio' || user?.subscriptionTier === 'unlimited';
    
    // Priority 1: No brand kits
    if (!hasBrandKits && !dismissedTips.has('create_brand_kit')) {
      return TIPS.create_brand_kit;
    }
    
    // Priority 2: Has brand kit but no assets
    if (hasBrandKits && !hasAssets && !dismissedTips.has('generate_first_asset')) {
      return TIPS.generate_first_asset;
    }
    
    // Priority 3: Has assets, is premium → suggest AI Coach
    if (hasAssets && isPremium && !dismissedTips.has('try_ai_coach')) {
      return TIPS.try_ai_coach;
    }
    
    // Priority 4: Has assets, not premium → suggest community
    if (hasAssets && !isPremium && !dismissedTips.has('explore_community')) {
      return TIPS.explore_community;
    }
    
    return null;
  })();
  
  // Handle dismiss
  const handleDismiss = useCallback(() => {
    if (!activeTip) return;
    
    setDismissedTips((prev) => {
      const next = new Set(prev);
      next.add(activeTip.id);
      saveDismissedTips(next);
      return next;
    });
  }, [activeTip]);
  
  // Don't render until mounted (avoid hydration mismatch)
  if (!mounted) {
    return null;
  }
  
  // No tip to show
  if (!activeTip) {
    return null;
  }
  
  return (
    <div 
      className={className}
      role="region"
      aria-label="Tips and suggestions"
    >
      <TipCard tip={activeTip} onDismiss={handleDismiss} />
    </div>
  );
});

TipsSection.displayName = 'TipsSection';

export default TipsSection;
