/**
 * Community Gallery TypeScript Types
 * All properties use camelCase (backend uses snake_case).
 */

// Enums / Literal Types
export type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'harassment' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';
export type PostSortOption = 'trending' | 'recent' | 'most_liked';

// User Summary
/** Minimal user info for display in posts and comments. */
export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

// Post Types
/** Basic community post response. */
export interface CommunityPost {
  id: string;
  userId: string;
  assetId: string;
  title: string;
  description: string | null;
  promptUsed: string | null;
  showPrompt: boolean;
  tags: string[];
  assetType: string;
  assetUrl: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isFeatured: boolean;
  inspiredByPostId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Post with author info for display. */
export interface CommunityPostWithAuthor extends CommunityPost {
  author: UserSummary;
  isLiked: boolean;
}

// Comment Types
/** Comment response. */
export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Comment with author info. */
export interface CommentWithAuthor extends CommunityComment {
  author: UserSummary;
  canEdit?: boolean;
  canDelete?: boolean;
}

// User Stats & Profile Types
/** User's community statistics. */
export interface CommunityUserStats {
  userId: string;
  postCount: number;
  totalLikesReceived: number;
  followerCount: number;
  followingCount: number;
  isBanned?: boolean;
}

/** Full creator profile. */
export interface CreatorProfile {
  user: UserSummary;
  stats: CommunityUserStats;
  isFollowing: boolean;
  joinedAt: string;
}

// Pagination
/** Generic paginated response. */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Convenience type aliases
export type PaginatedPosts = PaginatedResponse<CommunityPostWithAuthor>;
export type PaginatedComments = PaginatedResponse<CommentWithAuthor>;
export type PaginatedUsers = PaginatedResponse<UserSummary>;

// Request Types
/** Request body for sharing an asset to community. */
export interface CreatePostRequest {
  assetId: string;
  title: string;
  description?: string;
  tags?: string[];
  showPrompt?: boolean;
  inspiredByPostId?: string;
}

/** Request body for updating a post. */
export interface UpdatePostRequest {
  title?: string;
  description?: string;
  tags?: string[];
  showPrompt?: boolean;
}

/** Request body for adding a comment. */
export interface CreateCommentRequest {
  content: string;
}

/** Request body for editing a comment. */
export interface UpdateCommentRequest {
  content: string;
}

/** Request body for reporting a post. */
export interface ReportPostRequest {
  reason: ReportReason;
  details?: string;
}

// Filter Types
/** Query parameters for listing posts. */
export interface PostFilters {
  page?: number;
  limit?: number;
  sort?: PostSortOption;
  assetType?: string;
  tags?: string[];
  userId?: string;
  search?: string;
}

/** Query parameters for listing comments. */
export interface CommentFilters {
  page?: number;
  limit?: number;
}

// Report Types (for admin)
/** Report response. */
export interface Report {
  id: string;
  postId: string;
  reporterId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** Admin request for reviewing a report. */
export interface ReviewReportRequest {
  status: 'reviewed' | 'dismissed' | 'actioned';
  hidePost?: boolean;
}

export type PaginatedReports = PaginatedResponse<Report>;
