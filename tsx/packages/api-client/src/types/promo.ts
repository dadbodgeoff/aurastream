/**
 * Promo Board TypeScript Types
 * All properties use camelCase (backend uses snake_case).
 */

// Enums / Literal Types
export type PromoPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type SubscriptionTier = 'free' | 'pro' | 'studio' | 'unlimited';

// Request Types
/** Request body for creating a promo checkout session. */
export interface PromoCheckoutRequest {
  content: string;
  linkUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

// Response Types
/** Response from creating a promo checkout session. */
export interface PromoCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  pendingMessageId: string;
}

// User Badge Types
/** User badges for display in promo messages. */
export interface UserBadges {
  tier: SubscriptionTier;
  isKing: boolean;
  isTopTen: boolean;
  isVerified: boolean;
  messageCountBadge: number | null;
}

// Author Types
/** Promo message author info. */
export interface PromoMessageAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  badges: UserBadges;
}

// Link Preview Types
/** Link preview metadata for promo messages. */
export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

// Message Types
/** Promo message response. */
export interface PromoMessage {
  id: string;
  author: PromoMessageAuthor;
  content: string;
  linkUrl: string | null;
  linkPreview: LinkPreview | null;
  isPinned: boolean;
  reactions: Record<string, number>;
  createdAt: string;
  expiresAt: string | null;
}

/** Paginated promo messages list response. */
export interface PromoMessagesListResponse {
  messages: PromoMessage[];
  pinnedMessage: PromoMessage | null;
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

// Leaderboard Types
/** Single entry in the promo leaderboard. */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalDonationsCents: number;
  messageCount: number;
  isKing: boolean;
}

/** Leaderboard response with entries and current user info. */
export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  currentUserTotal: number | null;
  updatedAt: string;
}
