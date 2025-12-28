/**
 * FollowButton - Toggle button for following/unfollowing users in Community Gallery
 */

'use client';

import { cn } from '@/lib/utils';

export interface FollowButtonProps {
  isFollowing: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm' } as const;

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function FollowButton({
  isFollowing,
  onToggle,
  isLoading = false,
  size = 'md',
  className,
}: FollowButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isLoading}
      aria-label={isFollowing ? 'Unfollow user' : 'Follow user'}
      aria-pressed={isFollowing}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        isFollowing
          ? 'bg-background-elevated border border-border-default text-text-primary hover:bg-red-500/10 hover:border-red-500 hover:text-red-500 group'
          : 'bg-interactive-500 text-white hover:bg-interactive-600 active:bg-interactive-700',
        className
      )}
    >
      {isLoading ? (
        <Spinner />
      ) : isFollowing ? (
        <>
          <span className="group-hover:hidden">Following</span>
          <span className="hidden group-hover:inline">Unfollow</span>
        </>
      ) : (
        'Follow'
      )}
    </button>
  );
}

export default FollowButton;
