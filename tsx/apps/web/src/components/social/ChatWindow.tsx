'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMessageHistory, useSendMessage, useMarkAsRead, useLoadOlderMessages } from '@aurastream/api-client/src/hooks/useMessages';

interface ChatWindowProps {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  currentUserId: string;
  onClose: () => void;
}

export function ChatWindow({ userId, displayName, avatarUrl, currentUserId, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const { data, isLoading } = useMessageHistory(userId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const loadOlder = useLoadOlderMessages();

  const messages = data?.messages ?? [];
  const hasMore = data?.hasMore ?? false;

  // Mark as read when opening
  useEffect(() => {
    markAsRead.mutate(userId);
  }, [userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);

    // Load older messages when scrolling to top
    if (scrollTop < 50 && hasMore && !loadOlder.isPending && data?.oldestId) {
      loadOlder.mutate({ userId, beforeId: data.oldestId });
    }
  }, [hasMore, loadOlder, userId, data?.oldestId]);

  const handleSend = async () => {
    if (!message.trim() || sendMessage.isPending) return;
    const content = message.trim();
    setMessage('');
    setIsAtBottom(true);
    await sendMessage.mutateAsync({ userId, content });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg h-[600px] max-h-[80vh] bg-background-surface border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle flex-shrink-0">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-interactive-500/20 to-primary-500/20 flex items-center justify-center">
                <span className="text-sm font-medium text-text-secondary">
                  {(displayName || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-text-primary truncate">
              {displayName || 'Unknown'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary rounded-md hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-interactive-600/30 border-t-interactive-400 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-xs text-text-tertiary">No messages yet</p>
              <p className="text-[10px] text-text-tertiary mt-1">Send a message to start the conversation</p>
            </div>
          ) : (
            <>
              {loadOlder.isPending && (
                <div className="flex justify-center py-2">
                  <div className="w-4 h-4 border-2 border-interactive-600/30 border-t-interactive-400 rounded-full animate-spin" />
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                      msg.senderId === currentUserId
                        ? 'bg-interactive-600/30 text-text-primary rounded-br-md'
                        : 'bg-white/[0.06] text-text-primary rounded-bl-md'
                    }`}
                  >
                    <p className="text-xs whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className="text-[9px] text-text-tertiary mt-1 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border-subtle flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-3 py-2 bg-white/[0.04] border border-border-subtle rounded-xl text-xs text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:border-interactive-600 transition-colors"
              disabled={sendMessage.isPending}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              className="p-2.5 bg-interactive-600/30 text-interactive-300 rounded-xl hover:bg-interactive-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendMessage.isPending ? (
                <div className="w-4 h-4 border-2 border-interactive-300/30 border-t-interactive-300 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
