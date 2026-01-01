'use client';

import { useConversations, useUnreadCount } from '@aurastream/api-client';
import { Skeleton, ProfileSkeleton } from '@/components/ui/Skeleton';
import type { Conversation } from '@aurastream/api-client';

interface MessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (userId: string, displayName: string | null, avatarUrl: string | null) => void;
}

export function MessagesPanel({ isOpen, onClose, onOpenChat }: MessagesPanelProps) {
  const { data, isLoading } = useConversations();
  const { data: unreadCount } = useUnreadCount();

  const conversations = data?.conversations ?? [];
  const totalUnread = unreadCount ?? 0;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-background-surface border-l border-border-subtle transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Messages</h2>
              {totalUnread > 0 && (
                <p className="text-micro text-interactive-400">{totalUnread} unread</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-text-tertiary hover:text-text-primary rounded-md hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 space-y-2">
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-interactive-600/10 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-interactive-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-xs text-text-secondary mb-1">No conversations yet</p>
              <p className="text-micro text-text-tertiary">Start a chat from your friends list</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.conversationId}
                  conversation={conv}
                  formatTime={formatTime}
                  onClick={() => onOpenChat(conv.otherUserId, conv.otherUserDisplayName, conv.otherUserAvatarUrl)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  formatTime: (dateStr: string) => string;
  onClick: () => void;
}

function ConversationItem({ conversation, formatTime, onClick }: ConversationItemProps) {
  const { otherUserDisplayName, otherUserAvatarUrl, lastMessage, unreadCount, updatedAt } = conversation;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {otherUserAvatarUrl ? (
          <img src={otherUserAvatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-interactive-500/20 flex items-center justify-center">
            <span className="text-sm font-medium text-text-secondary">
              {(otherUserDisplayName || '?')[0].toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${unreadCount > 0 ? 'font-semibold text-text-primary' : 'font-medium text-text-primary'}`}>
            {otherUserDisplayName || 'Unknown'}
          </p>
          <span className="text-micro text-text-tertiary flex-shrink-0">
            {formatTime(updatedAt)}
          </span>
        </div>
        {lastMessage && (
          <p className={`text-micro truncate ${unreadCount > 0 ? 'text-text-secondary' : 'text-text-tertiary'}`}>
            {lastMessage.content}
          </p>
        )}
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-micro font-medium text-white bg-interactive-600 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}


/**
 * Skeleton for conversation list items.
 */
function ConversationSkeleton(): JSX.Element {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg">
      <Skeleton width={40} height={40} rounded="full" aria-label="" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24" aria-label="" />
        <Skeleton className="h-2.5 w-32" aria-label="" />
      </div>
      <Skeleton className="h-3 w-10" aria-label="" />
    </div>
  );
}
