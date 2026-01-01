'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FollowButton } from './FollowButton';

export interface SpotlightCreator {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  recentAssets: { id: string; url: string; type: string }[];
}

interface CreatorCardProps {
  creator: SpotlightCreator;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
}

function CreatorCard({ creator, onFollow, onUnfollow }: CreatorCardProps) {
  const displayAssets = creator.recentAssets.slice(0, 4);
  
  return (
    <div className="flex-shrink-0 w-[140px] md:w-[160px] rounded-lg border border-border-subtle bg-background-surface overflow-hidden hover:border-border-default transition-all">
      {/* Header with Avatar */}
      <Link href={`/community/creators/${creator.id}`} className="block p-2.5 pb-1.5">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt={creator.displayName}
              className="w-10 h-10 rounded-full object-cover border border-border-subtle"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-interactive-500/20 flex items-center justify-center text-sm font-bold text-interactive-500">
              {creator.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Name */}
          <h3 className="mt-1.5 font-medium text-text-primary text-xs truncate w-full">
            {creator.displayName}
          </h3>
          
          {/* Stats */}
          <div className="text-micro text-text-muted">
            {creator.followerCount.toLocaleString()} followers
          </div>
        </div>
      </Link>

      {/* Recent Assets Grid */}
      <div className="grid grid-cols-4 gap-px px-1.5">
        {displayAssets.map((asset) => (
          <div key={asset.id} className="aspect-square bg-background-elevated overflow-hidden rounded-sm">
            <img
              src={asset.url}
              alt=""
              className="w-full h-full object-cover hover:scale-110 transition-transform"
              loading="lazy"
            />
          </div>
        ))}
        {/* Fill empty slots */}
        {Array.from({ length: Math.max(0, 4 - displayAssets.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-background-elevated rounded-sm" />
        ))}
      </div>

      {/* Follow Button */}
      <div className="p-2">
        <FollowButton
          isFollowing={creator.isFollowing}
          onToggle={() => creator.isFollowing ? onUnfollow(creator.id) : onFollow(creator.id)}
          size="sm"
          className="w-full"
        />
      </div>
    </div>
  );
}

interface CreatorSpotlightProps {
  creators: SpotlightCreator[];
  isLoading?: boolean;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  className?: string;
}

function CreatorSkeleton() {
  return (
    <div className="flex-shrink-0 w-[140px] md:w-[160px] rounded-lg border border-border-subtle bg-background-surface overflow-hidden animate-pulse">
      <div className="p-2.5 pb-1.5 flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-background-elevated" />
        <div className="mt-1.5 h-3 w-16 bg-background-elevated rounded" />
        <div className="mt-1 h-2 w-12 bg-background-elevated rounded" />
      </div>
      <div className="grid grid-cols-4 gap-px px-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square bg-background-elevated rounded-sm" />
        ))}
      </div>
      <div className="p-2">
        <div className="h-6 bg-background-elevated rounded-lg" />
      </div>
    </div>
  );
}

export function CreatorSpotlight({
  creators,
  isLoading,
  onFollow,
  onUnfollow,
  className,
}: CreatorSpotlightProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 220;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className={cn('relative', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Community Spotlight</h2>
          <p className="text-micro text-text-muted">Discover talented creators</p>
        </div>
        
        {/* Scroll Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="w-6 h-6 rounded-full border border-border-subtle bg-background-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-default transition-colors"
            aria-label="Scroll left"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-6 h-6 rounded-full border border-border-subtle bg-background-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-default transition-colors"
            aria-label="Scroll right"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Creator Cards */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin scrollbar-thumb-border-subtle scrollbar-track-transparent"
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CreatorSkeleton key={i} />)
        ) : creators.length > 0 ? (
          creators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onFollow={onFollow}
              onUnfollow={onUnfollow}
            />
          ))
        ) : (
          <div className="flex-1 py-6 text-center text-text-muted text-xs">
            No creators to spotlight yet. Be the first to share your work!
          </div>
        )}
      </div>
    </section>
  );
}
