/**
 * Messages Hook for AuraStream
 * Manages direct messaging between users
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  Message, Conversation, ConversationListResponse,
  MessageHistoryResponse, LastMessage,
} from '../types/social';

const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000') + '/api/v1';

const getToken = () => apiClient.getAccessToken();
const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Query Keys
export const messagesKeys = {
  all: ['messages'] as const,
  conversations: () => [...messagesKeys.all, 'conversations'] as const,
  history: (userId: string) => [...messagesKeys.all, 'history', userId] as const,
  unreadCount: () => [...messagesKeys.all, 'unread'] as const,
};

// Transform Functions (snake_case to camelCase)
function transformMessage(data: any): Message {
  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    content: data.content,
    createdAt: data.created_at,
    readAt: data.read_at,
  };
}

function transformLastMessage(data: any): LastMessage {
  return {
    id: data.id,
    content: data.content,
    senderId: data.sender_id,
    createdAt: data.created_at,
  };
}

function transformConversation(data: any): Conversation {
  return {
    conversationId: data.conversation_id,
    otherUserId: data.other_user_id,
    otherUserDisplayName: data.other_user_display_name,
    otherUserAvatarUrl: data.other_user_avatar_url,
    isOnline: data.is_online ?? false,
    lastMessage: data.last_message ? transformLastMessage(data.last_message) : null,
    unreadCount: data.unread_count ?? 0,
    updatedAt: data.updated_at,
  };
}

function transformConversationListResponse(data: any): ConversationListResponse {
  return {
    conversations: (data.conversations || []).map(transformConversation),
    totalUnread: data.total_unread ?? 0,
  };
}

function transformMessageHistoryResponse(data: any): MessageHistoryResponse {
  return {
    messages: (data.messages || []).map(transformMessage),
    hasMore: data.has_more ?? false,
    oldestId: data.oldest_id,
  };
}

// Query Hooks
export function useConversations() {
  const token = getToken();
  return useQuery({
    queryKey: messagesKeys.conversations(),
    queryFn: async (): Promise<ConversationListResponse> => {
      const res = await fetch(`${API_BASE}/messages/conversations`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return transformConversationListResponse(await res.json());
    },
    enabled: !!token,
  });
}

export function useMessageHistory(userId: string | null, enabled = true) {
  const token = getToken();
  return useQuery({
    queryKey: messagesKeys.history(userId ?? ''),
    queryFn: async (): Promise<MessageHistoryResponse> => {
      const res = await fetch(`${API_BASE}/messages/${userId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return transformMessageHistoryResponse(await res.json());
    },
    enabled: enabled && !!userId && !!token,
  });
}

export function useUnreadCount() {
  const token = getToken();
  return useQuery({
    queryKey: messagesKeys.unreadCount(),
    queryFn: async (): Promise<number> => {
      const res = await fetch(`${API_BASE}/messages/unread/count`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch unread count');
      const data = await res.json();
      return data.unread_count ?? 0;
    },
    enabled: !!token,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Mutation Hooks
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, content }: { userId: string; content: string }): Promise<Message> => {
      const res = await fetch(`${API_BASE}/messages/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to send message');
      }
      return transformMessage(await res.json());
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: messagesKeys.history(userId) });
      qc.invalidateQueries({ queryKey: messagesKeys.conversations() });
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<{ markedCount: number }> => {
      const res = await fetch(`${API_BASE}/messages/${userId}/read`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      const data = await res.json();
      return { markedCount: data.marked_count ?? 0 };
    },
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: messagesKeys.conversations() });
      qc.invalidateQueries({ queryKey: messagesKeys.unreadCount() });
    },
  });
}

// Load older messages (for infinite scroll)
export function useLoadOlderMessages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, beforeId }: { userId: string; beforeId: string }): Promise<MessageHistoryResponse> => {
      const res = await fetch(
        `${API_BASE}/messages/${userId}?before_id=${beforeId}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error('Failed to load older messages');
      return transformMessageHistoryResponse(await res.json());
    },
    onSuccess: (newData, { userId }) => {
      // Prepend older messages to existing cache
      qc.setQueryData<MessageHistoryResponse>(messagesKeys.history(userId), (old) => {
        if (!old) return newData;
        return {
          messages: [...newData.messages, ...old.messages],
          hasMore: newData.hasMore,
          oldestId: newData.oldestId,
        };
      });
    },
  });
}
