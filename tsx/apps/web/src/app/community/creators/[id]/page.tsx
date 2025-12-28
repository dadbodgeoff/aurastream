'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@aurastream/shared';
import {
  useCreatorProfile,
  useCommunityPosts,
  useFollowUser,
  useUnfollowUser,
  useLikePost,
  useUnlikePost,
} from '@aurastream/api-client';
import { FollowButton, PostGrid } from '@/components/community';

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="h-5 w-32 bg-background-elevated rounded animate-pulse mb-8" />
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
          <div className="w-24 h-24 rounded-full bg-background-elevated animate-pulse" />
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="h-8 w-48 bg-background-elevated rounded animate-pulse mx-auto sm:mx-0" />
            <div className="h-4 w-32 bg-background-elevated rounded animate-pulse mx-auto sm:mx-0" />
            <div className="flex justify-center sm:justify-start gap-6 mt-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 w-16 bg-background-elevated rounded animate-pulse" />)}
            </div>
          </div>
        </div>
        <div className="h-6 w-24 bg-background-elevated rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border-subtle overflow-hidden bg-background-surface animate-pulse">
              <div className="aspect-square bg-background-elevated" />
              <div className="p-4 space-y-3"><div className="h-5 bg-background-elevated rounded w-3/4" /><div className="h-4 bg-background-elevated rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-background-base flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-background-elevated flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
            <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Creator Not Found</h1>
        <p className="text-text-muted mb-6">This creator profile doesn't exist or has been removed.</p>
        <Link href="/community" className="inline-flex items-center gap-2 text-interactive-500 hover:text-interactive-600 font-medium">← Back to Community</Link>
      </div>
    </div>
  );
}

const StatItem = ({ label, value }: { label: string; value: number }) => (
  <div className="text-center">
    <div className="text-xl font-bold text-text-primary">{value.toLocaleString()}</div>
    <div className="text-sm text-text-muted">{label}</div>
  </div>
);

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useCreatorProfile(userId);
  const { data: postsData, isLoading: postsLoading } = useCommunityPosts({ userId });

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();

  const isOwnProfile = user?.id === userId;
  const isFollowLoading = followMutation.isPending || unfollowMutation.isPending;

  const handleFollowToggle = () => {
    if (!profile) return;
    profile.isFollowing ? unfollowMutation.mutate(userId) : followMutation.mutate(userId);
  };

  const handlePostClick = (postId: string) => router.push(`/community/${postId}`);
  const handleAuthorClick = (authorId: string) => router.push(`/community/creators/${authorId}`);
  const handleLike = (postId: string, isLiked: boolean) => isLiked ? unlikeMutation.mutate(postId) : likeMutation.mutate(postId);

  if (profileLoading) return <ProfileSkeleton />;
  if (!profile) return <NotFound />;

  const posts = postsData?.items ?? [];

  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/community" className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Community
        </Link>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
          {/* Avatar */}
          {profile.user.avatarUrl ? (
            <img src={profile.user.avatarUrl} alt={profile.user.displayName} className="w-24 h-24 rounded-full object-cover border-4 border-background-elevated" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-interactive-600/20 flex items-center justify-center text-3xl font-bold text-interactive-600 border-4 border-background-elevated">
              {profile.user.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-text-primary mb-1">{profile.user.displayName}</h1>
            <p className="text-sm text-text-muted mb-4">
              Joined {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            {/* Stats */}
            <div className="flex justify-center sm:justify-start gap-8 mb-4">
              <StatItem label="Posts" value={profile.stats.postCount} />
              <StatItem label="Likes" value={profile.stats.totalLikesReceived} />
              <StatItem label="Followers" value={profile.stats.followerCount} />
              <StatItem label="Following" value={profile.stats.followingCount} />
            </div>

            {/* Follow Button */}
            {!isOwnProfile && user && (
              <FollowButton isFollowing={profile.isFollowing} onToggle={handleFollowToggle} isLoading={isFollowLoading} />
            )}
          </div>
        </div>

        {/* Posts Section */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-6">
            {isOwnProfile ? 'Your Posts' : `${profile.user.displayName}'s Posts`}
          </h2>
          <PostGrid
            posts={posts.map((post) => ({
              id: post.id,
              title: post.title,
              assetUrl: post.assetUrl,
              assetType: post.assetType,
              author: post.author,
              likeCount: post.likeCount,
              commentCount: post.commentCount,
              tags: post.tags,
              isFeatured: post.isFeatured,
              isLiked: post.isLiked,
            }))}
            onPostClick={handlePostClick}
            onLike={(postId) => {
              const post = posts.find((p) => p.id === postId);
              if (post) handleLike(postId, post.isLiked);
            }}
            onAuthorClick={handleAuthorClick}
            isLoading={postsLoading}
            emptyMessage={isOwnProfile ? "You haven't shared any posts yet." : "This creator hasn't shared any posts yet."}
          />
        </section>
      </div>
    </div>
  );
}
