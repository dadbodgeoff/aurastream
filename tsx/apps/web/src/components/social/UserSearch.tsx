'use client';

import { useState, useCallback } from 'react';
import { useUserSearch, useSendFriendRequest } from '@aurastream/api-client';
import { useDebouncedValue } from '@aurastream/shared/src/hooks/useDebouncedValue';
import { Skeleton } from '@/components/ui/Skeleton';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';
import { ErrorRecovery } from '@/components/ErrorRecovery';

export function UserSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data, isLoading, error, refetch } = useUserSearch(debouncedQuery, debouncedQuery.length >= 2);
  const sendRequest = useSendFriendRequest();
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendingTo, setSendingTo] = useState<Set<string>>(new Set());

  const handleSendRequest = useCallback(async (userId: string, displayName: string | null) => {
    setSendingTo(prev => new Set(prev).add(userId));
    
    try {
      await sendRequest.mutateAsync(userId);
      setSentTo(prev => new Set(prev).add(userId));
      showSuccessToast(`Friend request sent to ${displayName || 'user'}!`);
    } catch (error) {
      showErrorToast(error, {
        onRetry: () => handleSendRequest(userId, displayName),
      });
    } finally {
      setSendingTo(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [sendRequest]);

  const users = data?.users ?? [];

  return (
    <div className="p-3">
      {/* Search Input */}
      <div className="relative mb-3">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by display name..."
          className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-border-subtle rounded-lg text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-interactive-600 transition-colors"
        />
      </div>

      {/* Results */}
      {query.length < 2 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <p className="text-xs text-text-tertiary">Type at least 2 characters to search</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-1">
          <UserSearchSkeleton />
          <UserSearchSkeleton />
          <UserSearchSkeleton />
        </div>
      ) : error ? (
        <ErrorRecovery
          error={error}
          onRetry={() => { refetch(); }}
          variant="card"
          className="mx-2"
        />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <div className="w-10 h-10 rounded-full bg-interactive-600/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-interactive-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-xs text-text-secondary mb-1">No users found</p>
          <p className="text-[10px] text-text-tertiary">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-1">
          {users.map((user) => {
            const isSent = sentTo.has(user.id);
            const isSending = sendingTo.has(user.id);
            const isPending = user.relationshipStatus === 'pending';
            const isFriend = user.relationshipStatus === 'accepted';

            return (
              <div
                key={user.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                {/* Avatar */}
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-interactive-500/20 to-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-text-secondary">
                      {(user.displayName || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {user.displayName || 'Unknown'}
                  </p>
                </div>

                {/* Action */}
                {isFriend ? (
                  <span className="px-2 py-0.5 text-[9px] font-medium text-success-main bg-success-main/10 rounded-full">
                    Friends
                  </span>
                ) : isPending || isSent ? (
                  <span className="px-2 py-0.5 text-[9px] font-medium text-warning-main bg-warning-main/10 rounded-full">
                    Pending
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendRequest(user.id, user.displayName)}
                    disabled={isSending}
                    className="px-2.5 py-1 text-[10px] font-medium text-interactive-300 bg-interactive-600/20 hover:bg-interactive-600/30 rounded-md transition-colors disabled:opacity-50 min-w-[70px] flex items-center justify-center"
                  >
                    {isSending ? (
                      <div className="w-3 h-3 border-2 border-interactive-300/30 border-t-interactive-300 rounded-full animate-spin" />
                    ) : (
                      'Add Friend'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for user search results.
 */
function UserSearchSkeleton(): JSX.Element {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg">
      <Skeleton width={36} height={36} rounded="full" aria-label="" />
      <div className="flex-1">
        <Skeleton className="h-3 w-24" aria-label="" />
      </div>
      <Skeleton className="h-6 w-16" rounded="md" aria-label="" />
    </div>
  );
}
