'use client';

import { useState } from 'react';
import { useAcceptFriendRequest, useDeclineFriendRequest } from '@aurastream/api-client/src/hooks/useFriends';
import type { FriendRequest } from '@aurastream/api-client/src/types/social';
import { Skeleton } from '@/components/ui/Skeleton';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';

interface FriendRequestsProps {
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  isLoading?: boolean;
}

export function FriendRequests({ pendingRequests, sentRequests, isLoading }: FriendRequestsProps) {
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());
  const [decliningIds, setDecliningIds] = useState<Set<string>>(new Set());

  // Show loading skeletons
  if (isLoading) {
    return (
      <div className="p-2 space-y-4">
        <div>
          <Skeleton className="h-3 w-20 mb-2 ml-2" aria-label="" />
          <div className="space-y-1">
            <RequestItemSkeleton />
            <RequestItemSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (pendingRequests.length === 0 && sentRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-interactive-600/10 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-interactive-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <p className="text-xs text-text-secondary mb-1">No pending requests</p>
        <p className="text-[10px] text-text-tertiary">Friend requests will appear here</p>
      </div>
    );
  }

  const handleAccept = async (friendshipId: string, displayName: string | null) => {
    setAcceptingIds(prev => new Set(prev).add(friendshipId));
    
    try {
      await acceptRequest.mutateAsync(friendshipId);
      showSuccessToast(`You are now friends with ${displayName || 'this user'}!`);
    } catch (error) {
      showErrorToast(error, {
        onRetry: () => handleAccept(friendshipId, displayName),
      });
    } finally {
      setAcceptingIds(prev => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

  const handleDecline = async (friendshipId: string, displayName: string | null) => {
    setDecliningIds(prev => new Set(prev).add(friendshipId));
    
    try {
      await declineRequest.mutateAsync(friendshipId);
      showSuccessToast(`Declined request from ${displayName || 'user'}`);
    } catch (error) {
      showErrorToast(error, {
        onRetry: () => handleDecline(friendshipId, displayName),
      });
    } finally {
      setDecliningIds(prev => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

  return (
    <div className="p-2 space-y-4">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="px-2 mb-2 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
            Pending ({pendingRequests.length})
          </h3>
          <div className="space-y-1">
            {pendingRequests.map((request) => {
              const isAccepting = acceptingIds.has(request.friendshipId);
              const isDeclining = decliningIds.has(request.friendshipId);
              const isProcessing = isAccepting || isDeclining;
              
              return (
                <div
                  key={request.friendshipId}
                  className={`flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] transition-opacity ${
                    isProcessing ? 'opacity-50' : ''
                  }`}
                >
                  {/* Avatar */}
                  {request.avatarUrl ? (
                    <img
                      src={request.avatarUrl}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-interactive-500/20 to-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-text-secondary">
                        {(request.displayName || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {request.displayName || 'Unknown'}
                    </p>
                    <p className="text-[10px] text-text-tertiary">Wants to be friends</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAccept(request.friendshipId, request.displayName)}
                      disabled={isProcessing}
                      className="p-1.5 text-success-main hover:bg-success-main/10 rounded-md transition-colors disabled:opacity-50"
                      title="Accept"
                    >
                      {isAccepting ? (
                        <div className="w-4 h-4 border-2 border-success-main/30 border-t-success-main rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDecline(request.friendshipId, request.displayName)}
                      disabled={isProcessing}
                      className="p-1.5 text-error-main hover:bg-error-main/10 rounded-md transition-colors disabled:opacity-50"
                      title="Decline"
                    >
                      {isDeclining ? (
                        <div className="w-4 h-4 border-2 border-error-main/30 border-t-error-main rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <div>
          <h3 className="px-2 mb-2 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
            Sent ({sentRequests.length})
          </h3>
          <div className="space-y-1">
            {sentRequests.map((request) => (
              <div
                key={request.friendshipId}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]"
              >
                {/* Avatar */}
                {request.avatarUrl ? (
                  <img
                    src={request.avatarUrl}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-interactive-500/20 to-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-text-secondary">
                      {(request.displayName || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {request.displayName || 'Unknown'}
                  </p>
                  <p className="text-[10px] text-text-tertiary">Request pending</p>
                </div>

                {/* Status */}
                <span className="px-2 py-0.5 text-[9px] font-medium text-warning-main bg-warning-main/10 rounded-full">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for friend request items.
 */
function RequestItemSkeleton(): JSX.Element {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
      <Skeleton width={36} height={36} rounded="full" aria-label="" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-20" aria-label="" />
        <Skeleton className="h-2.5 w-24" aria-label="" />
      </div>
      <div className="flex gap-1">
        <Skeleton width={28} height={28} rounded="md" aria-label="" />
        <Skeleton width={28} height={28} rounded="md" aria-label="" />
      </div>
    </div>
  );
}
