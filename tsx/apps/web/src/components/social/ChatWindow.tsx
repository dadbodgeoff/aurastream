'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMessageHistory, useSendMessage, useMarkAsRead, useLoadOlderMessages } from '@aurastream/api-client';
import { Skeleton } from '@/components/ui/Skeleton';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';
import { useErrorRecovery } from '@/components/ErrorRecovery';

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
  const [failedMessages, setFailedMessages] = useState<Map<string, string>>(new Map());
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set());

  const { data, isLoading, error: historyError, refetch } = useMessageHistory(userId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const loadOlder = useLoadOlderMessages();
  const { executeWithRetry } = useErrorRecovery({ showToast: false });

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
    const tempId = `temp-${Date.now()}`;
    
    setMessage('');
    setIsAtBottom(true);
    setPendingMessages(prev => new Set(prev).add(tempId));
    
    try {
      await executeWithRetry(async () => {
        await sendMessage.mutateAsync({ userId, content });
      });
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    } catch (error) {
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      setFailedMessages(prev => new Map(prev).set(tempId, content));
      showErrorToast(error, {
        onRetry: () => handleRetryMessage(tempId, content),
      });
    }
  };

  const handleRetryMessage = async (tempId: string, content: string) => {
    setFailedMessages(prev => {
      const next = new Map(prev);
      next.delete(tempId);
      return next;
    });
    setPendingMessages(prev => new Set(prev).add(tempId));
    
    try {
      await executeWithRetry(async () => {
        await sendMessage.mutateAsync({ userId, content });
      });
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      showSuccessToast('Message sent');
    } catch (error) {
      setPendingMessages(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      setFailedMessages(prev => new Map(prev).set(tempId, content));
      showErrorToast(error);
    }
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
              <div className="w-10 h-10 rounded-full bg-interactive-500/20 flex items-center justify-center">
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
            <div className="space-y-3 py-4">
              <MessageSkeleton isUser={false} />
              <MessageSkeleton isUser={true} />
              <MessageSkeleton isUser={false} />
              <MessageSkeleton isUser={true} />
            </div>
          ) : historyError ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-xs text-text-secondary mb-2">Failed to load messages</p>
              <button
                onClick={() => refetch()}
                className="text-micro text-interactive-400 hover:text-interactive-300 underline"
              >
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-xs text-text-tertiary">No messages yet</p>
              <p className="text-micro text-text-tertiary mt-1">Send a message to start the conversation</p>
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
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p className="text-micro text-text-tertiary">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {msg.senderId === currentUserId && (
                        <MessageStatus status={msg.readAt ? 'read' : 'delivered'} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Failed messages with retry */}
              {Array.from(failedMessages.entries()).map(([tempId, content]) => (
                <div key={tempId} className="flex justify-end">
                  <div className="max-w-[75%] px-3 py-2 rounded-2xl bg-red-500/20 text-text-primary rounded-br-md border border-red-500/30">
                    <p className="text-xs whitespace-pre-wrap break-words">{content}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className="text-micro text-red-400">Failed to send</span>
                      <button
                        onClick={() => handleRetryMessage(tempId, content)}
                        className="text-micro text-red-400 hover:text-red-300 underline"
                      >
                        Retry
                      </button>
                    </div>
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

/**
 * Message skeleton for loading state.
 */
function MessageSkeleton({ isUser }: { isUser: boolean }): JSX.Element {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        <Skeleton 
          className={`h-12 ${isUser ? 'w-40' : 'w-48'}`} 
          rounded="xl" 
          aria-label="" 
        />
        <Skeleton className="h-2 w-12" aria-label="" />
      </div>
    </div>
  );
}

/**
 * Message delivery status indicator.
 */
function MessageStatus({ status }: { status: 'sending' | 'delivered' | 'read' | 'failed' }): JSX.Element {
  switch (status) {
    case 'sending':
      return (
        <div className="w-3 h-3 border border-text-tertiary/50 border-t-text-tertiary rounded-full animate-spin" />
      );
    case 'delivered':
      return (
        <svg className="w-3 h-3 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'read':
      return (
        <svg className="w-3 h-3 text-interactive-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'failed':
      return (
        <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
  }
}
