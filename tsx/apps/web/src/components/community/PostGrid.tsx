'use client';

import { cn } from '@/lib/utils';
import { PostCard } from './PostCard';

export interface PostGridProps {
  posts: Array<{
    id: string;
    title: string;
    assetUrl: string;
    assetType: string;
    author: { id: string; displayName: string; avatarUrl: string | null };
    likeCount: number;
    commentCount: number;
    tags: string[];
    isFeatured: boolean;
    isLiked: boolean;
  }>;
  onPostClick?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onAuthorClick?: (authorId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border-subtle overflow-hidden bg-background-surface animate-pulse">
      <div className="aspect-square bg-background-elevated" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-background-elevated rounded w-3/4" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-background-elevated" />
          <div className="h-4 bg-background-elevated rounded w-24" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 bg-background-elevated rounded-full w-14" />
          <div className="h-5 bg-background-elevated rounded-full w-16" />
        </div>
        <div className="flex items-center gap-4 pt-3 border-t border-border-subtle">
          <div className="h-4 bg-background-elevated rounded w-12" />
          <div className="h-4 bg-background-elevated rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export function PostGrid({
  posts,
  onPostClick,
  onLike,
  onAuthorClick,
  isLoading = false,
  emptyMessage = 'No posts to display',
  className,
}: PostGridProps) {
  if (isLoading) {
    return (
      <div className={cn(
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6',
        className
      )}>
        {Array.from({ length: 8 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="w-16 h-16 mb-4 rounded-full bg-background-elevated flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <p className="text-text-muted text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6',
      className
    )}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          {...post}
          onClick={() => onPostClick?.(post.id)}
          onLike={() => onLike?.(post.id)}
          onAuthorClick={() => onAuthorClick?.(post.author.id)}
        />
      ))}
    </div>
  );
}
