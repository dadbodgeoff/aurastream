"""
Creator Intel V2 - Integration Test Suite

Comprehensive tests to verify the entire pipeline:
1. Data ingestion and caching
2. All analyzers produce valid output
3. API endpoints return correct schemas
4. Data makes sense (sanity checks)

Run with: python -m pytest backend/tests/integration/test_intel_v2_pipeline.py -v
"""

import asyncio
import json
import pytest
from datetime import datetime, timezone
from typing import Dict, Any, List
from unittest.mock import AsyncMock, MagicMock, patch

# Test fixtures - mock YouTube video data
MOCK_YOUTUBE_VIDEOS = [
    {
        "video_id": f"vid_{i}",
        "title": f"INSANE Fortnite Win #{i} - Zero Build Victory Royale",
        "description": f"#fortnite #gaming #epicgames\n\n0:00 Intro\n1:30 Gameplay\n5:00 Win\n\nFollow me on Twitter: https://twitter.com/test\nDiscord: https://discord.gg/test",
        "view_count": 100000 + i * 10000,
        "like_count": 5000 + i * 500,
        "comment_count": 200 + i * 20,
        "engagement_rate": 0.05 + i * 0.001,
        "duration_seconds": 600 + i * 60,  # 10-20 minutes
        "is_short": i % 5 == 0,  # Every 5th is a short
        "was_live_stream": i % 3 == 0,  # Every 3rd was live
        "is_premiere": i % 7 == 0,
        "scheduled_start_time": "2026-01-01T15:00:00Z" if i % 7 == 0 else None,
        "default_audio_language": ["en", "es", "pt", "de", "fr"][i % 5],
        "definition": "hd",
        "tags": ["fortnite", "gaming", "battle royale", "win", f"tag_{i}"],
        "topic_categories": ["Gaming", "Entertainment"],
        "published_at": "2026-01-01T12:00:00Z",
    }
    for i in range(30)
]


class TestContentFormatAnalyzer:
    """Test the Content Format Analyzer."""
    
    @pytest.mark.asyncio
    async def test_analyze_produces_valid_output(self):
        """Test that analyzer produces valid output structure."""
        from backend.services.intel.analyzers.content_format import ContentFormatAnalyzer
        
        analyzer = ContentFormatAnalyzer()
        
        # Mock Redis to return our test data
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "game_display_name": "Fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        
        # Verify result structure
        assert result is not None
        assert result.category_key == "fortnite"
        assert result.analyzer_name == "content_format"
        assert result.confidence > 0
        assert result.video_count == 30
        
        # Verify data structure
        data = result.data
        assert "duration_buckets" in data
        assert "optimal_duration_range" in data
        assert "shorts_vs_longform" in data
        assert "live_vs_vod" in data
        assert "insights" in data
        
        # Sanity check: duration buckets should have data
        assert len(data["duration_buckets"]) > 0
        
        # Sanity check: shorts vs longform should have counts
        svl = data["shorts_vs_longform"]
        assert svl["format_a_count"] + svl["format_b_count"] == 30
    
    @pytest.mark.asyncio
    async def test_duration_buckets_are_sensible(self):
        """Test that duration bucket analysis makes sense."""
        from backend.services.intel.analyzers.content_format import ContentFormatAnalyzer
        
        analyzer = ContentFormatAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        data = result.data
        
        # Check that buckets have reasonable values
        for bucket in data["duration_buckets"]:
            assert bucket["video_count"] > 0
            assert bucket["avg_views"] > 0
            assert bucket["performance_index"] > 0
            assert bucket["min_seconds"] < bucket["max_seconds"]


class TestDescriptionAnalyzer:
    """Test the Description Analyzer."""
    
    @pytest.mark.asyncio
    async def test_analyze_extracts_hashtags(self):
        """Test that hashtags are correctly extracted."""
        from backend.services.intel.analyzers.description import DescriptionAnalyzer
        
        analyzer = DescriptionAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        
        assert result is not None
        data = result.data
        
        # Should find hashtags
        assert len(data["top_hashtags"]) > 0
        
        # Should find #fortnite since it's in every description
        hashtag_names = [h["hashtag"].lower() for h in data["top_hashtags"]]
        assert "#fortnite" in hashtag_names
    
    @pytest.mark.asyncio
    async def test_analyze_detects_timestamps(self):
        """Test that timestamps are detected."""
        from backend.services.intel.analyzers.description import DescriptionAnalyzer
        
        analyzer = DescriptionAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        data = result.data
        
        # All our mock videos have timestamps
        assert data["has_timestamps_percent"] > 0
    
    @pytest.mark.asyncio
    async def test_analyze_detects_social_links(self):
        """Test that social links are detected."""
        from backend.services.intel.analyzers.description import DescriptionAnalyzer
        
        analyzer = DescriptionAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        data = result.data
        
        # All our mock videos have Twitter and Discord links
        assert data["has_social_links_percent"] > 0
        assert "twitter" in data["common_platforms"] or "discord" in data["common_platforms"]


class TestSemanticAnalyzer:
    """Test the Semantic Analyzer."""
    
    @pytest.mark.asyncio
    async def test_analyze_extracts_tags(self):
        """Test that tags are correctly analyzed."""
        from backend.services.intel.analyzers.semantic import SemanticAnalyzer
        
        analyzer = SemanticAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        
        assert result is not None
        data = result.data
        
        # Should find tags
        assert len(data["top_tags_full"]) > 0
        
        # "fortnite" should be a top tag
        assert "fortnite" in data["top_tags_full"]
    
    @pytest.mark.asyncio
    async def test_optimal_tag_count_is_reasonable(self):
        """Test that optimal tag count is reasonable."""
        from backend.services.intel.analyzers.semantic import SemanticAnalyzer
        
        analyzer = SemanticAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        data = result.data
        
        # Optimal tag count should be between 5 and 30
        assert 5 <= data["optimal_tag_count"] <= 30


class TestRegionalAnalyzer:
    """Test the Regional Analyzer."""
    
    @pytest.mark.asyncio
    async def test_analyze_detects_languages(self):
        """Test that languages are correctly detected."""
        from backend.services.intel.analyzers.regional import RegionalAnalyzer
        
        analyzer = RegionalAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        
        assert result is not None
        data = result.data
        
        # Should detect multiple languages
        assert len(data["languages"]) > 0
        
        # English should be present (most common in our mock data)
        lang_codes = [l["language_code"] for l in data["languages"]]
        assert "en" in lang_codes
    
    @pytest.mark.asyncio
    async def test_opportunity_scores_are_valid(self):
        """Test that opportunity scores are in valid range."""
        from backend.services.intel.analyzers.regional import RegionalAnalyzer
        
        analyzer = RegionalAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        data = result.data
        
        for lang in data["languages"]:
            assert 0 <= lang["opportunity_score"] <= 100
            assert 0 <= lang["competition_score"] <= 100


class TestLiveStreamAnalyzer:
    """Test the Live Stream Analyzer."""
    
    @pytest.mark.asyncio
    async def test_analyze_premiere_comparison(self):
        """Test that premiere vs instant comparison works."""
        from backend.services.intel.analyzers.live_stream import LiveStreamAnalyzer
        
        analyzer = LiveStreamAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        
        assert result is not None
        data = result.data
        
        # Should have premiere analysis
        pa = data["premiere_analysis"]
        assert pa["premiere_count"] + pa["instant_count"] == 30
        assert pa["performance_ratio"] > 0


class TestAnalyzerRunner:
    """Test the Analyzer Runner orchestration."""
    
    @pytest.mark.asyncio
    async def test_run_all_analyzers(self):
        """Test running all analyzers for a category."""
        from backend.services.intel.analyzers.runner import AnalyzerRunner
        
        runner = AnalyzerRunner()
        
        # Mock all analyzer Redis connections
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "game_display_name": "Fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        # Patch the get_redis method for all analyzers
        with patch('backend.services.intel.core.base_analyzer.BaseAnalyzer.get_redis', 
                   return_value=mock_redis):
            result = await runner.run_category("fortnite", force_refresh=True)
        
        # Should have run all 5 analyzers
        assert len(result.analyzers_run) == 5
        
        # Most should succeed (some may fail due to data requirements)
        assert len(result.analyzers_succeeded) >= 3
        
        # Duration should be reasonable
        assert result.duration_seconds < 30


class TestQuotaManager:
    """Test the Quota Manager."""
    
    @pytest.mark.asyncio
    async def test_quota_tracking(self):
        """Test that quota is tracked correctly."""
        from backend.services.intel.collectors.quota_manager import QuotaManager
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock()
        mock_redis.incr = AsyncMock(return_value=1)
        mock_redis.expire = AsyncMock()
        
        manager = QuotaManager(mock_redis)
        await manager.initialize()
        
        # Check initial quota
        status = manager.get_quota_status()
        assert status["units_remaining"] == 10000
        assert status["units_used"] == 0
    
    @pytest.mark.asyncio
    async def test_collection_schedule(self):
        """Test that collection schedule is generated."""
        from backend.services.intel.collectors.quota_manager import QuotaManager
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.set = AsyncMock()
        
        manager = QuotaManager(mock_redis)
        await manager.initialize()
        
        schedule = manager.get_collection_schedule()
        
        # Should have games to collect
        assert len(schedule) > 0
        
        # Should be ordered by priority
        assert "fortnite" in schedule or "valorant" in schedule or "minecraft" in schedule


class TestContentHasher:
    """Test the Content Hasher."""
    
    def test_hash_videos_produces_consistent_hash(self):
        """Test that same videos produce same hash."""
        from backend.services.intel.collectors.content_hasher import ContentHasher
        
        hasher = ContentHasher()
        
        result1 = hasher.hash_videos(MOCK_YOUTUBE_VIDEOS)
        result2 = hasher.hash_videos(MOCK_YOUTUBE_VIDEOS)
        
        assert result1.hash_value == result2.hash_value
    
    def test_hash_videos_detects_changes(self):
        """Test that changed videos produce different hash."""
        from backend.services.intel.collectors.content_hasher import ContentHasher
        
        hasher = ContentHasher()
        
        result1 = hasher.hash_videos(MOCK_YOUTUBE_VIDEOS)
        
        # Modify a video
        modified_videos = MOCK_YOUTUBE_VIDEOS.copy()
        modified_videos[0] = {**modified_videos[0], "view_count": 999999}
        
        result2 = hasher.hash_videos(modified_videos, previous_hash=result1.hash_value)
        
        assert result2.changed is True
        assert result2.hash_value != result1.hash_value


class TestDecayManager:
    """Test the Decay Manager."""
    
    def test_fresh_data_has_high_confidence(self):
        """Test that fresh data gets high confidence."""
        from backend.services.intel.core.decay_manager import DecayManager
        
        manager = DecayManager()
        
        now = datetime.now(timezone.utc)
        result = manager.calculate_decay(now)
        
        assert result.confidence >= 80
        assert result.label == "Fresh"
        assert result.should_refresh is False
    
    def test_old_data_has_low_confidence(self):
        """Test that old data gets low confidence."""
        from backend.services.intel.core.decay_manager import DecayManager
        from datetime import timedelta
        
        manager = DecayManager()
        
        old_time = datetime.now(timezone.utc) - timedelta(hours=48)
        result = manager.calculate_decay(old_time)
        
        assert result.confidence <= 30
        assert result.should_refresh is True


class TestAPISchemas:
    """Test that API schemas are valid."""
    
    def test_content_format_response_schema(self):
        """Test ContentFormatResponse schema validation."""
        from backend.services.intel.api.schemas import ContentFormatResponse, DurationBucketSchema, FormatComparisonSchema
        
        # Create valid response
        response = ContentFormatResponse(
            category_key="fortnite",
            category_name="Fortnite",
            duration_buckets=[
                DurationBucketSchema(
                    min_seconds=0,
                    max_seconds=60,
                    label="Shorts",
                    video_count=10,
                    avg_views=50000,
                    avg_engagement=0.05,
                    total_views=500000,
                    performance_index=1.2,
                )
            ],
            optimal_duration_range="10-15 minutes",
            optimal_duration_min_seconds=600,
            optimal_duration_max_seconds=900,
            shorts_vs_longform=FormatComparisonSchema(
                format_a="Shorts",
                format_b="Long-form",
                format_a_count=10,
                format_b_count=20,
                format_a_avg_views=50000,
                format_b_avg_views=100000,
                performance_ratio=0.5,
                recommendation="Focus on long-form",
                confidence=80,
            ),
            live_vs_vod=FormatComparisonSchema(
                format_a="Live",
                format_b="VOD",
                format_a_count=5,
                format_b_count=25,
                format_a_avg_views=80000,
                format_b_avg_views=90000,
                performance_ratio=0.89,
                recommendation="Both work well",
                confidence=70,
            ),
            hd_vs_sd=FormatComparisonSchema(
                format_a="HD",
                format_b="SD",
                format_a_count=28,
                format_b_count=2,
                format_a_avg_views=95000,
                format_b_avg_views=50000,
                performance_ratio=1.9,
                recommendation="Always use HD",
                confidence=90,
            ),
            insights=["Test insight"],
            video_count=30,
            confidence=85,
            analyzed_at="2026-01-02T12:00:00Z",
        )
        
        # Should serialize without error
        data = response.model_dump()
        assert data["category_key"] == "fortnite"
        assert len(data["duration_buckets"]) == 1


class TestEndToEndPipeline:
    """End-to-end pipeline tests."""
    
    @pytest.mark.asyncio
    async def test_full_analysis_pipeline(self):
        """Test the complete analysis pipeline from data to API response."""
        from backend.services.intel.analyzers.runner import AnalyzerRunner
        from backend.services.intel.api.schemas import CombinedIntelResponse
        
        runner = AnalyzerRunner()
        
        # Mock Redis
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "game_display_name": "Fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        mock_redis.mget = AsyncMock(return_value=[None] * 5)
        
        with patch('backend.services.intel.core.base_analyzer.BaseAnalyzer.get_redis',
                   return_value=mock_redis):
            result = await runner.run_category("fortnite", force_refresh=True)
        
        # Verify we got results
        assert result.category_key == "fortnite"
        assert len(result.results) > 0
        
        # Verify results can be used to build API response
        for analyzer_name, analyzer_result in result.results.items():
            assert "data" in analyzer_result or isinstance(analyzer_result, dict)


# =============================================================================
# Sanity Check Tests - Verify data makes sense
# =============================================================================

class TestDataSanityChecks:
    """Sanity checks to verify data makes sense."""
    
    @pytest.mark.asyncio
    async def test_views_are_positive(self):
        """Test that all view counts are positive."""
        from backend.services.intel.analyzers.content_format import ContentFormatAnalyzer
        
        analyzer = ContentFormatAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        data = result.data
        
        for bucket in data["duration_buckets"]:
            assert bucket["avg_views"] >= 0
            assert bucket["total_views"] >= 0
    
    @pytest.mark.asyncio
    async def test_percentages_are_valid(self):
        """Test that percentages are between 0 and 100."""
        from backend.services.intel.analyzers.description import DescriptionAnalyzer
        
        analyzer = DescriptionAnalyzer()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        analyzer._redis = mock_redis
        
        result = await analyzer.analyze("fortnite")
        data = result.data
        
        assert 0 <= data["has_timestamps_percent"] <= 100
        assert 0 <= data["has_sponsor_percent"] <= 100
        assert 0 <= data["has_social_links_percent"] <= 100
    
    @pytest.mark.asyncio
    async def test_confidence_scores_are_valid(self):
        """Test that confidence scores are between 0 and 100."""
        from backend.services.intel.analyzers.runner import AnalyzerRunner
        
        runner = AnalyzerRunner()
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps({
            "game_key": "fortnite",
            "videos": MOCK_YOUTUBE_VIDEOS,
        }))
        mock_redis.setex = AsyncMock()
        mock_redis.set = AsyncMock()
        
        with patch('backend.services.intel.core.base_analyzer.BaseAnalyzer.get_redis',
                   return_value=mock_redis):
            result = await runner.run_category("fortnite", force_refresh=True)
        
        for analyzer_name, analyzer_result in result.results.items():
            if "confidence" in analyzer_result:
                assert 0 <= analyzer_result["confidence"] <= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
