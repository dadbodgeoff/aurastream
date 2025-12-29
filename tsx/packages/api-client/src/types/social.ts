/**
 * Social System TypeScript Types
 * Friends & Direct Messaging
 * All properties use camelCase (backend uses snake_case).
 */

// ============================================================================
// Friend Types
// ============================================================================

export interface Friend {
  friendshipId: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  createdAt: string;
}

export interface FriendRequest {
  friendshipId: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface FriendsListResponse {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
}

export interface UserSearchResult {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  relationshipStatus: 'pending' | 'accepted' | 'blocked' | 'none' | null;
}

export interface UserSearchResponse {
  users: UserSearchResult[];
  total: number;
}

export interface FriendActionResponse {
  friendshipId?: string;
  status?: string;
  message: string;
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface LastMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  conversationId: string;
  otherUserId: string;
  otherUserDisplayName: string | null;
  otherUserAvatarUrl: string | null;
  isOnline: boolean;
  lastMessage: LastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  totalUnread: number;
}

export interface MessageHistoryResponse {
  messages: Message[];
  hasMore: boolean;
  oldestId: string | null;
}

// ============================================================================
// Block Types
// ============================================================================

export interface BlockedUser {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  blockedAt: string;
}

export interface BlockedUsersListResponse {
  blockedUsers: BlockedUser[];
}

// ============================================================================
// Request Types
// ============================================================================

export interface SendFriendRequest {
  userId: string;
}

export interface SendMessageRequest {
  content: string;
}
