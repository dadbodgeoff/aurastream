/**
 * Friends Hook for AuraStream
 * Manages friend list, requests, and user search
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  Friend, FriendRequest, FriendsListResponse, UserSearchResponse,
  UserSearchResult, FriendActionResponse, BlockedUser, BlockedUsersListResponse,
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
export const friendsKeys = {
  all: ['friends'] as const,
  list: () => [...friendsKeys.all, 'list'] as const,
  search: (query: string) => [...friendsKeys.all, 'search', query] as const,
  blocked: () => [...friendsKeys.all, 'blocked'] as const,
};

// Transform Functions (snake_case to camelCase)
function transformFriend(data: any): Friend {
  return {
    friendshipId: data.friendship_id,
    userId: data.user_id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    isOnline: data.is_online ?? false,
    createdAt: data.created_at,
  };
}

function transformFriendRequest(data: any): FriendRequest {
  return {
    friendshipId: data.friendship_id,
    userId: data.user_id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
  };
}

function transformFriendsListResponse(data: any): FriendsListResponse {
  return {
    friends: (data.friends || []).map(transformFriend),
    pendingRequests: (data.pending_requests || []).map(transformFriendRequest),
    sentRequests: (data.sent_requests || []).map(transformFriendRequest),
  };
}

function transformUserSearchResult(data: any): UserSearchResult {
  return {
    id: data.id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    relationshipStatus: data.relationship_status,
  };
}

function transformUserSearchResponse(data: any): UserSearchResponse {
  return {
    users: (data.users || []).map(transformUserSearchResult),
    total: data.total,
  };
}

function transformBlockedUser(data: any): BlockedUser {
  return {
    userId: data.user_id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    blockedAt: data.blocked_at,
  };
}

function transformBlockedUsersListResponse(data: any): BlockedUsersListResponse {
  return {
    blockedUsers: (data.blocked_users || []).map(transformBlockedUser),
  };
}

// Query Hooks
export function useFriendsList() {
  const token = getToken();
  return useQuery({
    queryKey: friendsKeys.list(),
    queryFn: async (): Promise<FriendsListResponse> => {
      const res = await fetch(`${API_BASE}/friends`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch friends');
      return transformFriendsListResponse(await res.json());
    },
    enabled: !!token,
  });
}

export function useUserSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: friendsKeys.search(query),
    queryFn: async (): Promise<UserSearchResponse> => {
      const res = await fetch(
        `${API_BASE}/friends/search?q=${encodeURIComponent(query)}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error('Failed to search users');
      return transformUserSearchResponse(await res.json());
    },
    enabled: enabled && query.length >= 2,
  });
}

export function useBlockedUsers() {
  const token = getToken();
  return useQuery({
    queryKey: friendsKeys.blocked(),
    queryFn: async (): Promise<BlockedUsersListResponse> => {
      const res = await fetch(`${API_BASE}/friends/blocked`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch blocked users');
      return transformBlockedUsersListResponse(await res.json());
    },
    enabled: !!token,
  });
}

// Mutation Hooks
export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<FriendActionResponse> => {
      const res = await fetch(`${API_BASE}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to send friend request');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string): Promise<FriendActionResponse> => {
      const res = await fetch(`${API_BASE}/friends/${friendshipId}/accept`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to accept friend request');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string): Promise<FriendActionResponse> => {
      const res = await fetch(`${API_BASE}/friends/${friendshipId}/decline`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to decline friend request');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId: string): Promise<FriendActionResponse> => {
      const res = await fetch(`${API_BASE}/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to remove friend');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<FriendActionResponse> => {
      const res = await fetch(`${API_BASE}/friends/block/${userId}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to block user');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.list() });
      qc.invalidateQueries({ queryKey: friendsKeys.blocked() });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<FriendActionResponse> => {
      const res = await fetch(`${API_BASE}/friends/block/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to unblock user');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: friendsKeys.blocked() });
    },
  });
}
