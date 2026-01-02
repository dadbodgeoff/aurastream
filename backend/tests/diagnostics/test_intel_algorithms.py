"""
Intelligence Algorithms Diagnostic Test Suite

Comprehensive end-to-end validation of all AuraStream intelligence algorithms.
Tests data flow, output quality, and identifies issues requiring attention.

REQUIREMENTS:
    - Redis must be running (docker compose up redis)
    - Environment variables must be set (source backend/.env or run in Docker)

Run with Docker (recommended):
    docker compose exec api python -m backend.tests.diagnostics.test_intel_algorithms

Run locally (requires Redis + env vars):
    source backend/.env && python -m backend.tests.diagnostics.test_intel_algorithms

Or specific tests:
    docker compose exec api python -m backend.tests.diagnostics.test_intel_algorithms --test title_intel

Output: Detailed diagnostic report with pass/fail/warning status for each component.
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

# Load .env file if running locally
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
except ImportError:
    pass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


class TestStatus(Enum):
    PASS = "✅ PASS"
    WARN = "⚠️ WARN"
    FAIL = "❌ FAIL"
    SKIP = "⏭️ SKIP"


@dataclass
class TestResult:
    """Result of a single diagnostic test."""
    name: str
    status: TestStatus
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    recommendations: List[str] = field(default_factory=list)
    duration_ms: float = 0


@dataclass
class DiagnosticReport:
    """Complete diagnostic report."""
    timestamp: str
    total_tests: int = 0
    passed: int = 0
    warnings: int = 0
    failed: int = 0
    skipped: int = 0
    results: List[TestResult] = field(default_factory=list)
    overall_health: str = "UNKNOWN"
    
    def add_result(self, result: TestResult):
        self.results.append(result)
        self.total_tests += 1
        if result.status == TestStatus.PASS:
            self.passed += 1
        elif result.status == TestStatus.WARN:
            self.warnings += 1
        elif result.status == TestStatus.FAIL:
            self.failed += 1
        else:
            self.skipped += 1
    
    def calculate_health(self):
        if self.failed > 0:
            self.overall_health = "CRITICAL"
        elif self.warnings > 2:
            self.overall_health = "DEGRADED"
        elif self.warnings > 0:
            self.overall_health = "HEALTHY (minor issues)"
        else:
            self.overall_health = "HEALTHY"


# =============================================================================
# Test Configuration
# =============================================================================

TRACKED_GAMES = ["fortnite", "valorant", "minecraft", "apex_legends", "warzone", "gta", "roblox"]
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")


# =============================================================================
# Redis Connection
# =============================================================================

async def get_redis():
    """Get async Redis client."""
    import redis.asyncio as redis
    return redis.from_url(REDIS_URL, decode_responses=True)


# =============================================================================
# Test 1: YouTube Data Source
# =============================================================================

async def test_youtube_data_source() -> TestResult:
    """Test YouTube data availability and freshness."""
    start = datetime.now()
    
    try:
        redis_client = await get_redis()
        
        games_with_data = []
        games_missing = []
        stale_games = []
        total_videos = 0
        freshness_hours = {}
        
        for game in TRACKED_GAMES:
            key = f"youtube:games:{game}"
            data = await redis_client.get(key)
            
            if not data:
                games_missing.append(game)
                continue
            
            parsed = json.loads(data)
            videos = parsed.get("videos", [])
            fetched_at = parsed.get("fetched_at")
            
            if not videos:
                games_missing.append(game)
                continue
            
            games_with_data.append(game)
            total_videos += len(videos)
            
            # Check freshness
            if fetched_at:
                try:
                    fetch_time = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
                    hours_old = (datetime.now(timezone.utc) - fetch_time).total_seconds() / 3600
                    freshness_hours[game] = round(hours_old, 1)
                    if hours_old > 48:
                        stale_games.append(game)
                except:
                    pass
        
        await redis_client.close()
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        # Determine status
        if len(games_missing) == len(TRACKED_GAMES):
            return TestResult(
                name="YouTube Data Source",
                status=TestStatus.FAIL,
                message="No YouTube data found for any game",
                details={"games_missing": games_missing},
                recommendations=[
                    "Run: python -m backend.workers.youtube_worker --once --force",
                    "Check GOOGLE_API_KEY environment variable",
                ],
                duration_ms=duration,
            )
        
        if games_missing:
            return TestResult(
                name="YouTube Data Source",
                status=TestStatus.WARN,
                message=f"Missing data for {len(games_missing)} games",
                details={
                    "games_with_data": games_with_data,
                    "games_missing": games_missing,
                    "total_videos": total_videos,
                    "freshness_hours": freshness_hours,
                },
                recommendations=[f"Run youtube_worker to fetch data for: {', '.join(games_missing)}"],
                duration_ms=duration,
            )
        
        if stale_games:
            return TestResult(
                name="YouTube Data Source",
                status=TestStatus.WARN,
                message=f"Stale data (>48h) for {len(stale_games)} games",
                details={
                    "games_with_data": games_with_data,
                    "stale_games": stale_games,
                    "total_videos": total_videos,
                    "freshness_hours": freshness_hours,
                },
                recommendations=["Run youtube_worker to refresh stale data"],
                duration_ms=duration,
            )
        
        return TestResult(
            name="YouTube Data Source",
            status=TestStatus.PASS,
            message=f"All {len(games_with_data)} games have fresh data ({total_videos} total videos)",
            details={
                "games_with_data": games_with_data,
                "total_videos": total_videos,
                "freshness_hours": freshness_hours,
            },
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="YouTube Data Source",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            recommendations=["Check Redis connection", "Verify REDIS_URL environment variable"],
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 2: Twitch Streams Data
# =============================================================================

async def test_twitch_streams_data() -> TestResult:
    """Test Twitch streams data availability."""
    start = datetime.now()
    
    TWITCH_GAME_IDS = {
        "fortnite": "33214",
        "valorant": "516575",
        "minecraft": "27471",
        "apex_legends": "511224",
        "warzone": "512710",
        "gta": "32982",
        "roblox": "23020",
    }
    
    try:
        redis_client = await get_redis()
        
        games_with_data = []
        games_missing = []
        total_streams = 0
        total_viewers = 0
        
        for game, twitch_id in TWITCH_GAME_IDS.items():
            key = f"twitch:streams:{twitch_id}"
            data = await redis_client.get(key)
            
            if not data:
                games_missing.append(game)
                continue
            
            parsed = json.loads(data)
            stream_count = parsed.get("stream_count", 0)
            viewers = parsed.get("total_viewers", 0)
            
            if stream_count > 0:
                games_with_data.append(game)
                total_streams += stream_count
                total_viewers += viewers
            else:
                games_missing.append(game)
        
        await redis_client.close()
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        if len(games_missing) == len(TWITCH_GAME_IDS):
            return TestResult(
                name="Twitch Streams Data",
                status=TestStatus.WARN,
                message="No Twitch stream data cached (competition analyzer will use baseline estimates)",
                details={"games_missing": games_missing},
                recommendations=[
                    "Run: python -m backend.workers.twitch_streams_worker --once",
                    "Check TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET",
                ],
                duration_ms=duration,
            )
        
        if games_missing:
            return TestResult(
                name="Twitch Streams Data",
                status=TestStatus.WARN,
                message=f"Missing stream data for {len(games_missing)} games",
                details={
                    "games_with_data": games_with_data,
                    "games_missing": games_missing,
                    "total_streams": total_streams,
                    "total_viewers": total_viewers,
                },
                duration_ms=duration,
            )
        
        return TestResult(
            name="Twitch Streams Data",
            status=TestStatus.PASS,
            message=f"All games have stream data ({total_streams:,} streams, {total_viewers:,} viewers)",
            details={
                "games_with_data": games_with_data,
                "total_streams": total_streams,
                "total_viewers": total_viewers,
            },
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="Twitch Streams Data",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 3: Title Intel Algorithm
# =============================================================================

async def test_title_intel_algorithm() -> TestResult:
    """Test title intel analysis quality."""
    start = datetime.now()
    
    try:
        from backend.services.title_intel import get_title_intel_analyzer
        
        analyzer = get_title_intel_analyzer()
        
        # Test with one game
        test_game = "fortnite"
        intel = await analyzer.analyze_game(test_game)
        
        if not intel:
            return TestResult(
                name="Title Intel Algorithm",
                status=TestStatus.FAIL,
                message=f"No analysis returned for {test_game}",
                recommendations=["Ensure YouTube data exists for this game"],
                duration_ms=(datetime.now() - start).total_seconds() * 1000,
            )
        
        # Quality checks
        issues = []
        quality_metrics = {
            "video_count": intel.video_count,
            "keywords_count": len(intel.top_keywords),
            "phrases_count": len(intel.top_phrases),
            "tags_count": len(intel.top_tags),
            "suggestions_count": len(intel.title_suggestions),
            "data_confidence": intel.data_confidence,
            "data_freshness_hours": intel.data_freshness_hours,
        }
        
        # Check minimum thresholds
        if intel.video_count < 10:
            issues.append(f"Low video count: {intel.video_count} (need 10+)")
        if len(intel.top_keywords) < 5:
            issues.append(f"Few keywords extracted: {len(intel.top_keywords)} (need 5+)")
        if intel.data_confidence < 40:
            issues.append(f"Low confidence: {intel.data_confidence}% (need 40%+)")
        if intel.data_freshness_hours > 48:
            issues.append(f"Stale data: {intel.data_freshness_hours}h old (need <48h)")
        
        # Check keyword quality
        trending_keywords = [k for k in intel.top_keywords if k.is_trending]
        quality_metrics["trending_keywords"] = len(trending_keywords)
        
        # Check for game-name-only keywords (low quality)
        game_name_keywords = [k for k in intel.top_keywords if k.keyword.lower() == test_game.lower()]
        if len(game_name_keywords) > 2:
            issues.append("Too many generic game-name keywords")
        
        await analyzer.close()
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        if issues:
            return TestResult(
                name="Title Intel Algorithm",
                status=TestStatus.WARN,
                message=f"Analysis works but has {len(issues)} quality issues",
                details=quality_metrics,
                recommendations=issues,
                duration_ms=duration,
            )
        
        return TestResult(
            name="Title Intel Algorithm",
            status=TestStatus.PASS,
            message=f"High-quality analysis: {len(intel.top_keywords)} keywords, {intel.data_confidence}% confidence",
            details=quality_metrics,
            duration_ms=duration,
        )
        
    except ImportError as e:
        return TestResult(
            name="Title Intel Algorithm",
            status=TestStatus.FAIL,
            message=f"Import error: {str(e)}",
            recommendations=["Check backend/services/title_intel module"],
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )
    except Exception as e:
        return TestResult(
            name="Title Intel Algorithm",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 4: Viral Detector Algorithm
# =============================================================================

async def test_viral_detector_algorithm() -> TestResult:
    """Test viral detection quality."""
    start = datetime.now()
    
    try:
        from backend.services.intel.viral_detector import get_viral_detector
        
        detector = get_viral_detector()
        
        test_game = "fortnite"
        analysis = await detector.analyze_category(test_game)
        
        if not analysis:
            return TestResult(
                name="Viral Detector Algorithm",
                status=TestStatus.FAIL,
                message=f"No analysis returned for {test_game}",
                duration_ms=(datetime.now() - start).total_seconds() * 1000,
            )
        
        quality_metrics = {
            "viral_video_count": analysis.viral_video_count,
            "rising_video_count": analysis.rising_video_count,
            "avg_velocity": round(analysis.avg_velocity, 2),
            "max_velocity": round(analysis.max_velocity, 2),
            "opportunity_score": analysis.opportunity_score,
            "trending_topics": analysis.trending_topics[:5],
            "trending_tags": analysis.trending_tags[:5],
            "confidence": analysis.confidence,
        }
        
        issues = []
        
        # Quality checks
        if analysis.confidence < 30:
            issues.append(f"Low confidence: {analysis.confidence}% (data may be stale)")
        if analysis.avg_velocity == 0:
            issues.append("Zero average velocity - velocity calculation may be broken")
        if not analysis.trending_topics:
            issues.append("No trending topics extracted")
        
        await detector.close()
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        if issues:
            return TestResult(
                name="Viral Detector Algorithm",
                status=TestStatus.WARN,
                message=f"Analysis works but has {len(issues)} issues",
                details=quality_metrics,
                recommendations=issues,
                duration_ms=duration,
            )
        
        return TestResult(
            name="Viral Detector Algorithm",
            status=TestStatus.PASS,
            message=f"Detected {analysis.viral_video_count} viral + {analysis.rising_video_count} rising videos",
            details=quality_metrics,
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="Viral Detector Algorithm",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 5: Video Idea Generator
# =============================================================================

async def test_video_idea_generator() -> TestResult:
    """Test video idea generation quality."""
    start = datetime.now()
    
    try:
        from backend.services.intel.video_idea_generator import get_video_idea_generator
        
        generator = get_video_idea_generator()
        
        test_game = "fortnite"
        response = await generator.generate_ideas(test_game, max_ideas=5)
        
        if not response:
            return TestResult(
                name="Video Idea Generator",
                status=TestStatus.FAIL,
                message=f"No ideas generated for {test_game}",
                recommendations=["Check that title_intel and viral_detector are working"],
                duration_ms=(datetime.now() - start).total_seconds() * 1000,
            )
        
        quality_metrics = {
            "ideas_count": len(response.ideas),
            "overall_opportunity": response.overall_opportunity,
            "data_freshness_hours": response.data_freshness_hours,
        }
        
        issues = []
        
        # Check idea quality
        if len(response.ideas) < 3:
            issues.append(f"Only {len(response.ideas)} ideas generated (expected 5)")
        
        # Check for duplicate concepts
        concepts = [idea.concept for idea in response.ideas]
        if len(concepts) != len(set(concepts)):
            issues.append("Duplicate concepts detected")
        
        # Check confidence scores
        low_confidence_ideas = [i for i in response.ideas if i.confidence < 50]
        if len(low_confidence_ideas) > 2:
            issues.append(f"{len(low_confidence_ideas)} ideas have low confidence (<50%)")
        
        # Sample idea details
        if response.ideas:
            sample_idea = response.ideas[0]
            quality_metrics["sample_idea"] = {
                "concept": sample_idea.concept[:80],
                "hook": sample_idea.hook[:60],
                "opportunity_score": sample_idea.opportunity_score,
                "confidence": sample_idea.confidence,
            }
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        if issues:
            return TestResult(
                name="Video Idea Generator",
                status=TestStatus.WARN,
                message=f"Generated {len(response.ideas)} ideas with {len(issues)} quality issues",
                details=quality_metrics,
                recommendations=issues,
                duration_ms=duration,
            )
        
        return TestResult(
            name="Video Idea Generator",
            status=TestStatus.PASS,
            message=f"Generated {len(response.ideas)} high-quality ideas",
            details=quality_metrics,
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="Video Idea Generator",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 6: Competition Analyzer
# =============================================================================

async def test_competition_analyzer() -> TestResult:
    """Test competition analysis quality."""
    start = datetime.now()
    
    try:
        from backend.services.intel.competition_analyzer import get_competition_analyzer
        
        analyzer = get_competition_analyzer()
        
        test_game = "fortnite"
        analysis = await analyzer.analyze_category(
            category_key=test_game,
            twitch_id="33214",
            category_name="Fortnite",
        )
        
        if not analysis:
            return TestResult(
                name="Competition Analyzer",
                status=TestStatus.FAIL,
                message=f"No analysis returned for {test_game}",
                duration_ms=(datetime.now() - start).total_seconds() * 1000,
            )
        
        quality_metrics = {
            "live_stream_count": analysis.live_stream_count,
            "total_viewers": analysis.total_viewers,
            "avg_viewers_per_stream": analysis.avg_viewers_per_stream,
            "opportunity_score": analysis.opportunity_score,
            "stream_saturation_score": analysis.stream_saturation_score,
            "viewer_concentration_score": analysis.viewer_concentration_score,
            "confidence": analysis.confidence,
            "data_source": analysis.data_source,
            "is_peak_hours": analysis.is_peak_hours,
        }
        
        issues = []
        
        # Check data source
        if analysis.data_source == "baseline_estimate":
            issues.append("Using baseline estimates (no live Twitch data)")
        
        # Check confidence
        if analysis.confidence < 40:
            issues.append(f"Low confidence: {analysis.confidence}%")
        
        # Sanity checks
        if analysis.live_stream_count == 0 and analysis.data_source != "baseline_estimate":
            issues.append("Zero streams reported but not using baseline")
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        if issues:
            return TestResult(
                name="Competition Analyzer",
                status=TestStatus.WARN,
                message=f"Analysis works but has {len(issues)} issues",
                details=quality_metrics,
                recommendations=issues,
                duration_ms=duration,
            )
        
        return TestResult(
            name="Competition Analyzer",
            status=TestStatus.PASS,
            message=f"Real-time analysis: {analysis.live_stream_count:,} streams, {analysis.confidence}% confidence",
            details=quality_metrics,
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="Competition Analyzer",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 7: Daily Insight Generator
# =============================================================================

async def test_daily_insight_generator() -> TestResult:
    """Test daily insight generation."""
    start = datetime.now()
    
    try:
        from backend.services.intel.daily_insight_generator import get_daily_insight_generator
        
        generator = get_daily_insight_generator()
        
        # Simulate subscribed categories
        subscribed = [
            {"key": "fortnite", "name": "Fortnite", "twitch_id": "33214"},
            {"key": "valorant", "name": "Valorant", "twitch_id": "516575"},
        ]
        
        insight = await generator.generate_insight(subscribed)
        
        if not insight:
            return TestResult(
                name="Daily Insight Generator",
                status=TestStatus.WARN,
                message="No insight generated (may need more data)",
                recommendations=["Ensure YouTube and Twitch data is available"],
                duration_ms=(datetime.now() - start).total_seconds() * 1000,
            )
        
        quality_metrics = {
            "insight_type": insight.insight_type,
            "headline": insight.headline[:80],
            "category": insight.category,
            "metric_value": insight.metric_value,
            "confidence": insight.confidence,
            "data_source": insight.data_source,
        }
        
        issues = []
        
        if insight.confidence < 50:
            issues.append(f"Low confidence insight: {insight.confidence}%")
        
        # Check headline quality (should be specific, not generic)
        generic_phrases = ["perfect timing", "great opportunity", "good time"]
        if any(phrase in insight.headline.lower() for phrase in generic_phrases):
            issues.append("Headline may be too generic")
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        if issues:
            return TestResult(
                name="Daily Insight Generator",
                status=TestStatus.WARN,
                message=f"Insight generated with {len(issues)} quality issues",
                details=quality_metrics,
                recommendations=issues,
                duration_ms=duration,
            )
        
        return TestResult(
            name="Daily Insight Generator",
            status=TestStatus.PASS,
            message=f"Generated specific insight: {insight.insight_type}",
            details=quality_metrics,
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="Daily Insight Generator",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 8: Mission Generator
# =============================================================================

async def test_mission_generator() -> TestResult:
    """Test mission generation quality."""
    start = datetime.now()
    
    try:
        from backend.services.intel.mission_generator import get_mission_generator
        
        generator = get_mission_generator()
        
        # Simulate user with subscribed categories
        subscribed = [
            {"key": "fortnite", "name": "Fortnite", "twitch_id": "33214"},
            {"key": "valorant", "name": "Valorant", "twitch_id": "516575"},
        ]
        
        mission = await generator.generate_mission(
            user_id="test-user-123",
            subscribed_categories=subscribed,
            timezone="America/New_York",
        )
        
        if not mission:
            return TestResult(
                name="Mission Generator",
                status=TestStatus.FAIL,
                message="No mission generated",
                duration_ms=(datetime.now() - start).total_seconds() * 1000,
            )
        
        quality_metrics = {
            "recommendation": mission.get("recommendation", "")[:80],
            "category": mission.get("category"),
            "confidence": mission.get("confidence"),
            "suggested_title": mission.get("suggested_title", "")[:60],
            "factors": mission.get("factors", {}),
            "trending_topics": mission.get("trending_topics", [])[:3],
        }
        
        issues = []
        
        if mission.get("confidence", 0) < 40:
            issues.append(f"Low confidence mission: {mission.get('confidence')}%")
        
        if not mission.get("suggested_title"):
            issues.append("No suggested title generated")
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        if issues:
            return TestResult(
                name="Mission Generator",
                status=TestStatus.WARN,
                message=f"Mission generated with {len(issues)} issues",
                details=quality_metrics,
                recommendations=issues,
                duration_ms=duration,
            )
        
        return TestResult(
            name="Mission Generator",
            status=TestStatus.PASS,
            message=f"Generated mission for {mission.get('category_name')} ({mission.get('confidence')}% confidence)",
            details=quality_metrics,
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="Mission Generator",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 9: Scoring Engine
# =============================================================================

async def test_scoring_engine() -> TestResult:
    """Test scoring engine and category stats."""
    start = datetime.now()
    
    try:
        from backend.services.intel.scoring_engine import get_scoring_engine
        
        engine = get_scoring_engine()
        
        test_game = "fortnite"
        stats = await engine.build_category_stats(test_game)
        
        if not stats:
            return TestResult(
                name="Scoring Engine",
                status=TestStatus.FAIL,
                message=f"No stats built for {test_game}",
                recommendations=["Ensure YouTube data exists"],
                duration_ms=(datetime.now() - start).total_seconds() * 1000,
            )
        
        quality_metrics = {
            "sample_count": stats.sample_count,
            "view_mean": round(stats.view_mean, 0),
            "view_std": round(stats.view_std, 0),
            "view_p50": round(stats.view_p50, 0),
            "view_p90": round(stats.view_p90, 0),
            "velocity_mean": round(stats.velocity_mean, 2),
            "velocity_p90": round(stats.velocity_p90, 2),
            "outliers_removed": stats.outliers_removed,
        }
        
        issues = []
        
        if stats.sample_count < 10:
            issues.append(f"Low sample count: {stats.sample_count}")
        
        if stats.view_std == 0:
            issues.append("Zero standard deviation - all videos have same views?")
        
        # Test scoring functions
        z_score = engine.calculate_z_score(stats.view_p90, stats.view_mean, stats.view_std)
        quality_metrics["test_z_score"] = round(z_score, 2)
        
        await engine.close()
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        if issues:
            return TestResult(
                name="Scoring Engine",
                status=TestStatus.WARN,
                message=f"Stats built with {len(issues)} issues",
                details=quality_metrics,
                recommendations=issues,
                duration_ms=duration,
            )
        
        return TestResult(
            name="Scoring Engine",
            status=TestStatus.PASS,
            message=f"Built stats from {stats.sample_count} videos",
            details=quality_metrics,
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="Scoring Engine",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 10: Playbook Generation
# =============================================================================

async def test_playbook_generation() -> TestResult:
    """Test playbook generation quality."""
    start = datetime.now()
    
    try:
        from backend.services.playbook import get_playbook_service
        
        service = get_playbook_service()
        
        # Generate playbook (don't save to DB for test)
        playbook = await service.generate_playbook(save_to_db=False)
        
        if not playbook:
            return TestResult(
                name="Playbook Generation",
                status=TestStatus.FAIL,
                message="No playbook generated",
                duration_ms=(datetime.now() - start).total_seconds() * 1000,
            )
        
        quality_metrics = {
            "headline": playbook.headline[:80] if playbook.headline else "None",
            "mood": playbook.mood,
            "golden_hours_count": len(playbook.golden_hours),
            "niche_opportunities_count": len(playbook.niche_opportunities),
            "viral_hooks_count": len(playbook.viral_hooks),
            "strategies_count": len(playbook.strategies),
            "insight_cards_count": len(playbook.insight_cards),
        }
        
        issues = []
        
        if not playbook.headline:
            issues.append("No headline generated")
        if len(playbook.golden_hours) == 0:
            issues.append("No golden hours identified")
        if len(playbook.viral_hooks) == 0:
            issues.append("No viral hooks extracted")
        if len(playbook.strategies) == 0:
            issues.append("No strategies generated")
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        if issues:
            return TestResult(
                name="Playbook Generation",
                status=TestStatus.WARN,
                message=f"Playbook generated with {len(issues)} missing sections",
                details=quality_metrics,
                recommendations=issues,
                duration_ms=duration,
            )
        
        return TestResult(
            name="Playbook Generation",
            status=TestStatus.PASS,
            message=f"Full playbook: {len(playbook.strategies)} strategies, {len(playbook.viral_hooks)} hooks",
            details=quality_metrics,
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="Playbook Generation",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Test 11: Pre-computed Intel Cache (from creator_intel_worker)
# =============================================================================

async def test_precomputed_intel_cache() -> TestResult:
    """Test pre-computed intel from creator_intel_worker."""
    start = datetime.now()
    
    try:
        redis_client = await get_redis()
        
        games_with_title_intel = []
        games_with_video_ideas = []
        games_with_viral = []
        
        for game in TRACKED_GAMES:
            # Check title intel
            title_key = f"intel:title:precomputed:{game}"
            if await redis_client.exists(title_key):
                games_with_title_intel.append(game)
            
            # Check video ideas
            ideas_key = f"intel:video_ideas:precomputed:{game}"
            if await redis_client.exists(ideas_key):
                games_with_video_ideas.append(game)
            
            # Check viral
            viral_key = f"intel:viral:precomputed:{game}"
            if await redis_client.exists(viral_key):
                games_with_viral.append(game)
        
        # Check last run
        last_run = await redis_client.get("intel:worker:last_run")
        
        await redis_client.close()
        
        duration = (datetime.now() - start).total_seconds() * 1000
        
        quality_metrics = {
            "games_with_title_intel": len(games_with_title_intel),
            "games_with_video_ideas": len(games_with_video_ideas),
            "games_with_viral": len(games_with_viral),
            "last_worker_run": last_run or "Never",
        }
        
        if not last_run:
            return TestResult(
                name="Pre-computed Intel Cache",
                status=TestStatus.WARN,
                message="Creator intel worker has never run",
                details=quality_metrics,
                recommendations=[
                    "Run: python -m backend.workers.creator_intel_worker --once",
                    "Or start the worker in continuous mode",
                ],
                duration_ms=duration,
            )
        
        total_cached = len(games_with_title_intel) + len(games_with_video_ideas) + len(games_with_viral)
        expected = len(TRACKED_GAMES) * 3
        
        if total_cached < expected * 0.5:
            return TestResult(
                name="Pre-computed Intel Cache",
                status=TestStatus.WARN,
                message=f"Only {total_cached}/{expected} cache entries populated",
                details=quality_metrics,
                recommendations=["Run creator_intel_worker to populate cache"],
                duration_ms=duration,
            )
        
        return TestResult(
            name="Pre-computed Intel Cache",
            status=TestStatus.PASS,
            message=f"Cache populated: {total_cached}/{expected} entries",
            details=quality_metrics,
            duration_ms=duration,
        )
        
    except Exception as e:
        return TestResult(
            name="Pre-computed Intel Cache",
            status=TestStatus.FAIL,
            message=f"Error: {str(e)}",
            duration_ms=(datetime.now() - start).total_seconds() * 1000,
        )


# =============================================================================
# Report Generation
# =============================================================================

def print_report(report: DiagnosticReport):
    """Print formatted diagnostic report."""
    print("\n" + "=" * 80)
    print("🔬 AURASTREAM INTELLIGENCE ALGORITHMS DIAGNOSTIC REPORT")
    print("=" * 80)
    print(f"Timestamp: {report.timestamp}")
    print(f"Overall Health: {report.overall_health}")
    print(f"Tests: {report.passed} passed, {report.warnings} warnings, {report.failed} failed, {report.skipped} skipped")
    print("=" * 80)
    
    for result in report.results:
        print(f"\n{result.status.value} {result.name}")
        print(f"   {result.message}")
        print(f"   Duration: {result.duration_ms:.0f}ms")
        
        if result.details:
            print("   Details:")
            for key, value in result.details.items():
                if isinstance(value, dict):
                    print(f"      {key}:")
                    for k, v in value.items():
                        print(f"         {k}: {v}")
                elif isinstance(value, list) and len(value) > 5:
                    print(f"      {key}: [{len(value)} items]")
                else:
                    print(f"      {key}: {value}")
        
        if result.recommendations:
            print("   Recommendations:")
            for rec in result.recommendations:
                print(f"      → {rec}")
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    if report.failed > 0:
        print("❌ CRITICAL ISSUES FOUND - Some algorithms are not working")
        failed_tests = [r for r in report.results if r.status == TestStatus.FAIL]
        for r in failed_tests:
            print(f"   - {r.name}: {r.message}")
    
    if report.warnings > 0:
        print("⚠️  WARNINGS - Some algorithms need attention")
        warn_tests = [r for r in report.results if r.status == TestStatus.WARN]
        for r in warn_tests:
            print(f"   - {r.name}: {r.message}")
    
    if report.failed == 0 and report.warnings == 0:
        print("✅ ALL SYSTEMS OPERATIONAL - Enterprise-grade performance")
    
    print("=" * 80 + "\n")


# =============================================================================
# Main Runner
# =============================================================================

async def run_all_tests() -> DiagnosticReport:
    """Run all diagnostic tests."""
    report = DiagnosticReport(timestamp=datetime.now(timezone.utc).isoformat())
    
    # Define all tests
    tests = [
        ("youtube_data", test_youtube_data_source),
        ("twitch_streams", test_twitch_streams_data),
        ("title_intel", test_title_intel_algorithm),
        ("viral_detector", test_viral_detector_algorithm),
        ("video_ideas", test_video_idea_generator),
        ("competition", test_competition_analyzer),
        ("daily_insight", test_daily_insight_generator),
        ("mission", test_mission_generator),
        ("scoring", test_scoring_engine),
        ("playbook", test_playbook_generation),
        ("precomputed_cache", test_precomputed_intel_cache),
    ]
    
    for name, test_fn in tests:
        logger.info(f"Running test: {name}...")
        try:
            result = await test_fn()
            report.add_result(result)
        except Exception as e:
            report.add_result(TestResult(
                name=name,
                status=TestStatus.FAIL,
                message=f"Test crashed: {str(e)}",
            ))
    
    report.calculate_health()
    return report


async def run_single_test(test_name: str) -> DiagnosticReport:
    """Run a single test by name."""
    report = DiagnosticReport(timestamp=datetime.now(timezone.utc).isoformat())
    
    test_map = {
        "youtube_data": test_youtube_data_source,
        "twitch_streams": test_twitch_streams_data,
        "title_intel": test_title_intel_algorithm,
        "viral_detector": test_viral_detector_algorithm,
        "video_ideas": test_video_idea_generator,
        "competition": test_competition_analyzer,
        "daily_insight": test_daily_insight_generator,
        "mission": test_mission_generator,
        "scoring": test_scoring_engine,
        "playbook": test_playbook_generation,
        "precomputed_cache": test_precomputed_intel_cache,
    }
    
    if test_name not in test_map:
        print(f"Unknown test: {test_name}")
        print(f"Available tests: {', '.join(test_map.keys())}")
        return report
    
    result = await test_map[test_name]()
    report.add_result(result)
    report.calculate_health()
    return report


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="AuraStream Intelligence Algorithms Diagnostic Suite"
    )
    parser.add_argument(
        "--test",
        type=str,
        default="all",
        help="Specific test to run (or 'all' for all tests)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON",
    )
    
    args = parser.parse_args()
    
    if args.test == "all":
        report = asyncio.run(run_all_tests())
    else:
        report = asyncio.run(run_single_test(args.test))
    
    if args.json:
        output = {
            "timestamp": report.timestamp,
            "overall_health": report.overall_health,
            "summary": {
                "total": report.total_tests,
                "passed": report.passed,
                "warnings": report.warnings,
                "failed": report.failed,
            },
            "results": [
                {
                    "name": r.name,
                    "status": r.status.name,
                    "message": r.message,
                    "details": r.details,
                    "recommendations": r.recommendations,
                    "duration_ms": r.duration_ms,
                }
                for r in report.results
            ],
        }
        print(json.dumps(output, indent=2))
    else:
        print_report(report)
    
    # Exit with error code if failures
    sys.exit(1 if report.failed > 0 else 0)


if __name__ == "__main__":
    main()
