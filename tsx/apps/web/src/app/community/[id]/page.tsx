'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@aurastream/shared';
import {
  useCommunityPost, useComments, useLikePost, useUnlikePost,
  useFollowUser, useUnfollowUser, useCreateComment, useDeleteComment,
  useCreatorProfile, useReportPost,
} from '@aurastream/api-client';
import { LikeButton, FollowButton, CommentSection } from '@/components/community';
import { PageHeader } from '@/components/navigation';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorRecovery } from '@/components/ErrorRecovery';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';
import { cn } from '@/lib/utils';

function PostDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background-base animate-pulse">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-4 w-32 bg-background-elevated rounded mb-6" />
        <div className="aspect-video bg-background-elevated rounded-xl mb-6" />
        <div className="h-8 w-3/4 bg-background-elevated rounded mb-4" />
        <div className="h-4 w-full bg-background-elevated rounded mb-2" />
        <div className="h-4 w-2/3 bg-background-elevated rounded mb-6" />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-background-elevated" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-background-elevated rounded mb-2" />
            <div className="h-3 w-24 bg-background-elevated rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-background-base flex items-center justify-center">
      <ErrorRecovery
        error={{ code: 'COMMUNITY_POST_NOT_FOUND' }}
        variant="fullscreen"
        customActions={[
          { label: 'Browse Community', onClick: () => window.location.href = '/community', variant: 'primary' },
        ]}
      />
    </div>
  );
}

function BannedUserNotice({ onContactSupport }: { onContactSupport: () => void }) {
  return (
    <div className="min-h-screen bg-background-base flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-text-primary">Account Restricted</h2>
        <p className="text-text-secondary">
          Your community access has been restricted. If you believe this is an error, please contact our support team.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={onContactSupport}
            className="px-6 py-2.5 rounded-lg font-medium bg-interactive-600 text-white hover:bg-interactive-500 transition-colors"
          >
            Contact Support
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-lg font-medium border border-border-subtle text-text-secondary hover:bg-background-elevated transition-colors text-center"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReportModal({ onClose, onSubmit, isSubmitting }: { onClose: () => void; onSubmit: (reason: string, details: string) => void; isSubmitting: boolean }) {
  const [reason, setReason] = useState<string>('spam');
  const [details, setDetails] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background-surface rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Report Post</h3>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-elevated text-text-primary mb-3">
          <option value="spam">Spam</option>
          <option value="inappropriate">Inappropriate Content</option>
          <option value="copyright">Copyright Violation</option>
          <option value="harassment">Harassment</option>
          <option value="other">Other</option>
        </select>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Additional details (optional)" rows={3} className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-background-elevated text-text-primary resize-none mb-4" />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-text-secondary hover:text-text-primary">Cancel</button>
          <button onClick={() => onSubmit(reason, details)} disabled={isSubmitting} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const { user } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const { data: post, isLoading: postLoading, error: postError, refetch: refetchPost } = useCommunityPost(postId);
  const { data: commentsData, isLoading: commentsLoading, refetch: refetchComments } = useComments(postId);
  const { data: authorProfile } = useCreatorProfile(post?.author?.id);

  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();
  const reportMutation = useReportPost();

  // Error handler for banned users
  const handleBannedError = useCallback((error: any) => {
    if (error?.code === 'COMMUNITY_USER_BANNED' || error?.message?.includes('banned')) {
      setIsBanned(true);
      return true;
    }
    return false;
  }, []);

  const handleLikeToggle = useCallback(() => {
    if (!post) return;
    const mutation = post.isLiked ? unlikeMutation : likeMutation;
    mutation.mutate(postId, {
      onError: (error: any) => {
        if (!handleBannedError(error)) {
          showErrorToast(error, {
            onRetry: () => mutation.mutate(postId),
          });
        }
      },
    });
  }, [post, postId, likeMutation, unlikeMutation, handleBannedError]);

  const handleFollowToggle = useCallback(() => {
    if (!post?.author) return;
    const mutation = authorProfile?.isFollowing ? unfollowMutation : followMutation;
    mutation.mutate(post.author.id, {
      onSuccess: () => {
        if (!authorProfile?.isFollowing) {
          showSuccessToast('Following creator', {
            description: 'You\'ll see their posts in your feed',
          });
        }
      },
      onError: (error: any) => {
        if (!handleBannedError(error)) {
          showErrorToast(error, {
            onRetry: () => mutation.mutate(post.author.id),
          });
        }
      },
    });
  }, [post?.author, authorProfile?.isFollowing, followMutation, unfollowMutation, handleBannedError]);

  const handleAddComment = useCallback((content: string) => {
    createCommentMutation.mutate({ postId, data: { content } }, {
      onSuccess: () => {
        showSuccessToast('Comment posted!');
      },
      onError: (error: any) => {
        if (!handleBannedError(error)) {
          showErrorToast(error, {
            onRetry: () => createCommentMutation.mutate({ postId, data: { content } }),
          });
        }
      },
    });
  }, [postId, createCommentMutation, handleBannedError]);

  const handleDeleteComment = useCallback((commentId: string) => {
    deleteCommentMutation.mutate({ commentId, postId }, {
      onSuccess: () => {
        showSuccessToast('Comment deleted');
      },
      onError: (error: any) => {
        showErrorToast(error, {
          onRetry: () => deleteCommentMutation.mutate({ commentId, postId }),
        });
      },
    });
  }, [postId, deleteCommentMutation]);

  const handleReport = useCallback((reason: string, details: string) => {
    reportMutation.mutate({ postId, data: { reason: reason as any, details } }, {
      onSuccess: () => {
        setShowReportModal(false);
        showSuccessToast('Report submitted', {
          description: 'Thank you for helping keep our community safe.',
        });
      },
      onError: (error: any) => {
        showErrorToast(error);
      },
    });
  }, [postId, reportMutation]);

  // Show banned user notice
  if (isBanned) {
    return <BannedUserNotice onContactSupport={() => router.push('/support')} />;
  }

  if (postLoading) return <PostDetailSkeleton />;
  
  // Handle post fetch error
  if (postError) {
    return (
      <div className="min-h-screen bg-background-base flex items-center justify-center p-4">
        <ErrorRecovery
          error={postError}
          onRetry={() => { refetchPost(); }}
          variant="card"
        />
      </div>
    );
  }
  
  if (!post) return <NotFound />;

  const isOwnPost = user?.id === post.userId;
  const comments = commentsData?.items ?? [];

  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header with Breadcrumbs */}
        <PageHeader 
          title={post.title}
          backUrl="/community"
        />

        {/* Asset Image */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-background-elevated mb-6">
          <Image src={post.assetUrl} alt={post.title} fill className="object-contain" sizes="(max-width: 896px) 100vw, 896px" priority />
        </div>

        {/* Post Info */}
        {post.description && <p className="text-text-secondary mb-4">{post.description}</p>}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 text-sm rounded-full bg-background-elevated text-text-secondary">#{tag}</span>
            ))}
          </div>
        )}

        {/* Author + Actions Row */}
        <div className="flex items-center justify-between flex-wrap gap-4 py-4 border-y border-border-subtle mb-6">
          <div className="flex items-center gap-3">
            <Link href={`/community/creators/${post.author.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt={post.author.displayName} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-interactive-600/20 flex items-center justify-center text-lg font-medium text-interactive-600">
                  {post.author.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-text-primary">{post.author.displayName}</span>
            </Link>
            {!isOwnPost && user && (
              <FollowButton isFollowing={authorProfile?.isFollowing ?? false} onToggle={handleFollowToggle} isLoading={followMutation.isPending || unfollowMutation.isPending} size="sm" />
            )}
          </div>
          <LikeButton isLiked={post.isLiked} likeCount={post.likeCount} onToggle={handleLikeToggle} isLoading={likeMutation.isPending || unlikeMutation.isPending} size="lg" />
        </div>

        {/* Prompt Display */}
        {post.showPrompt && post.promptUsed && (
          <div className="mb-6 p-4 rounded-lg bg-background-surface border border-border-subtle">
            <h3 className="text-sm font-medium text-text-muted mb-2">Prompt Used</h3>
            <p className="text-text-secondary italic">"{post.promptUsed}"</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link href={`/create?inspiration=${postId}`} className="inline-flex items-center gap-2 px-4 py-2 bg-interactive-500 text-white rounded-lg hover:bg-interactive-600 transition-colors font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Use as Inspiration
          </Link>
          {!isOwnPost && user && (
            <button onClick={() => setShowReportModal(true)} className="inline-flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Report
            </button>
          )}
        </div>

        {/* Comments Section with Error Boundary */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Comments ({post.commentCount})</h2>
          <AsyncErrorBoundary
            resourceName="comments"
            onRefetch={() => { refetchComments(); }}
          >
            <CommentSection 
              postId={postId} 
              comments={comments} 
              currentUserId={user?.id} 
              onAddComment={handleAddComment} 
              onDeleteComment={handleDeleteComment} 
              isLoading={commentsLoading} 
              isSubmitting={createCommentMutation.isPending}
              isDeleting={deleteCommentMutation.isPending}
            />
          </AsyncErrorBoundary>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} onSubmit={handleReport} isSubmitting={reportMutation.isPending} />}
    </div>
  );
}
