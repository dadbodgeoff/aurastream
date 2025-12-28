'use client';

import { cn } from '@/lib/utils';

export interface PostCardProps {
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
  onClick?: () => void;
  onLike?: () => void;
  onAuthorClick?: () => void;
  className?: string;
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function PostCard({
  id,
  title,
  assetUrl,
  assetType,
  author,
  likeCount,
  commentCount,
  tags,
  isFeatured,
  isLiked,
  onClick,
  onLike,
  onAuthorClick,
  className,
}: PostCardProps) {
  const visibleTags = tags.slice(0, 3);
  const remainingTagsCount = tags.length - 3;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl border border-border-subtle overflow-hidden bg-background-surface transition-all cursor-pointer',
        'hover:border-border-default hover:shadow-lg hover:scale-[1.02]',
        className
      )}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute top-3 left-3 z-10 px-2 py-1 text-xs font-semibold bg-amber-500 text-white rounded-full shadow-md">
          ⭐ Featured
        </div>
      )}

      {/* Asset Image */}
      <div className="relative aspect-square bg-background-elevated overflow-hidden">
        <img
          src={assetUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-text-primary truncate mb-2" title={title}>
          {title}
        </h3>

        {/* Author */}
        <button
          onClick={(e) => { e.stopPropagation(); onAuthorClick?.(); }}
          className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
        >
          {author.avatarUrl ? (
            <img src={author.avatarUrl} alt={author.displayName} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-interactive-600/20 flex items-center justify-center text-xs font-medium text-interactive-600">
              {author.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm text-text-muted truncate">{author.displayName}</span>
        </button>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {visibleTags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-background-elevated text-text-muted rounded-full">
                {tag}
              </span>
            ))}
            {remainingTagsCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-background-elevated text-text-muted rounded-full">
                +{remainingTagsCount} more
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 pt-3 border-t border-border-subtle">
          <button
            onClick={(e) => { e.stopPropagation(); onLike?.(); }}
            className={cn(
              'flex items-center gap-1.5 text-sm transition-colors',
              isLiked ? 'text-rose-500' : 'text-text-muted hover:text-rose-500'
            )}
          >
            <HeartIcon filled={isLiked} />
            <span>{likeCount}</span>
          </button>
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <CommentIcon />
            <span>{commentCount}</span>
          </div>
          <span className="ml-auto text-xs text-text-muted capitalize">{assetType.replace('_', ' ')}</span>
        </div>
      </div>
    </div>
  );
}
