import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  CommunityPostWithAuthor, CommentWithAuthor, UserSummary, CreatorProfile,
  CommunityUserStats, PaginatedPosts, PaginatedComments, PostFilters, CommentFilters,
  CreatePostRequest, UpdatePostRequest, CreateCommentRequest, UpdateCommentRequest, ReportPostRequest,
} from '../types/community';

// Get the base URL from apiClient's configuration (uses NEXT_PUBLIC_API_URL or localhost:8000)
const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000') + '/api/v1';

// Get token from apiClient (in-memory) for authenticated requests
const getToken = () => apiClient.getAccessToken();
const authHeaders = (token: string | null): Record<string, string> => token ? { Authorization: `Bearer ${token}` } : {};

// Query Keys
export const communityKeys = {
  all: ['community'] as const,
  posts: () => [...communityKeys.all, 'posts'] as const,
  postsList: (filters?: PostFilters) => [...communityKeys.posts(), 'list', filters] as const,
  postDetail: (postId: string) => [...communityKeys.posts(), 'detail', postId] as const,
  featured: () => [...communityKeys.posts(), 'featured'] as const,
  trending: (assetType?: string) => [...communityKeys.posts(), 'trending', assetType] as const,
  search: (query: string) => [...communityKeys.posts(), 'search', query] as const,
  myPosts: () => [...communityKeys.posts(), 'mine'] as const,
  likedPosts: () => [...communityKeys.posts(), 'liked'] as const,
  followingFeed: () => [...communityKeys.posts(), 'following'] as const,
  comments: (postId: string) => [...communityKeys.all, 'comments', postId] as const,
  profile: (userId: string) => [...communityKeys.all, 'profile', userId] as const,
  followers: (userId: string) => [...communityKeys.all, 'followers', userId] as const,
  following: (userId: string) => [...communityKeys.all, 'following', userId] as const,
  spotlightCreators: () => [...communityKeys.all, 'spotlight'] as const,
};

// Transform Functions (snake_case to camelCase)
export function transformUserSummary(data: any): UserSummary {
  return { id: data.id, displayName: data.display_name, avatarUrl: data.avatar_url };
}

export function transformPost(data: any): CommunityPostWithAuthor {
  return {
    id: data.id, userId: data.user_id, assetId: data.asset_id, title: data.title,
    description: data.description, promptUsed: data.prompt_used, showPrompt: data.show_prompt,
    tags: data.tags || [], assetType: data.asset_type, assetUrl: data.asset_url,
    likeCount: data.like_count, commentCount: data.comment_count, viewCount: data.view_count,
    isFeatured: data.is_featured, inspiredByPostId: data.inspired_by_post_id,
    createdAt: data.created_at, updatedAt: data.updated_at,
    author: transformUserSummary(data.author), isLiked: data.is_liked ?? false,
  };
}

export function transformComment(data: any): CommentWithAuthor {
  return {
    id: data.id, postId: data.post_id, userId: data.user_id, content: data.content,
    isEdited: data.is_edited, createdAt: data.created_at, updatedAt: data.updated_at,
    author: transformUserSummary(data.author), canEdit: data.can_edit, canDelete: data.can_delete,
  };
}

function transformStats(data: any): CommunityUserStats {
  return {
    userId: data.user_id, postCount: data.post_count, totalLikesReceived: data.total_likes_received,
    followerCount: data.follower_count, followingCount: data.following_count, isBanned: data.is_banned,
  };
}

export function transformProfile(data: any): CreatorProfile {
  return {
    user: transformUserSummary(data.user), stats: transformStats(data.stats),
    isFollowing: data.is_following ?? false, joinedAt: data.joined_at,
  };
}

function transformPaginatedPosts(data: any): PaginatedPosts {
  return {
    items: (data.items || []).map(transformPost), total: data.total, page: data.page,
    limit: data.limit, hasMore: data.has_more ?? data.page * data.limit < data.total,
  };
}

function transformPaginatedComments(data: any): PaginatedComments {
  return {
    items: (data.items || []).map(transformComment), total: data.total, page: data.page,
    limit: data.limit, hasMore: data.has_more ?? data.page * data.limit < data.total,
  };
}

function buildPostParams(filters?: PostFilters): string {
  const p = new URLSearchParams();
  if (filters?.page) p.set('page', String(filters.page));
  if (filters?.limit) p.set('limit', String(filters.limit));
  if (filters?.sort) p.set('sort', filters.sort);
  if (filters?.assetType) p.set('asset_type', filters.assetType);
  if (filters?.tags?.length) p.set('tags', filters.tags.join(','));
  if (filters?.userId) p.set('user_id', filters.userId);
  if (filters?.search) p.set('search', filters.search);
  return p.toString() ? `?${p}` : '';
}

// Query Hooks
export function useCommunityPosts(filters?: PostFilters) {
  return useQuery({
    queryKey: communityKeys.postsList(filters),
    queryFn: async (): Promise<PaginatedPosts> => {
      const res = await fetch(`${API_BASE}/community/posts${buildPostParams(filters)}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch community posts');
      return transformPaginatedPosts(await res.json());
    },
  });
}

export function useCommunityPost(postId: string | undefined) {
  return useQuery({
    queryKey: communityKeys.postDetail(postId ?? ''),
    queryFn: async (): Promise<CommunityPostWithAuthor> => {
      const res = await fetch(`${API_BASE}/community/posts/${postId}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch post');
      return transformPost(await res.json());
    },
    enabled: !!postId,
  });
}

export function useFeaturedPosts(limit?: number) {
  return useQuery({
    queryKey: communityKeys.featured(),
    queryFn: async (): Promise<CommunityPostWithAuthor[]> => {
      const res = await fetch(`${API_BASE}/community/posts/featured${limit ? `?limit=${limit}` : ''}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch featured posts');
      const data = await res.json();
      return (data.items || data).map(transformPost);
    },
  });
}

export function useTrendingPosts(assetType?: string, limit?: number) {
  return useQuery({
    queryKey: communityKeys.trending(assetType),
    queryFn: async (): Promise<CommunityPostWithAuthor[]> => {
      const p = new URLSearchParams();
      if (assetType) p.set('asset_type', assetType);
      if (limit) p.set('limit', String(limit));
      const res = await fetch(`${API_BASE}/community/posts/trending${p.toString() ? `?${p}` : ''}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch trending posts');
      const data = await res.json();
      return (data.items || data).map(transformPost);
    },
  });
}

export function useSearchPosts(query: string, page?: number) {
  return useQuery({
    queryKey: communityKeys.search(query),
    queryFn: async (): Promise<PaginatedPosts> => {
      const p = new URLSearchParams({ q: query });
      if (page) p.set('page', String(page));
      const res = await fetch(`${API_BASE}/community/posts/search?${p}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to search posts');
      return transformPaginatedPosts(await res.json());
    },
    enabled: query.length > 0,
  });
}

export function useMyPosts(page?: number) {
  return useQuery({
    queryKey: communityKeys.myPosts(),
    queryFn: async (): Promise<PaginatedPosts> => {
      const res = await fetch(`${API_BASE}/community/posts/mine${page ? `?page=${page}` : ''}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to fetch my posts');
      return transformPaginatedPosts(await res.json());
    },
  });
}

export function useLikedPosts(page?: number) {
  return useQuery({
    queryKey: communityKeys.likedPosts(),
    queryFn: async (): Promise<PaginatedPosts> => {
      const res = await fetch(`${API_BASE}/community/posts/liked${page ? `?page=${page}` : ''}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to fetch liked posts');
      return transformPaginatedPosts(await res.json());
    },
  });
}

export function useFollowingFeed(page?: number) {
  return useQuery({
    queryKey: communityKeys.followingFeed(),
    queryFn: async (): Promise<PaginatedPosts> => {
      const res = await fetch(`${API_BASE}/community/posts/following${page ? `?page=${page}` : ''}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to fetch following feed');
      return transformPaginatedPosts(await res.json());
    },
  });
}

export function useComments(postId: string | undefined, filters?: CommentFilters) {
  return useQuery({
    queryKey: communityKeys.comments(postId ?? ''),
    queryFn: async (): Promise<PaginatedComments> => {
      const p = new URLSearchParams();
      if (filters?.page) p.set('page', String(filters.page));
      if (filters?.limit) p.set('limit', String(filters.limit));
      const res = await fetch(`${API_BASE}/community/posts/${postId}/comments${p.toString() ? `?${p}` : ''}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch comments');
      return transformPaginatedComments(await res.json());
    },
    enabled: !!postId,
  });
}

export function useCreatorProfile(userId: string | undefined, viewerId?: string) {
  return useQuery({
    queryKey: communityKeys.profile(userId ?? ''),
    queryFn: async (): Promise<CreatorProfile> => {
      const res = await fetch(`${API_BASE}/community/users/${userId}${viewerId ? `?viewer_id=${viewerId}` : ''}`, { headers: authHeaders(getToken()) });
      if (!res.ok) throw new Error('Failed to fetch creator profile');
      return transformProfile(await res.json());
    },
    enabled: !!userId,
  });
}

// Mutation Hooks
export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePostRequest): Promise<CommunityPostWithAuthor> => {
      return apiClient.community.createPost({
        assetId: data.assetId,
        title: data.title,
        description: data.description,
        tags: data.tags,
        showPrompt: data.showPrompt,
        inspiredByPostId: data.inspiredByPostId,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: communityKeys.posts() }); qc.invalidateQueries({ queryKey: communityKeys.myPosts() }); },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: UpdatePostRequest }): Promise<CommunityPostWithAuthor> => {
      return apiClient.community.updatePost(postId, {
        title: data.title,
        description: data.description,
        tags: data.tags,
        showPrompt: data.showPrompt,
      });
    },
    onSuccess: (_, { postId }) => { qc.invalidateQueries({ queryKey: communityKeys.postDetail(postId) }); qc.invalidateQueries({ queryKey: communityKeys.posts() }); },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string): Promise<void> => {
      return apiClient.community.deletePost(postId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: communityKeys.posts() }); qc.invalidateQueries({ queryKey: communityKeys.myPosts() }); },
  });
}

export function useLikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string): Promise<void> => {
      return apiClient.community.likePost(postId);
    },
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: communityKeys.postDetail(postId) });
      const prev = qc.getQueryData<CommunityPostWithAuthor>(communityKeys.postDetail(postId));
      if (prev) qc.setQueryData(communityKeys.postDetail(postId), { ...prev, isLiked: true, likeCount: prev.likeCount + 1 });
      return { prev };
    },
    onError: (_, postId, ctx) => { if (ctx?.prev) qc.setQueryData(communityKeys.postDetail(postId), ctx.prev); },
    onSettled: (_, __, postId) => { qc.invalidateQueries({ queryKey: communityKeys.postDetail(postId) }); },
  });
}

export function useUnlikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string): Promise<void> => {
      return apiClient.community.unlikePost(postId);
    },
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: communityKeys.postDetail(postId) });
      const prev = qc.getQueryData<CommunityPostWithAuthor>(communityKeys.postDetail(postId));
      if (prev) qc.setQueryData(communityKeys.postDetail(postId), { ...prev, isLiked: false, likeCount: Math.max(0, prev.likeCount - 1) });
      return { prev };
    },
    onError: (_, postId, ctx) => { if (ctx?.prev) qc.setQueryData(communityKeys.postDetail(postId), ctx.prev); },
    onSettled: (_, __, postId) => { qc.invalidateQueries({ queryKey: communityKeys.postDetail(postId) }); },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: CreateCommentRequest }): Promise<CommentWithAuthor> => {
      const res = await fetch(`${API_BASE}/community/posts/${postId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ content: data.content }),
      });
      if (!res.ok) throw new Error('Failed to create comment');
      return transformComment(await res.json());
    },
    onSuccess: (_, { postId }) => { qc.invalidateQueries({ queryKey: communityKeys.comments(postId) }); qc.invalidateQueries({ queryKey: communityKeys.postDetail(postId) }); },
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, postId, data }: { commentId: string; postId: string; data: UpdateCommentRequest }): Promise<CommentWithAuthor> => {
      const res = await fetch(`${API_BASE}/community/comments/${commentId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ content: data.content }),
      });
      if (!res.ok) throw new Error('Failed to update comment');
      return transformComment(await res.json());
    },
    onSuccess: (_, { postId }) => { qc.invalidateQueries({ queryKey: communityKeys.comments(postId) }); },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }): Promise<void> => {
      const res = await fetch(`${API_BASE}/community/comments/${commentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to delete comment');
    },
    onSuccess: (_, { postId }) => { qc.invalidateQueries({ queryKey: communityKeys.comments(postId) }); qc.invalidateQueries({ queryKey: communityKeys.postDetail(postId) }); },
  });
}

export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/community/users/${userId}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to follow user');
    },
    onSuccess: (_, userId) => { qc.invalidateQueries({ queryKey: communityKeys.profile(userId) }); qc.invalidateQueries({ queryKey: communityKeys.followingFeed() }); },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/community/users/${userId}/follow`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to unfollow user');
    },
    onSuccess: (_, userId) => { qc.invalidateQueries({ queryKey: communityKeys.profile(userId) }); qc.invalidateQueries({ queryKey: communityKeys.followingFeed() }); },
  });
}

export function useReportPost() {
  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: ReportPostRequest }): Promise<void> => {
      const res = await fetch(`${API_BASE}/community/posts/${postId}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ reason: data.reason, details: data.details }),
      });
      if (!res.ok) throw new Error('Failed to report post');
    },
  });
}

// Spotlight Creators Types
export interface SpotlightCreator {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  recentAssets: { id: string; url: string; type: string }[];
}

function transformSpotlightCreator(data: any): SpotlightCreator {
  return {
    id: data.id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    followerCount: data.follower_count ?? 0,
    followingCount: data.following_count ?? 0,
    isFollowing: data.is_following ?? false,
    recentAssets: (data.recent_assets || []).map((a: any) => ({
      id: a.id,
      url: a.url,
      type: a.type || a.asset_type,
    })),
  };
}

export function useSpotlightCreators(limit?: number) {
  return useQuery({
    queryKey: communityKeys.spotlightCreators(),
    queryFn: async (): Promise<SpotlightCreator[]> => {
      const res = await fetch(
        `${API_BASE}/community/creators/spotlight${limit ? `?limit=${limit}` : ''}`,
        { headers: authHeaders(getToken()) }
      );
      if (!res.ok) throw new Error('Failed to fetch spotlight creators');
      const data = await res.json();
      return (data.items || data).map(transformSpotlightCreator);
    },
  });
}
