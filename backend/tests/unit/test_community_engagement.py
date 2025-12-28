"""
Unit tests for the Community Engagement Service.
Tests: likes, comments, follows, and creator profiles.
"""

import pytest
from unittest.mock import MagicMock
from datetime import datetime, timezone, timedelta

from backend.services.community_engagement_service import (
    CommunityEngagementService, COMMENT_EDIT_WINDOW_MINUTES,
)
from backend.services.exceptions import (
    CommunityPostNotFoundError, CommunityCommentNotOwnedError,
    CommunityEditWindowExpiredError, CommunitySelfFollowError,
)
from backend.api.schemas.community import CreateCommentRequest, UpdateCommentRequest


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_supabase():
    return MagicMock()


@pytest.fixture
def service(mock_supabase):
    return CommunityEngagementService(supabase_client=mock_supabase)


@pytest.fixture
def user_id():
    return "user-uuid-123"


@pytest.fixture
def post_id():
    return "post-uuid-456"


@pytest.fixture
def comment_id():
    return "comment-uuid-789"


def make_eq_chain(mock_supabase, execute_results):
    """Helper to setup mock chain for .select().eq().eq().execute() patterns."""
    select_mock = MagicMock()
    eq_mock = MagicMock()
    eq_mock.eq.return_value = eq_mock
    select_mock.eq.return_value = eq_mock
    mock_supabase.table.return_value.select.return_value = select_mock
    eq_mock.execute.side_effect = execute_results
    return eq_mock


def make_delete_chain(mock_supabase):
    """Helper to setup mock chain for .delete().eq().eq().execute() patterns."""
    delete_mock = MagicMock()
    eq_mock = MagicMock()
    eq_mock.eq.return_value = eq_mock
    delete_mock.eq.return_value = eq_mock
    mock_supabase.table.return_value.delete.return_value = delete_mock
    eq_mock.execute.return_value = MagicMock(data=[])
    mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# =============================================================================
# Likes Tests
# =============================================================================

class TestLikes:
    @pytest.mark.asyncio
    async def test_like_post_success(self, service, mock_supabase, user_id, post_id):
        """Test successfully liking a post."""
        make_eq_chain(mock_supabase, [
            MagicMock(data=[]),  # User not banned
            MagicMock(data=[{"id": post_id}]),  # Post exists
            MagicMock(data=[]),  # No existing like
        ])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])

        await service.like_post(user_id, post_id)
        mock_supabase.table.return_value.insert.assert_called()

    @pytest.mark.asyncio
    async def test_like_post_idempotent(self, service, mock_supabase, user_id, post_id):
        """Test that liking twice doesn't error (idempotent)."""
        make_eq_chain(mock_supabase, [
            MagicMock(data=[]),  # User not banned
            MagicMock(data=[{"id": post_id}]),  # Post exists
            MagicMock(data=[{"id": "existing-like"}]),  # Already liked
        ])
        await service.like_post(user_id, post_id)
        mock_supabase.table.return_value.insert.assert_not_called()

    @pytest.mark.asyncio
    async def test_like_post_not_found(self, service, mock_supabase, user_id, post_id):
        """Test liking non-existent post raises CommunityPostNotFoundError."""
        make_eq_chain(mock_supabase, [MagicMock(data=[]), MagicMock(data=[])])
        with pytest.raises(CommunityPostNotFoundError):
            await service.like_post(user_id, post_id)

    @pytest.mark.asyncio
    async def test_unlike_post_success(self, service, mock_supabase, user_id, post_id):
        """Test successfully unliking a post."""
        make_delete_chain(mock_supabase)
        await service.unlike_post(user_id, post_id)
        mock_supabase.table.return_value.delete.assert_called()


# =============================================================================
# Comments Tests
# =============================================================================

class TestComments:
    @pytest.mark.asyncio
    async def test_create_comment_success(self, service, mock_supabase, user_id, post_id):
        """Test successfully creating a comment."""
        comment_row = {"id": "c1", "post_id": post_id, "user_id": user_id,
                       "content": "Test", "is_edited": False, "created_at": now_iso(), "updated_at": now_iso()}
        user_row = {"id": user_id, "display_name": "TestUser", "avatar_url": None}
        make_eq_chain(mock_supabase, [MagicMock(data=[]), MagicMock(data=[{"id": post_id}]), MagicMock(data=[user_row])])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[comment_row])
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])

        result = await service.create_comment(user_id, post_id, CreateCommentRequest(content="Test"))
        assert result.content == "Test"
        assert result.post_id == post_id

    @pytest.mark.asyncio
    async def test_create_comment_post_not_found(self, service, mock_supabase, user_id, post_id):
        """Test creating comment on non-existent post raises error."""
        make_eq_chain(mock_supabase, [MagicMock(data=[]), MagicMock(data=[])])
        with pytest.raises(CommunityPostNotFoundError):
            await service.create_comment(user_id, post_id, CreateCommentRequest(content="Test"))

    @pytest.mark.asyncio
    async def test_edit_comment_success(self, service, mock_supabase, user_id, comment_id):
        """Test editing a comment within the edit window."""
        comment_row = {"id": comment_id, "post_id": "p1", "user_id": user_id,
                       "content": "Old", "is_edited": False, "created_at": now_iso(), "updated_at": now_iso()}
        user_row = {"id": user_id, "display_name": "TestUser", "avatar_url": None}
        make_eq_chain(mock_supabase, [MagicMock(data=[]), MagicMock(data=[comment_row]), MagicMock(data=[user_row])])
        updated = {**comment_row, "content": "New", "is_edited": True}
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[updated])

        result = await service.edit_comment(user_id, comment_id, UpdateCommentRequest(content="New"))
        assert result.content == "New"
        assert result.is_edited is True

    @pytest.mark.asyncio
    async def test_edit_comment_window_expired(self, service, mock_supabase, user_id, comment_id):
        """Test editing after window raises CommunityEditWindowExpiredError."""
        old_time = (datetime.now(timezone.utc) - timedelta(minutes=COMMENT_EDIT_WINDOW_MINUTES + 5)).isoformat().replace("+00:00", "Z")
        comment_row = {"id": comment_id, "post_id": "p1", "user_id": user_id,
                       "content": "Old", "is_edited": False, "created_at": old_time, "updated_at": old_time}
        make_eq_chain(mock_supabase, [MagicMock(data=[]), MagicMock(data=[comment_row])])

        with pytest.raises(CommunityEditWindowExpiredError):
            await service.edit_comment(user_id, comment_id, UpdateCommentRequest(content="New"))

    @pytest.mark.asyncio
    async def test_edit_comment_not_owned(self, service, mock_supabase, user_id, comment_id):
        """Test editing another user's comment raises CommunityCommentNotOwnedError."""
        comment_row = {"id": comment_id, "post_id": "p1", "user_id": "other-user",
                       "content": "Old", "is_edited": False, "created_at": now_iso(), "updated_at": now_iso()}
        make_eq_chain(mock_supabase, [MagicMock(data=[]), MagicMock(data=[comment_row])])

        with pytest.raises(CommunityCommentNotOwnedError):
            await service.edit_comment(user_id, comment_id, UpdateCommentRequest(content="New"))

    @pytest.mark.asyncio
    async def test_delete_comment_by_owner(self, service, mock_supabase, user_id, comment_id):
        """Test comment owner can delete their comment."""
        comment_row = {"id": comment_id, "post_id": "p1", "user_id": user_id,
                       "content": "Test", "community_posts": {"user_id": "post-owner"}}
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[comment_row])
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])

        await service.delete_comment(user_id, comment_id)
        mock_supabase.table.return_value.delete.assert_called()

    @pytest.mark.asyncio
    async def test_delete_comment_by_post_owner(self, service, mock_supabase, comment_id):
        """Test post owner can delete any comment on their post."""
        post_owner = "post-owner-uuid"
        comment_row = {"id": comment_id, "post_id": "p1", "user_id": "comment-author",
                       "content": "Test", "community_posts": {"user_id": post_owner}}
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[comment_row])
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])

        await service.delete_comment(post_owner, comment_id)
        mock_supabase.table.return_value.delete.assert_called()


# =============================================================================
# Follows Tests
# =============================================================================

class TestFollows:
    @pytest.mark.asyncio
    async def test_follow_user_success(self, service, mock_supabase, user_id):
        """Test successfully following a user."""
        following_id = "user-to-follow"
        make_eq_chain(mock_supabase, [
            MagicMock(data=[]),  # Not banned
            MagicMock(data=[]),  # Not already following
            MagicMock(data=[]),  # Follower stats
            MagicMock(data=[]),  # Following stats
        ])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{"user_id": user_id}])
        mock_supabase.rpc.return_value.execute.return_value = MagicMock(data=[])

        await service.follow_user(user_id, following_id)
        mock_supabase.table.return_value.insert.assert_called()

    @pytest.mark.asyncio
    async def test_follow_self_error(self, service, mock_supabase, user_id):
        """Test following yourself raises CommunitySelfFollowError."""
        with pytest.raises(CommunitySelfFollowError):
            await service.follow_user(user_id, user_id)

    @pytest.mark.asyncio
    async def test_unfollow_user_success(self, service, mock_supabase, user_id):
        """Test successfully unfollowing a user."""
        make_delete_chain(mock_supabase)
        await service.unfollow_user(user_id, "user-to-unfollow")
        mock_supabase.table.return_value.delete.assert_called()

    @pytest.mark.asyncio
    async def test_get_followers_success(self, service, mock_supabase, user_id):
        """Test getting followers list."""
        eq_mock = make_eq_chain(mock_supabase, [
            MagicMock(data=[], count=2),
            MagicMock(data=[{"id": "f1", "display_name": "Follower1", "avatar_url": None}]),
            MagicMock(data=[{"id": "f2", "display_name": "Follower2", "avatar_url": None}]),
        ])
        eq_mock.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[{"follower_id": "f1"}, {"follower_id": "f2"}])

        followers, total = await service.get_followers(user_id, page=1, limit=10)
        assert len(followers) == 2

    @pytest.mark.asyncio
    async def test_get_creator_profile_success(self, service, mock_supabase, user_id):
        """Test getting creator profile with stats."""
        now = datetime.now(timezone.utc)
        user_row = {"id": user_id, "display_name": "TestUser", "avatar_url": None}
        stats_row = {"user_id": user_id, "post_count": 10, "total_likes_received": 50,
                     "follower_count": 100, "following_count": 25, "is_banned": False,
                     "created_at": now.isoformat(), "updated_at": now.isoformat()}
        make_eq_chain(mock_supabase, [
            MagicMock(data=[user_row]),
            MagicMock(data=[stats_row]),
            MagicMock(data=[{"created_at": now_iso()}]),
            MagicMock(data=[]),  # Not following
        ])

        profile = await service.get_creator_profile(user_id, viewer_id="viewer")
        assert profile.user.display_name == "TestUser"
        assert profile.stats.post_count == 10
        assert profile.stats.follower_count == 100
        assert profile.is_following is False
