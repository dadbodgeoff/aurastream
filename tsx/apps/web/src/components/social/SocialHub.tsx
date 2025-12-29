'use client';

import { useState, useCallback } from 'react';
import { useUnreadCount } from '@aurastream/api-client/src/hooks/useMessages';
import { useFriendsList } from '@aurastream/api-client/src/hooks/useFriends';
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';
import { FriendsPanel } from './FriendsPanel';
import { MessagesPanel } from './MessagesPanel';
import { ChatWindow } from './ChatWindow';

interface SocialHubProps {
  currentUserId: string;
}

interface ChatTarget {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function SocialHub({ currentUserId }: SocialHubProps) {
  const [friendsPanelOpen, setFriendsPanelOpen] = useState(false);
  const [messagesPanelOpen, setMessagesPanelOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

  const { data: unreadData } = useUnreadCount();
  const { data: friendsData } = useFriendsList();

  const unreadCount = unreadData ?? 0;
  const pendingRequests = friendsData?.pendingRequests?.length ?? 0;

  const handleOpenChat = useCallback((userId: string, displayName: string | null, avatarUrl: string | null) => {
    setChatTarget({ userId, displayName, avatarUrl });
    setFriendsPanelOpen(false);
    setMessagesPanelOpen(false);
  }, []);

  const handleCloseChat = useCallback(() => {
    setChatTarget(null);
  }, []);

  return (
    <>
      {/* Social Buttons */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-2">
        {/* Messages Button */}
        <button
          onClick={() => setMessagesPanelOpen(true)}
          className="relative p-3 bg-background-surface border border-border-subtle rounded-full shadow-lg hover:bg-white/[0.06] transition-colors group"
          title="Messages"
        >
          <svg className="w-5 h-5 text-text-secondary group-hover:text-interactive-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[9px] font-medium text-white bg-interactive-600 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Friends Button */}
        <button
          onClick={() => setFriendsPanelOpen(true)}
          className="relative p-3 bg-background-surface border border-border-subtle rounded-full shadow-lg hover:bg-white/[0.06] transition-colors group"
          title="Friends"
        >
          <svg className="w-5 h-5 text-text-secondary group-hover:text-interactive-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {pendingRequests > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[9px] font-medium text-white bg-accent-500 rounded-full">
              {pendingRequests > 99 ? '99+' : pendingRequests}
            </span>
          )}
        </button>
      </div>

      {/* Panels */}
      <AsyncErrorBoundary resourceName="friends panel">
        <FriendsPanel
          isOpen={friendsPanelOpen}
          onClose={() => setFriendsPanelOpen(false)}
          onOpenChat={handleOpenChat}
        />
      </AsyncErrorBoundary>

      <AsyncErrorBoundary resourceName="messages panel">
        <MessagesPanel
          isOpen={messagesPanelOpen}
          onClose={() => setMessagesPanelOpen(false)}
          onOpenChat={handleOpenChat}
        />
      </AsyncErrorBoundary>

      {/* Chat Window */}
      {chatTarget && (
        <AsyncErrorBoundary resourceName="chat window">
          <ChatWindow
            userId={chatTarget.userId}
            displayName={chatTarget.displayName}
            avatarUrl={chatTarget.avatarUrl}
            currentUserId={currentUserId}
            onClose={handleCloseChat}
          />
        </AsyncErrorBoundary>
      )}
    </>
  );
}
