"""
Unit tests for Community Post Service.

Tests cover creating, getting, updating, and deleting community posts
with ownership verification and user ban checking.
"""

import pytest
from unittest.mock import MagicMock

from backend.services.community_post_service import CommunityPostService
from backend.services.exceptions import (
    CommunityPostNotFoundError, CommunityAssetNotOwnedError,
    CommunityPostNotOwnedError, CommunityAlreadySharedError, CommunityUserBannedError,
)
from backend.api.schemas.community import CreatePostRequest, UpdatePostRequest


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_supabase():
    """Create a mock Supabase client."""
    return MagicMock()


@pytest.fixture
def service(mock_supabase):
    """Create a CommunityPostService with mocked Supabase client."""
    return CommunityPostService(supabase_client=mock_supabase)


@pytest.fixture
def sample_user():
    """Sample user data."""
    return {"id": "user-uuid-123", "display_name": "TestStreamer", "avatar_url": "https://example.com/avatar.png"}


@pytest.fixture
def sample_asset():
    """Sample asset data."""
    return {"id": "asset-uuid-456", "user_id": "user-uuid-123", "asset_type": "twitch_emote",
            "url": "https://storage.example.com/emote.png", "prompt_used": "A cool emote"}


@pytest.fixture
def sample_post():
    """Sample community post data."""
    return {"id": "post-uuid-789", "user_id": "user-uuid-123", "asset_id": "asset-uuid-456",
            "title": "My Cool Emote", "description": "Check out this fire emote!",
            "prompt_used": "A cool emote", "show_prompt": True, "tags": ["emote", "fire"],
            "asset_type": "twitch_emote", "asset_url": "https://storage.example.com/emote.png",
            "like_count": 10, "comment_count": 5, "view_count": 100, "is_featured": False,
            "inspired_by_post_id": None, "created_at": "2025-01-15T12:00:00Z", "updated_at": "2025-01-15T12:00:00Z"}


def setup_table_mock(mock_supabase, table_responses):
    """Helper to configure table mock responses."""
    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name in table_responses:
            config = table_responses[table_name]
            if "select" in config:
                mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=config["select"])
                mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=config.get("select_double_eq", []))
            if "insert" in config:
                mock_table.insert.return_value.execute.return_value = MagicMock(data=config["insert"])
            if "update" in config:
                mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=config["update"])
            if "delete" in config:
                mock_table.delete.return_value.eq.return_value.execute.return_value = MagicMock()
        return mock_table
    mock_supabase.table.side_effect = table_side_effect


# =============================================================================
# Create Post Tests
# =============================================================================

class TestCreatePost:
    """Tests for create_post method."""

    @pytest.mark.asyncio
    async def test_create_post_success(self, service, mock_supabase, sample_user, sample_asset, sample_post):
        """Test creating a post with valid data succeeds."""
        setup_table_mock(mock_supabase, {
            "community_user_stats": {"select": []},
            "assets": {"select": [sample_asset]},
            "community_posts": {"select": [], "insert": [sample_post]},
            "users": {"select": [sample_user]},
        })
        request = CreatePostRequest(asset_id="asset-uuid-456", title="My Cool Emote",
                                    description="Check out this fire emote!", tags=["emote", "fire"], show_prompt=True)
        result = await service.create_post("user-uuid-123", request)
        assert result.id == "post-uuid-789"
        assert result.title == "My Cool Emote"
        assert result.author.display_name == "TestStreamer"

    @pytest.mark.asyncio
    async def test_create_post_asset_not_owned(self, service, mock_supabase):
        """Test creating post with unowned asset raises CommunityAssetNotOwnedError."""
        other_asset = {"id": "asset-uuid-456", "user_id": "other-user", "asset_type": "twitch_emote", "url": "https://example.com/e.png"}
        setup_table_mock(mock_supabase, {"community_user_stats": {"select": []}, "assets": {"select": [other_asset]}})
        request = CreatePostRequest(asset_id="asset-uuid-456", title="Test Post")
        with pytest.raises(CommunityAssetNotOwnedError) as exc_info:
            await service.create_post("user-uuid-123", request)
        assert exc_info.value.details["asset_id"] == "asset-uuid-456"

    @pytest.mark.asyncio
    async def test_create_post_already_shared(self, service, mock_supabase, sample_asset):
        """Test creating post for already shared asset raises CommunityAlreadySharedError."""
        setup_table_mock(mock_supabase, {
            "community_user_stats": {"select": []},
            "assets": {"select": [sample_asset]},
            "community_posts": {"select": [{"id": "existing-post-id"}]},
        })
        request = CreatePostRequest(asset_id="asset-uuid-456", title="Test Post")
        with pytest.raises(CommunityAlreadySharedError) as exc_info:
            await service.create_post("user-uuid-123", request)
        assert exc_info.value.details["asset_id"] == "asset-uuid-456"

    @pytest.mark.asyncio
    async def test_create_post_user_banned(self, service, mock_supabase):
        """Test creating post when user is banned raises CommunityUserBannedError."""
        setup_table_mock(mock_supabase, {"community_user_stats": {"select": [{"is_banned": True}]}})
        request = CreatePostRequest(asset_id="asset-uuid-456", title="Test Post")
        with pytest.raises(CommunityUserBannedError) as exc_info:
            await service.create_post("user-uuid-123", request)
        assert exc_info.value.details["user_id"] == "user-uuid-123"


# =============================================================================
# Get Post Tests
# =============================================================================

class TestGetPost:
    """Tests for get_post method."""

    @pytest.mark.asyncio
    async def test_get_post_success(self, service, mock_supabase, sample_post, sample_user):
        """Test getting a post returns post with author info."""
        setup_table_mock(mock_supabase, {
            "community_posts": {"select": [sample_post]},
            "community_likes": {"select": [], "select_double_eq": []},
            "users": {"select": [sample_user]},
        })
        mock_supabase.rpc.return_value.execute.return_value = MagicMock()
        result = await service.get_post("post-uuid-789", viewer_id="viewer-uuid")
        assert result.id == "post-uuid-789"
        assert result.title == "My Cool Emote"
        assert result.author.display_name == "TestStreamer"
        assert result.is_liked is False

    @pytest.mark.asyncio
    async def test_get_post_not_found(self, service, mock_supabase):
        """Test getting non-existent post raises CommunityPostNotFoundError."""
        setup_table_mock(mock_supabase, {"community_posts": {"select": []}})
        with pytest.raises(CommunityPostNotFoundError) as exc_info:
            await service.get_post("nonexistent-post-id")
        assert exc_info.value.details["post_id"] == "nonexistent-post-id"


# =============================================================================
# Update Post Tests
# =============================================================================

class TestUpdatePost:
    """Tests for update_post method."""

    @pytest.mark.asyncio
    async def test_update_post_success(self, service, mock_supabase, sample_post, sample_user):
        """Test updating a post with valid data succeeds."""
        updated_post = {**sample_post, "title": "Updated Title", "description": "New description"}
        setup_table_mock(mock_supabase, {
            "community_user_stats": {"select": []},
            "community_posts": {"select": [sample_post], "update": [updated_post]},
            "users": {"select": [sample_user]},
        })
        request = UpdatePostRequest(title="Updated Title", description="New description")
        result = await service.update_post("user-uuid-123", "post-uuid-789", request)
        assert result.title == "Updated Title"
        assert result.description == "New description"

    @pytest.mark.asyncio
    async def test_update_post_not_owned(self, service, mock_supabase, sample_post):
        """Test updating post owned by another user raises CommunityPostNotOwnedError."""
        setup_table_mock(mock_supabase, {"community_user_stats": {"select": []}, "community_posts": {"select": [sample_post]}})
        request = UpdatePostRequest(title="Hacked Title")
        with pytest.raises(CommunityPostNotOwnedError) as exc_info:
            await service.update_post("different-user-uuid", "post-uuid-789", request)
        assert exc_info.value.details["post_id"] == "post-uuid-789"


# =============================================================================
# Delete Post Tests
# =============================================================================

class TestDeletePost:
    """Tests for delete_post method."""

    @pytest.mark.asyncio
    async def test_delete_post_success(self, service, mock_supabase, sample_post):
        """Test deleting own post succeeds."""
        setup_table_mock(mock_supabase, {"community_posts": {"select": [sample_post], "delete": True}})
        await service.delete_post("user-uuid-123", "post-uuid-789")  # Should not raise

    @pytest.mark.asyncio
    async def test_delete_post_not_owned(self, service, mock_supabase, sample_post):
        """Test deleting post owned by another user raises CommunityPostNotOwnedError."""
        setup_table_mock(mock_supabase, {"community_posts": {"select": [sample_post]}})
        with pytest.raises(CommunityPostNotOwnedError) as exc_info:
            await service.delete_post("different-user-uuid", "post-uuid-789")
        assert exc_info.value.details["post_id"] == "post-uuid-789"
