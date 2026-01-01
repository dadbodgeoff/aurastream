'use client';

import { useRemoveFriend, useBlockUser } from '@aurastream/api-client';
import type { Friend } from '@aurastream/api-client';
import { useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';

interface FriendsListProps {
  friends: Friend[];
  isLoading?: boolean;
  onOpenChat: (userId: string, displayName: string | null, avatarUrl: string | null) => void;
}

export function FriendsList({ friends, isLoading, onOpenChat }: FriendsListProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [blockingIds, setBlockingIds] = useState<Set<string>>(new Set());
  const removeFriend = useRemoveFriend();
  const blockUser = useBlockUser();

  // Show loading skeletons
  if (isLoading) {
    return (
      <div className="p-2 space-y-1">
        <FriendItemSkeleton />
        <FriendItemSkeleton />
        <FriendItemSkeleton />
        <FriendItemSkeleton />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-interactive-600/10 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-interactive-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-xs text-text-secondary mb-1">No friends yet</p>
        <p className="text-micro text-text-tertiary">Search for users to add friends</p>
      </div>
    );
  }

  const handleRemove = async (friendshipId: string, displayName: string | null) => {
    setMenuOpen(null);
    setRemovingIds(prev => new Set(prev).add(friendshipId));
    
    try {
      await removeFriend.mutateAsync(friendshipId);
      showSuccessToast(`Removed ${displayName || 'friend'} from friends`);
    } catch (error) {
      showErrorToast(error, {
        onRetry: () => handleRemove(friendshipId, displayName),
      });
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

  const handleBlock = async (userId: string, displayName: string | null) => {
    setMenuOpen(null);
    setBlockingIds(prev => new Set(prev).add(userId));
    
    try {
      await blockUser.mutateAsync(userId);
      showSuccessToast(`Blocked ${displayName || 'user'}`);
    } catch (error) {
      showErrorToast(error, {
        onRetry: () => handleBlock(userId, displayName),
      });
    } finally {
      setBlockingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <div className="p-2 space-y-1">
      {friends.map((friend) => {
        const isRemoving = removingIds.has(friend.friendshipId);
        const isBlocking = blockingIds.has(friend.userId);
        const isProcessing = isRemoving || isBlocking;
        
        return (
          <div
            key={friend.friendshipId}
            className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.03] transition-all ${
              isProcessing ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {friend.avatarUrl ? (
                <img
                  src={friend.avatarUrl}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-interactive-500/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-text-secondary">
                    {(friend.displayName || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background-surface ${
                  friend.isOnline ? 'bg-success-main' : 'bg-neutral-600'
                }`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">
                {friend.displayName || 'Unknown'}
              </p>
              <p className="text-micro text-text-tertiary">
                {friend.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onOpenChat(friend.userId, friend.displayName, friend.avatarUrl)}
                className="p-1.5 text-text-tertiary hover:text-interactive-400 rounded-md hover:bg-interactive-600/10 transition-colors"
                title="Message"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              {/* More menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === friend.friendshipId ? null : friend.friendshipId)}
                  className="p-1.5 text-text-tertiary hover:text-text-secondary rounded-md hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {menuOpen === friend.friendshipId && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 top-full mt-1 w-32 bg-background-surface border border-border-subtle rounded-lg shadow-lg z-20 py-1">
                      <button
                        onClick={() => handleRemove(friend.friendshipId, friend.displayName)}
                        disabled={isRemoving}
                        className="w-full px-3 py-1.5 text-left text-micro text-text-secondary hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        {isRemoving ? 'Removing...' : 'Remove Friend'}
                      </button>
                      <button
                        onClick={() => handleBlock(friend.userId, friend.displayName)}
                        disabled={isBlocking}
                        className="w-full px-3 py-1.5 text-left text-micro text-error-main hover:bg-error-main/10 transition-colors disabled:opacity-50"
                      >
                        {isBlocking ? 'Blocking...' : 'Block User'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Skeleton for friend list items.
 */
function FriendItemSkeleton(): JSX.Element {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg">
      <Skeleton width={36} height={36} rounded="full" aria-label="" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-20" aria-label="" />
        <Skeleton className="h-2.5 w-12" aria-label="" />
      </div>
    </div>
  );
}
