"""
Unit tests for Coach Analytics Service.

Tests cover:
- Recording session outcomes
- Updating viral scores
- Recording user ratings with validation
- Getting success patterns
- Getting user history
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

# Import directly from the module to avoid __init__.py import chain issues
import sys
import importlib.util

# Load the analytics_service module directly
spec = importlib.util.spec_from_file_location(
    "analytics_service",
    "backend/services/coach/analytics_service.py"
)
analytics_module = importlib.util.module_from_spec(spec)
sys.modules["analytics_service"] = analytics_module
spec.loader.exec_module(analytics_module)

CoachAnalyticsService = analytics_module.CoachAnalyticsService
SessionOutcome = analytics_module.SessionOutcome
SuccessPattern = analytics_module.SuccessPattern
get_analytics_service = analytics_module.get_analytics_service


class TestCoachAnalyticsService:
    """Tests for CoachAnalyticsService class."""
    
    @pytest.fixture
    def mock_supabase(self):
        """Create a mock Supabase client."""
        mock = MagicMock()
        mock.table.return_value = mock
        mock.insert.return_value = mock
        mock.update.return_value = mock
        mock.select.return_value = mock
        mock.eq.return_value = mock
        mock.gte.return_value = mock
        mock.order.return_value = mock
        mock.limit.return_value = mock
        mock.single.return_value = mock
        mock.execute.return_value = MagicMock(data=[])
        return mock
    
    @pytest.fixture
    def service(self, mock_supabase):
        """Create a service with mocked Supabase."""
        return CoachAnalyticsService(supabase_client=mock_supabase)

    @pytest.fixture
    def sample_outcome(self):
        """Sample session outcome for testing."""
        return SessionOutcome(
            session_id="test-session-123",
            user_id="test-user-456",
            asset_id="test-asset-789",
            generation_completed=True,
            turns_used=3,
            grounding_used=True,
            refinements_count=2,
            quality_score=0.85,
            final_intent="A happy character celebrating victory",
            asset_type="twitch_emote",
            mood="hype",
            game_context="Fortnite",
        )
    
    # =========================================================================
    # Test record_outcome
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_record_outcome_success(self, service, mock_supabase, sample_outcome):
        """Test recording a session outcome successfully."""
        mock_supabase.execute.return_value = MagicMock(data=[{"id": "outcome-123"}])
        
        outcome_id = await service.record_outcome(sample_outcome)
        
        # Verify outcome_id is returned
        assert outcome_id is not None
        assert isinstance(outcome_id, str)
        
        # Verify table was called correctly
        mock_supabase.table.assert_called_with("coach_session_outcomes")
        mock_supabase.insert.assert_called_once()
        
        # Verify the data passed to insert
        insert_call = mock_supabase.insert.call_args
        insert_data = insert_call[0][0]
        
        assert insert_data["session_id"] == "test-session-123"
        assert insert_data["user_id"] == "test-user-456"
        assert insert_data["asset_id"] == "test-asset-789"
        assert insert_data["generation_completed"] is True
        assert insert_data["turns_used"] == 3
        assert insert_data["grounding_used"] is True
        assert insert_data["refinements_count"] == 2
        assert insert_data["quality_score"] == 0.85
        assert insert_data["final_intent"] == "A happy character celebrating victory"
        assert insert_data["asset_type"] == "twitch_emote"
        assert insert_data["mood"] == "hype"
        assert insert_data["game_context"] == "Fortnite"

    @pytest.mark.asyncio
    async def test_record_outcome_with_optional_fields(self, service, mock_supabase):
        """Test recording outcome with optional fields as None."""
        outcome = SessionOutcome(
            session_id="test-session-456",
            user_id="test-user-789",
            asset_id=None,  # No asset generated
            generation_completed=False,
            turns_used=1,
            grounding_used=False,
            refinements_count=0,
            quality_score=0.5,
            final_intent="Initial prompt",
            asset_type="youtube_thumbnail",
            mood=None,
            game_context=None,
        )
        
        mock_supabase.execute.return_value = MagicMock(data=[{"id": "outcome-456"}])
        
        outcome_id = await service.record_outcome(outcome)
        
        assert outcome_id is not None
        
        # Verify optional fields are passed as None
        insert_data = mock_supabase.insert.call_args[0][0]
        assert insert_data["asset_id"] is None
        assert insert_data["mood"] is None
        assert insert_data["game_context"] is None
    
    @pytest.mark.asyncio
    async def test_record_outcome_database_error(self, service, mock_supabase, sample_outcome):
        """Test that database errors are propagated."""
        mock_supabase.execute.side_effect = Exception("Database connection failed")
        
        with pytest.raises(Exception, match="Database connection failed"):
            await service.record_outcome(sample_outcome)
    
    # =========================================================================
    # Test update_viral_score
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_update_viral_score_success(self, service, mock_supabase):
        """Test updating viral score."""
        mock_supabase.execute.return_value = MagicMock(data=[{"id": "outcome-123"}])
        
        await service.update_viral_score("outcome-123", 85)
        
        # Verify table and update were called
        mock_supabase.table.assert_called_with("coach_session_outcomes")
        mock_supabase.update.assert_called_once()
        mock_supabase.eq.assert_called_with("id", "outcome-123")
        
        # Verify the update data
        update_data = mock_supabase.update.call_args[0][0]
        assert update_data["viral_score"] == 85
        assert "updated_at" in update_data

    @pytest.mark.asyncio
    async def test_update_viral_score_zero(self, service, mock_supabase):
        """Test updating viral score to zero."""
        mock_supabase.execute.return_value = MagicMock(data=[{"id": "outcome-123"}])
        
        await service.update_viral_score("outcome-123", 0)
        
        update_data = mock_supabase.update.call_args[0][0]
        assert update_data["viral_score"] == 0
    
    @pytest.mark.asyncio
    async def test_update_viral_score_max(self, service, mock_supabase):
        """Test updating viral score to maximum (100)."""
        mock_supabase.execute.return_value = MagicMock(data=[{"id": "outcome-123"}])
        
        await service.update_viral_score("outcome-123", 100)
        
        update_data = mock_supabase.update.call_args[0][0]
        assert update_data["viral_score"] == 100
    
    @pytest.mark.asyncio
    async def test_update_viral_score_database_error(self, service, mock_supabase):
        """Test that database errors are propagated."""
        mock_supabase.execute.side_effect = Exception("Update failed")
        
        with pytest.raises(Exception, match="Update failed"):
            await service.update_viral_score("outcome-123", 50)
    
    # =========================================================================
    # Test record_user_rating
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_record_user_rating_success(self, service, mock_supabase):
        """Test recording user rating."""
        # Mock ownership check
        mock_supabase.single.return_value = mock_supabase
        mock_supabase.execute.return_value = MagicMock(data={"user_id": "test-user-123"})
        
        await service.record_user_rating("outcome-123", "test-user-123", 5)
        
        # Verify ownership check was performed
        mock_supabase.select.assert_called_with("user_id")
        
        # Verify update was called
        mock_supabase.update.assert_called_once()
        update_data = mock_supabase.update.call_args[0][0]
        assert update_data["user_rating"] == 5

    @pytest.mark.asyncio
    async def test_record_user_rating_all_valid_values(self, service, mock_supabase):
        """Test that all valid ratings (1-5) are accepted."""
        mock_supabase.single.return_value = mock_supabase
        mock_supabase.execute.return_value = MagicMock(data={"user_id": "test-user-123"})
        
        for rating in [1, 2, 3, 4, 5]:
            mock_supabase.reset_mock()
            mock_supabase.table.return_value = mock_supabase
            mock_supabase.select.return_value = mock_supabase
            mock_supabase.eq.return_value = mock_supabase
            mock_supabase.single.return_value = mock_supabase
            mock_supabase.update.return_value = mock_supabase
            mock_supabase.execute.return_value = MagicMock(data={"user_id": "test-user-123"})
            
            await service.record_user_rating("outcome-123", "test-user-123", rating)
            
            update_data = mock_supabase.update.call_args[0][0]
            assert update_data["user_rating"] == rating
    
    @pytest.mark.asyncio
    async def test_record_user_rating_invalid_rating(self, service):
        """Test that invalid ratings are rejected."""
        # Rating too low
        with pytest.raises(ValueError, match="Rating must be between 1 and 5"):
            await service.record_user_rating("outcome-123", "test-user-123", 0)
        
        # Rating too high
        with pytest.raises(ValueError, match="Rating must be between 1 and 5"):
            await service.record_user_rating("outcome-123", "test-user-123", 6)
        
        # Negative rating
        with pytest.raises(ValueError, match="Rating must be between 1 and 5"):
            await service.record_user_rating("outcome-123", "test-user-123", -1)
    
    @pytest.mark.asyncio
    async def test_record_user_rating_wrong_user(self, service, mock_supabase):
        """Test that users can't rate others' outcomes."""
        # Mock ownership check returning different user
        mock_supabase.single.return_value = mock_supabase
        mock_supabase.execute.return_value = MagicMock(data={"user_id": "other-user-456"})
        
        with pytest.raises(PermissionError, match="does not own outcome"):
            await service.record_user_rating("outcome-123", "test-user-123", 5)

    @pytest.mark.asyncio
    async def test_record_user_rating_outcome_not_found(self, service, mock_supabase):
        """Test rating non-existent outcome."""
        mock_supabase.single.return_value = mock_supabase
        mock_supabase.execute.return_value = MagicMock(data=None)
        
        with pytest.raises(ValueError, match="not found"):
            await service.record_user_rating("nonexistent-outcome", "test-user-123", 5)
    
    # =========================================================================
    # Test get_success_patterns
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_get_success_patterns_empty(self, service, mock_supabase):
        """Test getting patterns with no data."""
        mock_supabase.execute.return_value = MagicMock(data=[])
        
        patterns = await service.get_success_patterns()
        
        assert patterns == []
    
    @pytest.mark.asyncio
    async def test_get_success_patterns_with_data(self, service, mock_supabase):
        """Test getting patterns with sample data."""
        mock_data = [
            {
                "asset_type": "twitch_emote",
                "generation_completed": True,
                "turns_used": 3,
                "quality_score": 0.85,
                "grounding_used": True,
            },
            {
                "asset_type": "twitch_emote",
                "generation_completed": True,
                "turns_used": 2,
                "quality_score": 0.90,
                "grounding_used": False,
            },
            {
                "asset_type": "twitch_emote",
                "generation_completed": False,
                "turns_used": 5,
                "quality_score": 0.60,
                "grounding_used": True,
            },
            {
                "asset_type": "youtube_thumbnail",
                "generation_completed": True,
                "turns_used": 4,
                "quality_score": 0.75,
                "grounding_used": False,
            },
        ]
        mock_supabase.execute.return_value = MagicMock(data=mock_data)
        
        patterns = await service.get_success_patterns()
        
        assert len(patterns) == 2
        
        # Find twitch_emote pattern
        emote_pattern = next(p for p in patterns if p.asset_type == "twitch_emote")
        assert emote_pattern.total_sessions == 3
        assert emote_pattern.completed_generations == 2
        assert emote_pattern.completion_rate == pytest.approx(0.667, rel=0.01)
        assert emote_pattern.avg_turns == pytest.approx(3.33, rel=0.01)
        assert emote_pattern.avg_quality_score == pytest.approx(0.78, rel=0.01)
        assert emote_pattern.grounding_usage_rate == pytest.approx(0.667, rel=0.01)

    @pytest.mark.asyncio
    async def test_get_success_patterns_filtered_by_asset_type(self, service, mock_supabase):
        """Test getting patterns filtered by asset type."""
        mock_data = [
            {
                "asset_type": "twitch_emote",
                "generation_completed": True,
                "turns_used": 3,
                "quality_score": 0.85,
                "grounding_used": True,
            },
        ]
        mock_supabase.execute.return_value = MagicMock(data=mock_data)
        
        patterns = await service.get_success_patterns(asset_type="twitch_emote")
        
        # Verify filter was applied
        mock_supabase.eq.assert_called_with("asset_type", "twitch_emote")
        
        assert len(patterns) == 1
        assert patterns[0].asset_type == "twitch_emote"
    
    @pytest.mark.asyncio
    async def test_get_success_patterns_sorted_by_completion_rate(self, service, mock_supabase):
        """Test that patterns are sorted by completion rate descending."""
        mock_data = [
            # Low completion rate asset type
            {"asset_type": "overlay", "generation_completed": False, "turns_used": 5, "quality_score": 0.5, "grounding_used": False},
            {"asset_type": "overlay", "generation_completed": False, "turns_used": 4, "quality_score": 0.4, "grounding_used": False},
            # High completion rate asset type
            {"asset_type": "twitch_emote", "generation_completed": True, "turns_used": 2, "quality_score": 0.9, "grounding_used": True},
            {"asset_type": "twitch_emote", "generation_completed": True, "turns_used": 3, "quality_score": 0.85, "grounding_used": True},
        ]
        mock_supabase.execute.return_value = MagicMock(data=mock_data)
        
        patterns = await service.get_success_patterns()
        
        # First pattern should have higher completion rate
        assert patterns[0].completion_rate >= patterns[1].completion_rate
        assert patterns[0].asset_type == "twitch_emote"  # 100% completion
        assert patterns[1].asset_type == "overlay"  # 0% completion
    
    @pytest.mark.asyncio
    async def test_get_success_patterns_database_error_returns_empty(self, service, mock_supabase):
        """Test that database errors return empty list."""
        mock_supabase.execute.side_effect = Exception("Database error")
        
        patterns = await service.get_success_patterns()
        
        assert patterns == []

    # =========================================================================
    # Test get_user_history
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_get_user_history_success(self, service, mock_supabase):
        """Test getting user history."""
        mock_data = [
            {
                "id": "outcome-1",
                "session_id": "session-1",
                "asset_id": "asset-1",
                "generation_completed": True,
                "turns_used": 3,
                "grounding_used": True,
                "refinements_count": 2,
                "quality_score": 0.85,
                "final_intent": "A happy emote",
                "asset_type": "twitch_emote",
                "mood": "hype",
                "game_context": "Fortnite",
                "viral_score": 75,
                "user_rating": 5,
                "created_at": "2025-01-15T10:30:00Z",
            },
            {
                "id": "outcome-2",
                "session_id": "session-2",
                "asset_id": None,
                "generation_completed": False,
                "turns_used": 1,
                "grounding_used": False,
                "refinements_count": 0,
                "quality_score": 0.5,
                "final_intent": "Initial prompt",
                "asset_type": "youtube_thumbnail",
                "mood": None,
                "game_context": None,
                "viral_score": None,
                "user_rating": None,
                "created_at": "2025-01-14T09:00:00Z",
            },
        ]
        mock_supabase.execute.return_value = MagicMock(data=mock_data)
        
        history = await service.get_user_history("test-user-123")
        
        # Verify query parameters
        mock_supabase.eq.assert_called_with("user_id", "test-user-123")
        mock_supabase.order.assert_called_with("created_at", desc=True)
        mock_supabase.limit.assert_called_with(10)
        
        # Verify response structure (camelCase transformation)
        assert len(history) == 2
        
        first = history[0]
        assert first["id"] == "outcome-1"
        assert first["sessionId"] == "session-1"
        assert first["assetId"] == "asset-1"
        assert first["generationCompleted"] is True
        assert first["turnsUsed"] == 3
        assert first["groundingUsed"] is True
        assert first["refinementsCount"] == 2
        assert first["qualityScore"] == 0.85
        assert first["finalIntent"] == "A happy emote"
        assert first["assetType"] == "twitch_emote"
        assert first["mood"] == "hype"
        assert first["gameContext"] == "Fortnite"
        assert first["viralScore"] == 75
        assert first["userRating"] == 5
        assert first["createdAt"] == "2025-01-15T10:30:00Z"

    @pytest.mark.asyncio
    async def test_get_user_history_empty(self, service, mock_supabase):
        """Test getting history for user with no sessions."""
        mock_supabase.execute.return_value = MagicMock(data=[])
        
        history = await service.get_user_history("new-user-123")
        
        assert history == []
    
    @pytest.mark.asyncio
    async def test_get_user_history_custom_limit(self, service, mock_supabase):
        """Test getting history with custom limit."""
        mock_supabase.execute.return_value = MagicMock(data=[])
        
        await service.get_user_history("test-user-123", limit=5)
        
        mock_supabase.limit.assert_called_with(5)
    
    @pytest.mark.asyncio
    async def test_get_user_history_database_error_returns_empty(self, service, mock_supabase):
        """Test that database errors return empty list."""
        mock_supabase.execute.side_effect = Exception("Database error")
        
        history = await service.get_user_history("test-user-123")
        
        assert history == []
    
    @pytest.mark.asyncio
    async def test_get_user_history_handles_null_optional_fields(self, service, mock_supabase):
        """Test that null optional fields are handled correctly."""
        mock_data = [
            {
                "id": "outcome-1",
                "session_id": "session-1",
                "asset_id": None,
                "generation_completed": False,
                "turns_used": 1,
                "grounding_used": False,
                "refinements_count": 0,
                "quality_score": 0.5,
                "final_intent": "Test",
                "asset_type": "twitch_emote",
                "mood": None,
                "game_context": None,
                "viral_score": None,
                "user_rating": None,
                "created_at": "2025-01-15T10:30:00Z",
            },
        ]
        mock_supabase.execute.return_value = MagicMock(data=mock_data)
        
        history = await service.get_user_history("test-user-123")
        
        assert len(history) == 1
        assert history[0]["assetId"] is None
        assert history[0]["mood"] is None
        assert history[0]["gameContext"] is None
        assert history[0]["viralScore"] is None
        assert history[0]["userRating"] is None


class TestGetAnalyticsService:
    """Tests for the singleton factory."""
    
    def test_returns_singleton(self):
        """Test that get_analytics_service returns the same instance."""
        # Reset the singleton for testing using the directly loaded module
        original_singleton = analytics_module._analytics_service
        analytics_module._analytics_service = None
        
        try:
            with patch.object(analytics_module.CoachAnalyticsService, '__init__', return_value=None):
                service1 = get_analytics_service()
                service2 = get_analytics_service()
                
                assert service1 is service2
        finally:
            # Restore original singleton
            analytics_module._analytics_service = original_singleton
    
    def test_creates_instance_on_first_call(self):
        """Test that first call creates a new instance."""
        original_singleton = analytics_module._analytics_service
        analytics_module._analytics_service = None
        
        try:
            with patch.object(analytics_module.CoachAnalyticsService, '__init__', return_value=None):
                service = get_analytics_service()
                
                assert service is not None
                assert isinstance(service, CoachAnalyticsService)
        finally:
            analytics_module._analytics_service = original_singleton


class TestSessionOutcome:
    """Tests for SessionOutcome dataclass."""
    
    def test_session_outcome_creation(self):
        """Test creating a session outcome."""
        outcome = SessionOutcome(
            session_id="session-123",
            user_id="user-456",
            asset_id="asset-789",
            generation_completed=True,
            turns_used=3,
            grounding_used=True,
            refinements_count=2,
            quality_score=0.85,
            final_intent="A happy emote",
            asset_type="twitch_emote",
            mood="hype",
            game_context="Fortnite",
        )
        
        assert outcome.session_id == "session-123"
        assert outcome.user_id == "user-456"
        assert outcome.asset_id == "asset-789"
        assert outcome.generation_completed is True
        assert outcome.turns_used == 3
        assert outcome.grounding_used is True
        assert outcome.refinements_count == 2
        assert outcome.quality_score == 0.85
        assert outcome.final_intent == "A happy emote"
        assert outcome.asset_type == "twitch_emote"
        assert outcome.mood == "hype"
        assert outcome.game_context == "Fortnite"

    def test_session_outcome_defaults(self):
        """Test session outcome default values."""
        outcome = SessionOutcome(
            session_id="session-123",
            user_id="user-456",
            asset_id=None,
            generation_completed=False,
            turns_used=1,
            grounding_used=False,
            refinements_count=0,
            quality_score=0.5,
            final_intent="Test",
            asset_type="twitch_emote",
            mood=None,
            game_context=None,
        )
        
        assert outcome.viral_score is None
        assert outcome.user_rating is None
    
    def test_session_outcome_with_optional_scores(self):
        """Test session outcome with viral score and user rating."""
        outcome = SessionOutcome(
            session_id="session-123",
            user_id="user-456",
            asset_id="asset-789",
            generation_completed=True,
            turns_used=3,
            grounding_used=True,
            refinements_count=2,
            quality_score=0.85,
            final_intent="A happy emote",
            asset_type="twitch_emote",
            mood="hype",
            game_context="Fortnite",
            viral_score=75,
            user_rating=5,
        )
        
        assert outcome.viral_score == 75
        assert outcome.user_rating == 5


class TestSuccessPattern:
    """Tests for SuccessPattern dataclass."""
    
    def test_success_pattern_creation(self):
        """Test creating a success pattern."""
        pattern = SuccessPattern(
            asset_type="twitch_emote",
            total_sessions=100,
            completed_generations=85,
            completion_rate=0.85,
            avg_turns=3.5,
            avg_quality_score=0.78,
            grounding_usage_rate=0.45,
        )
        
        assert pattern.asset_type == "twitch_emote"
        assert pattern.total_sessions == 100
        assert pattern.completed_generations == 85
        assert pattern.completion_rate == 0.85
        assert pattern.avg_turns == 3.5
        assert pattern.avg_quality_score == 0.78
        assert pattern.grounding_usage_rate == 0.45
    
    def test_success_pattern_zero_values(self):
        """Test success pattern with zero values."""
        pattern = SuccessPattern(
            asset_type="new_asset_type",
            total_sessions=0,
            completed_generations=0,
            completion_rate=0.0,
            avg_turns=0.0,
            avg_quality_score=0.0,
            grounding_usage_rate=0.0,
        )
        
        assert pattern.total_sessions == 0
        assert pattern.completion_rate == 0.0


class TestCoachAnalyticsServiceLazyLoading:
    """Tests for lazy loading of Supabase client."""
    
    def test_supabase_lazy_loading(self):
        """Test that Supabase client is lazy loaded."""
        service = CoachAnalyticsService(supabase_client=None)
        
        # _supabase should be None initially
        assert service._supabase is None
        
        # Accessing supabase property should trigger lazy loading
        # The import happens inside the property, so we patch the module it imports from
        with patch('backend.database.supabase_client.get_supabase_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            
            client = service.supabase
            
            mock_get_client.assert_called_once()
            assert client is mock_client
    
    def test_supabase_not_lazy_loaded_when_provided(self):
        """Test that provided Supabase client is used directly."""
        mock_client = MagicMock()
        service = CoachAnalyticsService(supabase_client=mock_client)
        
        assert service._supabase is mock_client
        assert service.supabase is mock_client


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
