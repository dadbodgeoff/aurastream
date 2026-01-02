"""
Unit Tests for Playbook Service

Tests the playbook generation functionality including:
- Analyzer logic
- Generator logic
- Repository operations
- Error handling
"""

import pytest
from datetime import datetime, timezone, timedelta, date
from unittest.mock import MagicMock, AsyncMock, patch
from typing import Dict, Any, List


class TestGoldenHoursAnalyzer:
    """Tests for GoldenHoursAnalyzer."""
    
    @pytest.fixture
    def analyzer(self):
        """Create GoldenHoursAnalyzer instance."""
        from backend.services.playbook.analyzers import GoldenHoursAnalyzer
        return GoldenHoursAnalyzer()
    
    @pytest.mark.asyncio
    async def test_analyze_returns_golden_hours(self, analyzer):
        """Test that analyze returns golden hour windows."""
        streams = [
            {"viewer_count": 5000, "game_name": "Just Chatting"},
            {"viewer_count": 10000, "game_name": "Fortnite"},
        ]
        games = [
            {"name": "Just Chatting"},
            {"name": "Fortnite"},
        ]
        
        results = await analyzer.analyze(streams, games)
        
        # Should return up to 5 golden hours
        assert len(results) <= 5
        
        # Each result should have required fields
        for gh in results:
            assert gh.day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            assert 0 <= gh.start_hour <= 23
            assert 0 <= gh.opportunity_score <= 100
            assert gh.competition_level in ["low", "medium", "high"]
            assert gh.viewer_availability in ["low", "medium", "high"]
    
    @pytest.mark.asyncio
    async def test_analyze_empty_input(self, analyzer):
        """Test analyze with empty input."""
        results = await analyzer.analyze([], [])
        
        # Should still return golden hours based on time patterns
        assert isinstance(results, list)
        # May return results based on algorithmic patterns even without data
    
    def test_opportunity_score_calculation(self, analyzer):
        """Test opportunity score calculation."""
        # Off-peak weekday morning should score well
        score = analyzer._calculate_opportunity_score(
            day=0,  # Monday
            hour=11,  # 11am - off-peak
            big_streamer_count=5,
            total_viewers=100000,
        )
        assert score >= 50  # Should be decent opportunity
        
        # Peak evening should score lower
        score_peak = analyzer._calculate_opportunity_score(
            day=0,  # Monday
            hour=20,  # 8pm - peak
            big_streamer_count=30,
            total_viewers=500000,
        )
        assert score_peak < score  # Peak should be worse opportunity
    
    def test_competition_level_determination(self, analyzer):
        """Test competition level determination."""
        # Peak hours should be high competition
        assert analyzer._get_competition_level(0, 20) == "high"  # Monday 8pm
        
        # Off-peak should be low competition
        assert analyzer._get_competition_level(0, 11) == "low"  # Monday 11am
        
        # Early morning should be low
        assert analyzer._get_competition_level(0, 5) == "low"  # Monday 5am
    
    def test_viewer_availability_determination(self, analyzer):
        """Test viewer availability determination."""
        # Weekend afternoon should be high
        assert analyzer._get_viewer_availability(5, 15) == "high"  # Saturday 3pm
        
        # Weekday evening should be high
        assert analyzer._get_viewer_availability(0, 20) == "high"  # Monday 8pm
        
        # Early morning should be low
        assert analyzer._get_viewer_availability(0, 4) == "low"  # Monday 4am


class TestNicheFinderAnalyzer:
    """Tests for NicheFinderAnalyzer."""
    
    @pytest.fixture
    def analyzer(self):
        """Create NicheFinderAnalyzer instance."""
        from backend.services.playbook.analyzers import NicheFinderAnalyzer
        return NicheFinderAnalyzer()
    
    @pytest.mark.asyncio
    async def test_analyze_finds_opportunities(self, analyzer):
        """Test that analyze finds niche opportunities."""
        games = [
            {"game_id": "1", "id": "1", "name": "Test Game", "box_art_url": "https://example.com/{width}x{height}.jpg"},
        ]
        streams = [
            {"game_id": "1", "viewer_count": 10000},
            {"game_id": "1", "viewer_count": 5000},
            {"game_id": "1", "viewer_count": 3000},
        ]
        videos = []
        
        results = await analyzer.analyze(games, streams, videos)
        
        # Should return opportunities
        assert isinstance(results, list)
        
        for opp in results:
            assert opp.game_or_niche
            assert opp.saturation_score >= 0
            assert opp.saturation_score <= 100
            assert opp.growth_potential in ["stable", "moderate", "high", "explosive"]
    
    @pytest.mark.asyncio
    async def test_analyze_empty_input(self, analyzer):
        """Test analyze with empty input."""
        results = await analyzer.analyze([], [], [])
        
        # Should return empty list
        assert results == []
    
    def test_saturation_calculation(self, analyzer):
        """Test saturation score calculation."""
        # High viewer-to-streamer ratio = low saturation
        low_sat = analyzer._calculate_saturation(
            total_viewers=100000,
            stream_count=50,
            avg_viewers=2000,
        )
        
        # Low viewer-to-streamer ratio = high saturation
        high_sat = analyzer._calculate_saturation(
            total_viewers=10000,
            stream_count=500,
            avg_viewers=20,
        )
        
        assert low_sat < high_sat
    
    def test_growth_potential_assessment(self, analyzer):
        """Test growth potential assessment."""
        # Game with high YouTube presence should have high growth
        videos = [
            {"title": "Test Game gameplay", "tags": []},
            {"title": "Test Game tips", "tags": []},
            {"title": "Test Game guide", "tags": []},
            {"title": "Test Game review", "tags": []},
            {"title": "Test Game stream", "tags": []},
        ]
        
        growth = analyzer._assess_growth_potential(
            "Test Game",
            {"avg_viewers": 100},
            videos,
        )
        
        assert growth == "explosive"
    
    def test_aggregate_game_stats(self, analyzer):
        """Test game stats aggregation."""
        streams = [
            {"game_id": "1", "viewer_count": 1000},
            {"game_id": "1", "viewer_count": 2000},
            {"game_id": "2", "viewer_count": 500},
        ]
        
        stats = analyzer._aggregate_game_stats(streams)
        
        assert stats["1"]["viewers"] == 3000
        assert stats["1"]["streams"] == 2
        assert stats["1"]["avg_viewers"] == 1500
        assert stats["2"]["viewers"] == 500
        assert stats["2"]["streams"] == 1


class TestViralHooksAnalyzer:
    """Tests for ViralHooksAnalyzer."""
    
    @pytest.fixture
    def analyzer(self):
        """Create ViralHooksAnalyzer instance."""
        from backend.services.playbook.analyzers import ViralHooksAnalyzer
        return ViralHooksAnalyzer()
    
    @pytest.mark.asyncio
    async def test_analyze_returns_hooks(self, analyzer):
        """Test that analyze returns viral hooks."""
        videos = [
            {
                "title": "I FINALLY Beat This IMPOSSIBLE Challenge!",
                "view_count": 1000000,
                "views": 1000000,
                "tags": ["gaming", "challenge"],
            },
        ]
        clips = []
        keywords = {"hashtags": ["#gaming"], "title_keywords": []}
        
        results = await analyzer.analyze(videos, clips, keywords)
        
        assert isinstance(results, list)
    
    @pytest.mark.asyncio
    async def test_analyze_empty_input(self, analyzer):
        """Test analyze with empty input."""
        results = await analyzer.analyze([], [], {})
        
        # Should return empty list or default hooks
        assert isinstance(results, list)


class TestPlaybookRepository:
    """Tests for PlaybookRepository."""
    
    @pytest.fixture
    def mock_supabase(self):
        """Create mock Supabase client."""
        client = MagicMock()
        return client
    
    @pytest.fixture
    def repository(self, mock_supabase):
        """Create PlaybookRepository with mocked client."""
        from backend.services.playbook.repository import PlaybookRepository
        repo = PlaybookRepository()
        repo._client = mock_supabase
        return repo
    
    @pytest.mark.asyncio
    async def test_save_report_success(self, repository, mock_supabase):
        """Test successful report save."""
        from backend.api.schemas.playbook import TodaysPlaybook, WeeklySchedule
        
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "report-123"}]
        )
        
        playbook = TodaysPlaybook(
            playbook_date=date.today(),
            generated_at=datetime.utcnow(),
            headline="Test Headline",
            subheadline="Test Subheadline",
            mood="opportunity",
            total_twitch_viewers=100000,
            total_youtube_gaming_views=500000,
            trending_game="Test Game",
            viral_video_count=5,
            golden_hours=[],
            weekly_schedule=None,
            niche_opportunities=[],
            viral_hooks=[],
            title_formulas=[],
            thumbnail_recipes=[],
            video_ideas=[],
            strategies=[],
            insight_cards=[],
            trending_hashtags=[],
            title_keywords=[],
            daily_mantra="Test mantra",
            success_story=None,
        )
        
        report_id = await repository.save_report(playbook)
        
        assert report_id == "report-123"
        mock_supabase.table.assert_called_with("playbook_reports")
    
    @pytest.mark.asyncio
    async def test_save_report_failure(self, repository, mock_supabase):
        """Test report save failure."""
        from backend.api.schemas.playbook import TodaysPlaybook
        
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        playbook = TodaysPlaybook(
            playbook_date=date.today(),
            generated_at=datetime.utcnow(),
            headline="Test",
            subheadline="",
            mood="opportunity",
            total_twitch_viewers=0,
            total_youtube_gaming_views=0,
            trending_game="",
            viral_video_count=0,
            golden_hours=[],
            weekly_schedule=None,
            niche_opportunities=[],
            viral_hooks=[],
            title_formulas=[],
            thumbnail_recipes=[],
            video_ideas=[],
            strategies=[],
            insight_cards=[],
            trending_hashtags=[],
            title_keywords=[],
            daily_mantra="",
            success_story=None,
        )
        
        with pytest.raises(Exception, match="No data returned"):
            await repository.save_report(playbook)
    
    @pytest.mark.asyncio
    async def test_get_latest_report_success(self, repository, mock_supabase):
        """Test successful latest report retrieval."""
        mock_supabase.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[{
                "id": "report-123",
                "headline": "Test",
                "report_timestamp": datetime.utcnow().isoformat(),
            }]
        )
        
        result = await repository.get_latest_report()
        
        assert result is not None
        assert result["id"] == "report-123"
    
    @pytest.mark.asyncio
    async def test_get_latest_report_none(self, repository, mock_supabase):
        """Test latest report when none exists."""
        mock_supabase.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[]
        )
        
        result = await repository.get_latest_report()
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_latest_report_error_returns_none(self, repository, mock_supabase):
        """Test that DB errors return None instead of raising."""
        mock_supabase.table.return_value.select.return_value.order.return_value.limit.return_value.execute.side_effect = Exception("DB Error")
        
        result = await repository.get_latest_report()
        
        # Should return None, not raise
        assert result is None


class TestPlaybookOrchestrator:
    """Tests for PlaybookOrchestrator."""
    
    @pytest.fixture
    def mock_collectors(self):
        """Create mock collectors."""
        youtube = AsyncMock()
        twitch = AsyncMock()
        
        youtube.fetch_trending.return_value = []
        twitch.fetch_top_streams.return_value = []
        twitch.fetch_top_games.return_value = []
        twitch.fetch_clips.return_value = []
        
        return youtube, twitch
    
    @pytest.mark.asyncio
    async def test_fetch_all_data_structure(self, mock_collectors):
        """Test that _fetch_all_data returns correct structure."""
        from backend.services.playbook.orchestrator import PlaybookOrchestrator
        
        youtube, twitch = mock_collectors
        orchestrator = PlaybookOrchestrator()
        
        with patch('backend.services.playbook.orchestrator.get_youtube_collector', return_value=youtube):
            with patch('backend.services.playbook.orchestrator.get_twitch_collector', return_value=twitch):
                data = await orchestrator._fetch_all_data()
        
        # Should have all required keys
        assert "youtube_videos" in data
        assert "twitch_streams" in data
        assert "twitch_games" in data
        assert "twitch_clips" in data
        assert "keywords" in data
        
        # Keywords should have expected structure
        assert "hashtags" in data["keywords"]
        assert "title_keywords" in data["keywords"]
    
    @pytest.mark.asyncio
    async def test_fetch_all_data_handles_clip_errors(self, mock_collectors):
        """Test that clip fetch errors don't break data fetching."""
        from dataclasses import dataclass
        from backend.services.playbook.orchestrator import PlaybookOrchestrator
        
        youtube, twitch = mock_collectors
        
        # Make clip fetching fail
        twitch.fetch_clips.side_effect = Exception("API Error")
        
        # But return some games so clips are attempted
        @dataclass
        class MockGame:
            id: str = "1"
            name: str = "Test Game"
            box_art_url: str = "https://example.com/art.jpg"
        
        twitch.fetch_top_games.return_value = [MockGame()]
        
        orchestrator = PlaybookOrchestrator()
        
        with patch('backend.services.playbook.orchestrator.get_youtube_collector', return_value=youtube):
            with patch('backend.services.playbook.orchestrator.get_twitch_collector', return_value=twitch):
                # Should not raise
                data = await orchestrator._fetch_all_data()
        
        # Should still have data structure
        assert "twitch_clips" in data
        assert data["twitch_clips"] == []  # Empty due to error


class TestHeadlineGenerator:
    """Tests for HeadlineGenerator."""
    
    @pytest.fixture
    def generator(self):
        """Create HeadlineGenerator instance."""
        from backend.services.playbook.generators import HeadlineGenerator
        return HeadlineGenerator()
    
    def test_generate_returns_tuple(self, generator):
        """Test that generate returns headline, subheadline, mood."""
        streams = [{"viewer_count": 100000}]
        games = [{"name": "Test Game"}]
        golden_hours = []
        niches = []
        
        headline, subheadline, mood = generator.generate(
            streams, games, golden_hours, niches
        )
        
        assert isinstance(headline, str)
        assert isinstance(subheadline, str)
        # Mood can be various values depending on data
        assert isinstance(mood, str)
        assert len(mood) > 0
    
    def test_generate_empty_input(self, generator):
        """Test generate with empty input."""
        headline, subheadline, mood = generator.generate([], [], [], [])
        
        # Should still return valid values
        assert isinstance(headline, str)
        assert isinstance(mood, str)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
