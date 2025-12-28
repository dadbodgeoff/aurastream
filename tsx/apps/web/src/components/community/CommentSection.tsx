'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

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
  isLoading = false, isSubmitting = false, className,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && !isSubmitting) {
      onAddComment(newComment.trim());
      setNewComment('');
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

  return (
    <div className={cn('space-y-4', className)} data-post-id={postId}>
      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          disabled={isSubmitting}
          rows={3}
          className={cn(
            'w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-surface',
            'text-text-primary placeholder:text-text-muted resize-none',
            'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-interactive-500 text-white',
              'hover:bg-interactive-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500',
              'focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? <Spinner /> : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
            <span className="ml-2 text-text-muted">Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-background-surface">
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
                      <button onClick={() => onDeleteComment(comment.id)} className="text-xs text-text-muted hover:text-red-500 transition-colors">Delete</button>
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

export default CommentSection;
