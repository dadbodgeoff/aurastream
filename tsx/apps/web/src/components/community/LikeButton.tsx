/**
 * LikeButton - Interactive heart button for Community Gallery likes.
 * Features animated heart icon with scale bounce on click.
 *
 * @module community/LikeButton
 */

'use client';

import { cn } from '@/lib/utils';

export interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onToggle: () => void;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 'w-4 h-4', text: 'text-xs', padding: 'px-2 py-1', gap: 'gap-1' },
  md: { icon: 'w-5 h-5', text: 'text-sm', padding: 'px-3 py-1.5', gap: 'gap-1.5' },
  lg: { icon: 'w-6 h-6', text: 'text-base', padding: 'px-4 py-2', gap: 'gap-2' },
};

export function LikeButton({
  isLiked,
  likeCount,
  onToggle,
  isLoading = false,
  size = 'md',
  showCount = true,
  className,
}: LikeButtonProps) {
  const config = sizeConfig[size];

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isLoading}
      aria-label={isLiked ? `Unlike (${likeCount} likes)` : `Like (${likeCount} likes)`}
      aria-pressed={isLiked}
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        'transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2',
        'active:scale-95 motion-reduce:active:scale-100',
        config.padding,
        config.gap,
        isLiked
          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
          : 'bg-background-elevated text-text-secondary hover:bg-background-surface hover:text-red-400',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(
          config.icon,
          'transition-transform duration-200',
          !isLoading && 'active:scale-125 motion-reduce:active:scale-100',
          isLiked && 'animate-like-bounce'
        )}
        fill={isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {showCount && (
        <span className={cn(config.text, 'tabular-nums')}>{likeCount}</span>
      )}
    </button>
  );
}

export default LikeButton;
