'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

export interface CommentSectionProps {
  postId: string;
  comments: Array<{
    id: string;
    content: string;
    author: { id: string; displayName: string; avatarUrl: string | null };
    isEdited: boolean;
    createdAt: string;
    canEdit?: boolean;
    canDelete?: boolean;
  }>;
  currentUserId?: string;
  onAddComment: (content: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  isLoading?: boolean;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function Avatar({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  return avatarUrl ? (
    <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-interactive-600/20 flex items-center justify-center text-sm font-medium text-interactive-600">
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function CommentSection({
  postId, comments, currentUserId, onAddComment, onEditComment, onDeleteComment,
  isLoading = false, isSubmitting = false, isDeleting = false, className,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<'valid' | 'invalid' | null>(null);

  // Inline validation for comment content
  const validateComment = useCallback((value: string) => {
    if (value.trim().length >= 2) {
      setValidationState('valid');
      return true;
    } else if (value.length > 0) {
      setValidationState('invalid');
      return false;
    }
    setValidationState(null);
    return false;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && !isSubmitting && validateComment(newComment)) {
      onAddComment(newComment.trim());
      setNewComment('');
      setValidationState(null);
    }
  };

  const handleEditStart = (comment: { id: string; content: string }) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleEditSave = (commentId: string) => {
    if (editContent.trim() && onEditComment) {
      onEditComment(commentId, editContent.trim());
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleEditCancel = () => { setEditingId(null); setEditContent(''); };

  const handleDelete = (commentId: string) => {
    setDeletingId(commentId);
    onDeleteComment?.(commentId);
  };

  return (
    <div className={cn('space-y-4', className)} data-post-id={postId}>
      {/* Comment Form with inline validation */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              validateComment(e.target.value);
            }}
            placeholder="Add a comment..."
            disabled={isSubmitting}
            rows={3}
            className={cn(
              'w-full px-3 py-2 rounded-lg border bg-background-surface',
              'text-text-primary placeholder:text-text-muted resize-none',
              'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              validationState === 'valid' ? 'border-green-500' : 
              validationState === 'invalid' ? 'border-yellow-500' : 'border-border-subtle'
            )}
          />
          {validationState === 'valid' && (
            <div className="absolute top-3 right-3 text-green-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {validationState === 'valid' && '✓ Ready to post'}
            {validationState === 'invalid' && 'Comment must be at least 2 characters'}
          </span>
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting || validationState !== 'valid'}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-interactive-500 text-white',
              'hover:bg-interactive-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500',
              'focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
            )}
          >
            {isSubmitting ? (
              <>
                <Spinner />
                <span>Posting...</span>
              </>
            ) : (
              'Post Comment'
            )}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <CommentsSkeleton />
        ) : comments.length === 0 ? (
          <EmptyCommentsState />
        ) : (
          comments.map((comment) => (
            <div 
              key={comment.id} 
              className={cn(
                'flex gap-3 p-3 rounded-lg bg-background-surface transition-opacity',
                (isDeleting && deletingId === comment.id) && 'opacity-50'
              )}
            >
              <Avatar displayName={comment.author.displayName} avatarUrl={comment.author.avatarUrl} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-text-primary">{comment.author.displayName}</span>
                  <span className="text-xs text-text-muted">{formatRelativeTime(comment.createdAt)}</span>
                  {comment.isEdited && <span className="text-xs text-text-muted italic">(edited)</span>}
                </div>
                {editingId === comment.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1 rounded border border-border-subtle bg-background-elevated text-text-primary text-sm resize-none focus:outline-none focus:ring-1 focus:ring-interactive-500"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditSave(comment.id)} className="text-xs text-interactive-500 hover:text-interactive-600 font-medium">Save</button>
                      <button onClick={handleEditCancel} className="text-xs text-text-muted hover:text-text-secondary">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-text-secondary break-words">{comment.content}</p>
                )}
                {!editingId && (comment.canEdit || comment.canDelete) && (
                  <div className="mt-2 flex gap-3">
                    {comment.canEdit && onEditComment && (
                      <button onClick={() => handleEditStart(comment)} className="text-xs text-text-muted hover:text-interactive-500 transition-colors">Edit</button>
                    )}
                    {comment.canDelete && onDeleteComment && (
                      <button 
                        onClick={() => handleDelete(comment.id)} 
                        disabled={isDeleting && deletingId === comment.id}
                        className="text-xs text-text-muted hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        {isDeleting && deletingId === comment.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for comments
 */
function CommentsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading comments...">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-lg bg-background-surface">
          <Skeleton width={32} height={32} rounded="full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state for comments section
 */
function EmptyCommentsState() {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-background-elevated flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p className="text-text-muted">No comments yet. Be the first to comment!</p>
    </div>
  );
}

export default CommentSection;
