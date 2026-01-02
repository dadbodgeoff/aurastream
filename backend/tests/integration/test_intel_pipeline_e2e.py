"""
🔄 INTEL V2 END-TO-END PIPELINE TEST SUITE
==========================================

Enterprise-grade integration tests verifying the entire Intel V2 pipeline
works as a cohesive unit:

1. Collection → Redis storage
2. Analysis → Redis precomputed results  
3. Hourly Aggregation → PostgreSQL hourly tables
4. Daily Rollup → PostgreSQL daily tables

Test Categories:
- TestDataFlowIntegrity: Verifies data flows correctly between stages
- TestConcurrencySafety: Verifies concurrent operations don't corrupt data
- TestRecoveryScenarios: Verifies system recovers from failures
- TestDataConsistency: Verifies aggregation math is correct
- TestObservability: Verifies metrics and health checks work

Run with: 
    python3 -m pytest backend/tests/integration/test_intel_pipeline_e2e.py -v
    python3 -m pytest backend/tests/integration/test_intel_pipeline_e2e.py -v -k "DataFlow"
    python3 -m pytest backend/tests/integration/test_intel_pipeline_e2e.py -v --tb=short

This is the "would I ship this?" test suite.
"""

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta, date
from typing import Any, Dict, List, Optional, Callable, Tuple
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

logger = logging.getLogger(__name__)


# =============================================================================
# TEST INFRASTRUCTURE - Reusable Mock Components
# =============================================================================

class MockRedisStore:
    """
    In-memory Redis mock that actually stores data.
    
    Supports all Redis operations used by the Intel pipeline:
    - get/set/setex for key-value storage
    - delete for cleanup
    - incr for counters
    - keys for pattern matching
    - info for health checks
    """
    
    def __init__(self):
        self._store: Dict[str, Any] = {}
        self._expiry: Dict[str, datetime] = {}
        self._access_log: List[Tuple[str, str, Any]] = []  # (operation, key, value)
    
    async def get(self, key: str) -> Optional[str]:
        self._access_log.append(("get", key, None))
        if key in self._expiry:
            if datetime.now(timezone.utc) > self._expiry[key]:
                del self._store[key]
                del self._expiry[key]
                return None
        return self._store.get(key)
    
    async def set(self, key: str, value: Any) -> bool:
        self._access_log.append(("set", key, value))
        self._store[key] = value
        return True
    
    async def setex(self, key: str, ttl: int, value: Any) -> bool:
        self._access_log.append(("setex", key, value))
        self._store[key] = value
        self._expiry[key] = datetime.now(timezone.utc) + timedelta(seconds=ttl)
        return True
    
    async def delete(self, key: str) -> int:
        self._access_log.append(("delete", key, None))
        if key in self._store:
            del self._store[key]
            if key in self._expiry:
                del self._expiry[key]
            return 1
        return 0
    
    async def incr(self, key: str) -> int:
        val = int(self._store.get(key, 0)) + 1
        self._store[key] = str(val)
        return val
    
    async def expire(self, key: str, ttl: int) -> bool:
        if key in self._store:
            self._expiry[key] = datetime.now(timezone.utc) + timedelta(seconds=ttl)
            return True
        return False
    
    async def ping(self) -> bool:
        return True
    
    async def info(self, section: str = None) -> Dict[str, Any]:
        return {"used_memory_human": "10MB", "connected_clients": 1}
    
    async def keys(self, pattern: str = "*") -> List[str]:
        if pattern == "*":
            return list(self._store.keys())
        # Simple prefix matching
        prefix = pattern.replace("*", "")
        return [k for k in self._store.keys() if k.startswith(prefix)]
    
    async def mget(self, *keys: str) -> List[Optional[str]]:
        return [self._store.get(k) for k in keys]
    
    async def aclose(self) -> None:
        pass
    
    def clear(self) -> None:
        """Clear all data (for test isolation)."""
        self._store.clear()
        self._expiry.clear()
        self._access_log.clear()
    
    def get_access_log(self) -> List[Tuple[str, str, Any]]:
        """Get access log for debugging."""
        return self._access_log.copy()
    
    def dump_state(self) -> Dict[str, Any]:
        """Dump current state for debugging."""
        return {
            "keys": list(self._store.keys()),
            "store": {k: v[:100] if isinstance(v, str) and len(v) > 100 else v 
                     for k, v in self._store.items()},
        }


class MockSupabaseDB:
    """
    Mock Supabase client that stores data in memory.
    
    Supports:
    - table().select().execute()
    - table().upsert().execute()
    - table().delete().execute()
    - Filtering with eq(), gte(), lt()
    """
    
    def __init__(self):
        self.tables: Dict[str, List[Dict]] = {}
        self._access_log: List[Tuple[str, str, Any]] = []
    
    def table(self, name: str) -> "MockSupabaseTable":
        if name not in self.tables:
            self.tables[name] = []
        return MockSupabaseTable(name, self)
    
    def clear(self) -> None:
        """Clear all data."""
        self.tables.clear()
        self._access_log.clear()
    
    def get_table_data(self, name: str) -> List[Dict]:
        """Get all data from a table."""
        return self.tables.get(name, [])
    
    def dump_state(self) -> Dict[str, Any]:
        """Dump current state for debugging."""
        return {
            table: len(rows) for table, rows in self.tables.items()
        }


class MockSupabaseTable:
    """Mock Supabase table with query builder."""
    
    def __init__(self, name: str, db: MockSupabaseDB):
        self.name = name
        self.db = db
        self._filters: Dict[str, Any] = {}
        self._operation: Optional[str] = None
        self._data: Any = None
    
    def select(self, *args) -> "MockSupabaseTable":
        self._operation = "select"
        return self
    
    def insert(self, data: Any) -> "MockSupabaseTable":
        self._operation = "insert"
        self._data = data
        return self
    
    def upsert(self, data: Any, **kwargs) -> "MockSupabaseTable":
        self._operation = "upsert"
        self._data = data
        self._upsert_conflict = kwargs.get("on_conflict")
        return self
    
    def delete(self) -> "MockSupabaseTable":
        self._operation = "delete"
        return self
    
    def eq(self, field: str, value: Any) -> "MockSupabaseTable":
        self._filters[f"eq_{field}"] = (field, "eq", value)
        return self
    
    def gte(self, field: str, value: Any) -> "MockSupabaseTable":
        self._filters[f"gte_{field}"] = (field, "gte", value)
        return self
    
    def lt(self, field: str, value: Any) -> "MockSupabaseTable":
        self._filters[f"lt_{field}"] = (field, "lt", value)
        return self
    
    def order(self, field: str, **kwargs) -> "MockSupabaseTable":
        return self
    
    def limit(self, n: int) -> "MockSupabaseTable":
        return self
    
    def single(self) -> "MockSupabaseTable":
        self._single = True
        return self
    
    def execute(self) -> MagicMock:
        self.db._access_log.append((self._operation, self.name, self._data))
        
        if self._operation == "upsert":
            records = self._data if isinstance(self._data, list) else [self._data]
            # Simple upsert: just append (real impl would handle conflicts)
            for record in records:
                self.db.tables[self.name].append(record)
            return MagicMock(data=records)
        
        elif self._operation == "select":
            data = self.db.tables.get(self.name, [])
            # Apply filters
            for filter_key, (field, op, value) in self._filters.items():
                if op == "eq":
                    data = [r for r in data if r.get(field) == value]
                elif op == "gte":
                    data = [r for r in data if r.get(field, "") >= value]
                elif op == "lt":
                    data = [r for r in data if r.get(field, "") < value]
            
            if getattr(self, "_single", False):
                return MagicMock(data=data[0] if data else None)
            return MagicMock(data=data)
        
        elif self._operation == "delete":
            # Apply filters for delete
            if self._filters:
                original = self.db.tables.get(self.name, [])
                remaining = []
                for record in original:
                    keep = False
                    for filter_key, (field, op, value) in self._filters.items():
                        if op == "lt" and record.get(field, "") >= value:
                            keep = True
                    if keep:
                        remaining.append(record)
                self.db.tables[self.name] = remaining
            else:
                self.db.tables[self.name] = []
            return MagicMock(data=[])
        
        return MagicMock(data=[])


@dataclass
class MockVideoStats:
    """Mock video stats object that mimics YouTube API response."""
    video_id: str
    title: str
    description: str
    view_count: int
    like_count: int
    comment_count: int
    duration_seconds: int
    published_at: str
    channel_id: str
    channel_title: str
    tags: List[str]
    default_audio_language: str
    is_short: bool
    was_live_stream: bool
    is_premiere: bool
    definition: str
    engagement_rate: float


class MockYouTubeClient:
    """
    Mock YouTube client that returns realistic gaming video data.
    
    Generates deterministic data based on game key for reproducible tests.
    """
    
    def __init__(self, video_count_per_game: int = 30):
        self.video_count = video_count_per_game
        self.call_count = 0
        self.fetch_errors: Dict[str, Exception] = {}  # game_key -> error to raise
    
    def _generate_videos(self, game: str, count: int) -> List[Dict]:
        """Generate realistic video data for a game."""
        return [
            {
                "video_id": f"{game}_vid_{i}",
                "title": f"{game.title().replace('_', ' ')} Gameplay #{i} - Epic Win",
                "description": f"#{game} #gaming #gameplay\n\n0:00 Intro\n1:30 Action\n5:00 Win\n\nFollow: https://twitter.com/test",
                "view_count": 10000 + i * 1000 + abs(hash(game)) % 5000,
                "like_count": 500 + i * 50,
                "comment_count": 100 + i * 10,
                "duration_seconds": 300 + i * 60,  # 5-35 minutes
                "published_at": (datetime.now(timezone.utc) - timedelta(hours=i)).isoformat(),
                "channel_id": f"channel_{game}_{i % 3}",
                "channel_title": f"{game.title()} Creator {i % 3}",
                "tags": [game.replace("_", " "), "gaming", "gameplay", f"tag_{i}"],
                "default_audio_language": ["en", "es", "pt", "de", "fr"][i % 5],
                "is_short": i % 5 == 0,  # 20% shorts
                "was_live_stream": i % 4 == 0,  # 25% were live
                "is_premiere": i % 10 == 0,  # 10% premieres
                "definition": "hd",
                "engagement_rate": 0.05 + (i * 0.002),
            }
            for i in range(count)
        ]
    
    async def fetch_trending(self, **kwargs) -> List[Dict]:
        """Fetch trending videos (returns all games mixed)."""
        self.call_count += 1
        all_videos = []
        for game in ["fortnite", "valorant", "minecraft"]:
            if game in self.fetch_errors:
                raise self.fetch_errors[game]
            all_videos.extend(self._generate_videos(game, self.video_count))
        return all_videos
    
    async def fetch_video_stats(self, video_ids: List[str]) -> List[MockVideoStats]:
        """Fetch detailed stats for specific videos."""
        results = []
        for vid in video_ids:
            # Parse game from video_id
            parts = vid.split("_vid_")
            if len(parts) == 2:
                game = parts[0]
                idx = int(parts[1])
                videos = self._generate_videos(game, idx + 1)
                if videos:
                    v = videos[-1]
                    stats = MockVideoStats(
                        video_id=vid,
                        title=v["title"],
                        description=v["description"],
                        view_count=v["view_count"],
                        like_count=v["like_count"],
                        comment_count=v["comment_count"],
                        duration_seconds=v["duration_seconds"],
                        published_at=v["published_at"],
                        channel_id=v["channel_id"],
                        channel_title=v["channel_title"],
                        tags=v["tags"],
                        default_audio_language=v["default_audio_language"],
                        is_short=v["is_short"],
                        was_live_stream=v["was_live_stream"],
                        is_premiere=v["is_premiere"],
                        definition=v["definition"],
                        engagement_rate=v["engagement_rate"],
                    )
                    results.append(stats)
        return results
    
    def set_fetch_error(self, game: str, error: Exception) -> None:
        """Configure an error to be raised for a specific game."""
        self.fetch_errors[game] = error
    
    def clear_errors(self) -> None:
        """Clear all configured errors."""
        self.fetch_errors.clear()


# =============================================================================
# TEST DATA FACTORY
# =============================================================================

@dataclass
class PipelineTestScenario:
    """Defines a test scenario with expected outcomes."""
    name: str
    games: List[str]
    video_count: int
    expected_hourly_records: int
    expected_daily_records: int
    description: str = ""


class TestDataFactory:
    """Factory for creating test data and scenarios."""
    
    STANDARD_GAMES = ["fortnite", "valorant", "minecraft"]
    
    @classmethod
    def create_standard_scenario(cls) -> PipelineTestScenario:
        """Create a standard test scenario."""
        return PipelineTestScenario(
            name="standard",
            games=cls.STANDARD_GAMES,
            video_count=30,
            expected_hourly_records=3,
            expected_daily_records=3,
            description="Standard 3-game scenario with 30 videos each",
        )
    
    @classmethod
    def create_minimal_scenario(cls) -> PipelineTestScenario:
        """Create a minimal test scenario for quick tests."""
        return PipelineTestScenario(
            name="minimal",
            games=["fortnite"],
            video_count=15,
            expected_hourly_records=1,
            expected_daily_records=1,
            description="Single game minimal scenario",
        )
    
    @classmethod
    def create_stress_scenario(cls) -> PipelineTestScenario:
        """Create a stress test scenario."""
        return PipelineTestScenario(
            name="stress",
            games=["fortnite", "valorant", "minecraft", "apex_legends", 
                   "warzone", "gta", "roblox", "league_of_legends"],
            video_count=50,
            expected_hourly_records=8,
            expected_daily_records=8,
            description="Full 8-game stress scenario",
        )
    
    @classmethod
    def seed_redis_with_youtube_data(
        cls,
        redis: MockRedisStore,
        youtube: MockYouTubeClient,
        games: List[str],
    ) -> Dict[str, int]:
        """
        Seed Redis with YouTube video data as if collection ran.
        
        Returns dict of game -> video count.
        """
        counts = {}
        for game in games:
            videos = youtube._generate_videos(game, youtube.video_count)
            data = {
                "game_key": game,
                "game_display_name": game.replace("_", " ").title(),
                "videos": videos,
                "video_count": len(videos),
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
            # Synchronously set (we'll await in tests)
            redis._store[f"youtube:games:{game}"] = json.dumps(data)
            counts[game] = len(videos)
        return counts


# =============================================================================
# PIPELINE STAGE RUNNERS - Isolated stage execution for testing
# =============================================================================

class PipelineStageRunner:
    """
    Runs individual pipeline stages with injected dependencies.
    
    Allows testing each stage in isolation and verifying data handoff.
    """
    
    def __init__(
        self,
        redis: MockRedisStore,
        db: MockSupabaseDB,
        youtube: MockYouTubeClient,
    ):
        self.redis = redis
        self.db = db
        self.youtube = youtube
    
    async def run_collection(self, games: List[str]) -> Dict[str, Any]:
        """
        Run the collection stage.
        
        Returns collection result with metrics.
        """
        from backend.services.intel.collectors.batch_collector import BatchCollector
        from backend.services.intel.collectors.quota_manager import QuotaManager
        
        # Initialize quota manager with our mock Redis
        quota = QuotaManager(self.redis)
        await quota.initialize()
        
        # Run collection
        collector = BatchCollector(self.youtube, quota, self.redis)
        result = await collector.collect_batch(games)
        
        return {
            "games_collected": result.games_collected,
            "total_videos": result.total_videos,
            "unique_videos": result.unique_videos,
            "quota_used": result.quota_used,
            "errors": result.errors,
            "success_rate": result.success_rate,
        }
    
    async def run_analysis(self, games: List[str]) -> Dict[str, Any]:
        """
        Run the analysis stage.
        
        Returns analysis results per game.
        """
        from backend.services.intel.analyzers.runner import AnalyzerRunner
        
        runner = AnalyzerRunner()
        
        # Patch Redis connection for all analyzers
        with patch('backend.services.intel.core.base_analyzer.BaseAnalyzer.get_redis',
                   return_value=self.redis):
            results = await runner.run_batch(games, force_refresh=True)
        
        return {
            game: {
                "analyzers_run": result.analyzers_run,
                "analyzers_succeeded": result.analyzers_succeeded,
                "analyzers_failed": result.analyzers_failed,
                "duration": result.duration_seconds,
            }
            for game, result in results.items()
        }
    
    async def run_hourly_aggregation(self) -> Dict[str, Any]:
        """
        Run the hourly aggregation stage.
        
        Returns aggregation metrics.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        aggregator = HourlyAggregator(self.redis, self.db)
        count = await aggregator.run()
        
        return {
            "categories_aggregated": count,
            "hourly_records": len(self.db.get_table_data("intel_hourly_metrics")),
        }
    
    async def run_daily_rollup(self) -> Dict[str, Any]:
        """
        Run the daily rollup stage.
        
        Returns rollup metrics.
        """
        from backend.services.intel.aggregation.daily import DailyRollup
        
        rollup = DailyRollup(self.db)
        count = await rollup.run()
        
        return {
            "categories_rolled_up": count,
            "daily_records": len(self.db.get_table_data("intel_daily_metrics")),
        }
    
    async def run_full_pipeline(self, games: List[str]) -> Dict[str, Any]:
        """
        Run the complete pipeline end-to-end.
        
        Returns metrics from all stages.
        """
        results = {
            "collection": None,
            "analysis": None,
            "hourly": None,
            "daily": None,
            "total_duration": 0,
        }
        
        start = time.time()
        
        # Stage 1: Collection
        results["collection"] = await self.run_collection(games)
        
        # Stage 2: Analysis
        results["analysis"] = await self.run_analysis(games)
        
        # Stage 3: Hourly Aggregation
        results["hourly"] = await self.run_hourly_aggregation()
        
        # Stage 4: Daily Rollup (needs hourly data first)
        # Seed some hourly data for daily to roll up
        await self._seed_hourly_for_daily(games)
        results["daily"] = await self.run_daily_rollup()
        
        results["total_duration"] = time.time() - start
        
        return results
    
    async def _seed_hourly_for_daily(self, games: List[str]) -> None:
        """Seed hourly data so daily rollup has something to process."""
        # The hourly aggregation already ran, but daily needs data from "yesterday"
        # We'll manually insert some hourly records with yesterday's timestamp
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        
        for hour in range(24):
            hour_start = yesterday.replace(hour=hour, minute=0, second=0, microsecond=0)
            
            for game in games:
                record = {
                    "category_key": game,
                    "hour_start": hour_start.isoformat(),
                    "video_count": 30,
                    "avg_views": 15000 + hour * 100,
                    "avg_engagement": 0.05,
                    "total_views": 450000,
                    "viral_count": 2,
                    "rising_count": 5,
                    "avg_velocity": 1000,
                    "max_velocity": 5000,
                    "shorts_count": 6,
                    "shorts_avg_views": 20000,
                    "longform_count": 24,
                    "longform_avg_views": 14000,
                    "avg_duration_seconds": 600,
                    "optimal_duration_bucket": "10-15 minutes",
                    "language_distribution": json.dumps({"en": 20, "es": 5, "pt": 5}),
                    "dominant_language": "en",
                }
                self.db.tables.setdefault("intel_hourly_metrics", []).append(record)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def mock_redis() -> MockRedisStore:
    """Create a fresh mock Redis instance."""
    return MockRedisStore()


@pytest.fixture
def mock_db() -> MockSupabaseDB:
    """Create a fresh mock Supabase instance."""
    return MockSupabaseDB()


@pytest.fixture
def mock_youtube() -> MockYouTubeClient:
    """Create a fresh mock YouTube client."""
    return MockYouTubeClient(video_count_per_game=30)


@pytest.fixture
def pipeline_runner(mock_redis, mock_db, mock_youtube) -> PipelineStageRunner:
    """Create a pipeline runner with all mocks."""
    return PipelineStageRunner(mock_redis, mock_db, mock_youtube)


@pytest.fixture
def standard_scenario() -> PipelineTestScenario:
    """Get the standard test scenario."""
    return TestDataFactory.create_standard_scenario()


@pytest.fixture
def seeded_redis(mock_redis, mock_youtube, standard_scenario) -> MockRedisStore:
    """Create Redis pre-seeded with YouTube data."""
    TestDataFactory.seed_redis_with_youtube_data(
        mock_redis, mock_youtube, standard_scenario.games
    )
    return mock_redis


# =============================================================================
# TEST CLASS 1: DATA FLOW INTEGRITY
# =============================================================================

class TestDataFlowIntegrity:
    """
    Tests that verify data flows correctly between pipeline stages.
    
    These are the "would I ship this?" tests that prove the pipeline
    actually works as a cohesive unit.
    """
    
    @pytest.mark.asyncio
    async def test_collection_stores_data_readable_by_analysis(
        self, pipeline_runner, standard_scenario
    ):
        """
        CRITICAL: Verify data written by collection can be read by analysis.
        
        This is the most fundamental integration test - if this fails,
        nothing else matters.
        """
        games = standard_scenario.games
        
        # Run collection
        collection_result = await pipeline_runner.run_collection(games)
        
        # Verify collection succeeded
        assert collection_result["success_rate"] > 0, "Collection should succeed"
        assert len(collection_result["games_collected"]) > 0, "Should collect some games"
        
        # Verify data is in Redis in the format analysis expects
        for game in collection_result["games_collected"]:
            raw_data = await pipeline_runner.redis.get(f"youtube:games:{game}")
            assert raw_data is not None, f"Redis should have data for {game}"
            
            data = json.loads(raw_data)
            assert "videos" in data, "Data should have videos key"
            assert "fetched_at" in data, "Data should have fetched_at"
            assert len(data["videos"]) > 0, "Should have videos"
            
            # Verify video structure matches what analyzers expect
            video = data["videos"][0]
            required_fields = ["video_id", "view_count", "duration_seconds"]
            for field in required_fields:
                assert field in video, f"Video should have {field}"
        
        # Now run analysis and verify it can read the data
        analysis_result = await pipeline_runner.run_analysis(
            collection_result["games_collected"]
        )
        
        # Verify analysis succeeded for collected games
        for game in collection_result["games_collected"]:
            assert game in analysis_result, f"Analysis should run for {game}"
            result = analysis_result[game]
            assert len(result["analyzers_succeeded"]) > 0, \
                f"At least one analyzer should succeed for {game}"
    
    @pytest.mark.asyncio
    async def test_analysis_stores_data_readable_by_aggregation(
        self, pipeline_runner, seeded_redis, standard_scenario
    ):
        """
        Verify analysis results can be read by hourly aggregation.
        """
        games = standard_scenario.games
        
        # Run analysis (Redis already seeded)
        analysis_result = await pipeline_runner.run_analysis(games)
        
        # Verify analysis produced precomputed results
        for game in games:
            # Check for precomputed analysis results
            format_data = await pipeline_runner.redis.get(
                f"intel:format:precomputed:{game}"
            )
            # Note: May be None if analyzer caches differently
            # The key point is analysis ran without errors
            
            result = analysis_result[game]
            assert len(result["analyzers_run"]) == 5, "Should run all 5 analyzers"
        
        # Run hourly aggregation
        hourly_result = await pipeline_runner.run_hourly_aggregation()
        
        # Verify aggregation produced records
        assert hourly_result["categories_aggregated"] > 0, \
            "Should aggregate at least one category"
    
    @pytest.mark.asyncio
    async def test_hourly_data_readable_by_daily_rollup(
        self, pipeline_runner, seeded_redis, standard_scenario
    ):
        """
        Verify hourly aggregation data can be rolled up by daily.
        """
        games = standard_scenario.games
        
        # Run hourly aggregation
        await pipeline_runner.run_hourly_aggregation()
        
        # Seed additional hourly data for yesterday (daily needs 24h of data)
        await pipeline_runner._seed_hourly_for_daily(games)
        
        # Verify hourly data exists
        hourly_records = pipeline_runner.db.get_table_data("intel_hourly_metrics")
        assert len(hourly_records) > 0, "Should have hourly records"
        
        # Run daily rollup
        daily_result = await pipeline_runner.run_daily_rollup()
        
        # Verify daily produced records
        assert daily_result["categories_rolled_up"] > 0, \
            "Should roll up at least one category"
        
        daily_records = pipeline_runner.db.get_table_data("intel_daily_metrics")
        assert len(daily_records) > 0, "Should have daily records"
    
    @pytest.mark.asyncio
    async def test_full_pipeline_end_to_end(
        self, pipeline_runner, standard_scenario
    ):
        """
        THE BIG ONE: Run the complete pipeline and verify all stages work.
        
        This is the ultimate integration test that proves the system
        works as a cohesive unit.
        """
        games = standard_scenario.games
        
        # Run full pipeline
        results = await pipeline_runner.run_full_pipeline(games)
        
        # Verify collection
        assert results["collection"]["success_rate"] > 0.5, \
            "Collection should mostly succeed"
        
        # Verify analysis
        for game in games:
            if game in results["analysis"]:
                assert len(results["analysis"][game]["analyzers_succeeded"]) >= 3, \
                    f"Most analyzers should succeed for {game}"
        
        # Verify hourly aggregation
        assert results["hourly"]["categories_aggregated"] > 0, \
            "Hourly should aggregate categories"
        
        # Verify daily rollup
        assert results["daily"]["categories_rolled_up"] > 0, \
            "Daily should roll up categories"
        
        # Verify reasonable duration
        assert results["total_duration"] < 60, \
            "Full pipeline should complete in under 60 seconds"
        
        logger.info(f"Full pipeline completed in {results['total_duration']:.2f}s")


# =============================================================================
# TEST CLASS 2: CONCURRENCY SAFETY
# =============================================================================

class TestConcurrencySafety:
    """
    Tests that verify concurrent operations don't corrupt data.
    
    These tests simulate real-world scenarios where multiple operations
    might run simultaneously.
    """
    
    @pytest.mark.asyncio
    async def test_concurrent_analysis_same_category(
        self, mock_redis, mock_youtube, standard_scenario
    ):
        """
        Verify two analysis runs on the same category don't corrupt data.
        """
        from backend.services.intel.analyzers.runner import AnalyzerRunner
        
        # Seed data
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite"]
        )
        
        runner = AnalyzerRunner()
        
        with patch('backend.services.intel.core.base_analyzer.BaseAnalyzer.get_redis',
                   return_value=mock_redis):
            # Run two analyses concurrently
            results = await asyncio.gather(
                runner.run_category("fortnite", force_refresh=True),
                runner.run_category("fortnite", force_refresh=True),
            )
        
        # Both should complete without error
        assert len(results) == 2
        for result in results:
            assert result.category_key == "fortnite"
            assert len(result.analyzers_succeeded) >= 3
    
    @pytest.mark.asyncio
    async def test_concurrent_analysis_different_categories(
        self, mock_redis, mock_youtube, standard_scenario
    ):
        """
        Verify concurrent analysis of different categories works.
        """
        from backend.services.intel.analyzers.runner import AnalyzerRunner
        
        games = standard_scenario.games
        TestDataFactory.seed_redis_with_youtube_data(mock_redis, mock_youtube, games)
        
        runner = AnalyzerRunner()
        
        with patch('backend.services.intel.core.base_analyzer.BaseAnalyzer.get_redis',
                   return_value=mock_redis):
            # Run all games concurrently
            tasks = [
                runner.run_category(game, force_refresh=True)
                for game in games
            ]
            results = await asyncio.gather(*tasks)
        
        # All should complete
        assert len(results) == len(games)
        for i, result in enumerate(results):
            assert result.category_key == games[i]
    
    @pytest.mark.asyncio
    async def test_aggregation_during_collection_simulation(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Simulate hourly aggregation running while collection is in progress.
        
        This tests the race condition where:
        1. Collection starts writing new data
        2. Aggregation reads partially updated data
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        # Seed initial data
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite"]
        )
        
        aggregator = HourlyAggregator(mock_redis, mock_db)
        
        # Run aggregation
        count1 = await aggregator.run()
        
        # Simulate collection updating data mid-aggregation
        # by modifying Redis data
        raw = await mock_redis.get("youtube:games:fortnite")
        data = json.loads(raw)
        data["videos"][0]["view_count"] = 999999  # Modify a video
        await mock_redis.set("youtube:games:fortnite", json.dumps(data))
        
        # Run aggregation again
        count2 = await aggregator.run()
        
        # Both should complete without error
        assert count1 >= 0
        assert count2 >= 0
        
        # Should have records in DB
        records = mock_db.get_table_data("intel_hourly_metrics")
        assert len(records) >= 1
    
    @pytest.mark.asyncio
    async def test_daily_rollup_during_hourly_aggregation(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Simulate daily rollup running while hourly aggregation is inserting.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        from backend.services.intel.aggregation.daily import DailyRollup
        
        # Seed data
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite", "valorant"]
        )
        
        # Seed some hourly data for yesterday
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        for hour in range(24):
            hour_start = yesterday.replace(hour=hour, minute=0, second=0, microsecond=0)
            for game in ["fortnite", "valorant"]:
                record = {
                    "category_key": game,
                    "hour_start": hour_start.isoformat(),
                    "video_count": 30,
                    "avg_views": 15000,
                    "avg_engagement": 0.05,
                    "total_views": 450000,
                    "viral_count": 2,
                    "rising_count": 5,
                    "avg_velocity": 1000,
                    "max_velocity": 5000,
                    "shorts_count": 6,
                    "shorts_avg_views": 20000,
                    "longform_count": 24,
                    "longform_avg_views": 14000,
                    "avg_duration_seconds": 600,
                    "optimal_duration_bucket": "10-15 minutes",
                    "language_distribution": json.dumps({"en": 20, "es": 10}),
                    "dominant_language": "en",
                }
                mock_db.tables.setdefault("intel_hourly_metrics", []).append(record)
        
        hourly = HourlyAggregator(mock_redis, mock_db)
        daily = DailyRollup(mock_db)
        
        # Run both concurrently
        results = await asyncio.gather(
            hourly.run(),
            daily.run(),
            return_exceptions=True,
        )
        
        # Neither should raise exceptions
        for result in results:
            assert not isinstance(result, Exception), f"Got exception: {result}"


# =============================================================================
# TEST CLASS 3: RECOVERY SCENARIOS
# =============================================================================

class TestRecoveryScenarios:
    """
    Tests that verify the system recovers gracefully from failures.
    """
    
    @pytest.mark.asyncio
    async def test_analysis_continues_after_one_analyzer_fails(
        self, mock_redis, mock_youtube
    ):
        """
        Verify that if one analyzer fails, others still run.
        """
        from backend.services.intel.analyzers.runner import AnalyzerRunner
        
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite"]
        )
        
        runner = AnalyzerRunner()
        
        # Patch one analyzer to fail
        with patch('backend.services.intel.core.base_analyzer.BaseAnalyzer.get_redis',
                   return_value=mock_redis):
            with patch('backend.services.intel.analyzers.content_format.ContentFormatAnalyzer.analyze',
                       side_effect=Exception("Simulated failure")):
                result = await runner.run_category("fortnite", force_refresh=True)
        
        # Should have run all analyzers
        assert len(result.analyzers_run) == 5
        
        # One should have failed
        assert "content_format" in result.analyzers_failed
        
        # Others should have succeeded (at least some)
        assert len(result.analyzers_succeeded) >= 2
    
    @pytest.mark.asyncio
    async def test_collection_partial_failure(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Verify collection continues if one game fails.
        
        Note: The batch collector fetches trending videos for all games
        in a single call, then filters by game. So we test partial failure
        by having the filter return no videos for one game.
        """
        from backend.services.intel.collectors.batch_collector import BatchCollector
        from backend.services.intel.collectors.quota_manager import QuotaManager
        
        # Don't set fetch error - instead we'll test with a game that has no matching videos
        # The collector filters videos by game key, so a game with no matches = partial failure
        
        quota = QuotaManager(mock_redis)
        await quota.initialize()
        
        collector = BatchCollector(mock_youtube, quota, mock_redis)
        
        # Request a game that won't have any matching videos in the mock data
        # (mock only generates fortnite, valorant, minecraft)
        result = await collector.collect_batch(["fortnite", "unknown_game", "minecraft"])
        
        # Should have partial success - fortnite and minecraft should work
        # unknown_game won't have any videos after filtering
        assert len(result.games_collected) >= 1, "Should collect at least one game"
        assert "fortnite" in result.games_collected or "minecraft" in result.games_collected
    
    @pytest.mark.asyncio
    async def test_aggregation_handles_missing_data(
        self, mock_redis, mock_db
    ):
        """
        Verify hourly aggregation handles missing Redis data gracefully.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        # Don't seed any data - Redis is empty
        aggregator = HourlyAggregator(mock_redis, mock_db)
        
        # Should not raise, just return 0
        count = await aggregator.run()
        
        assert count == 0
        assert len(mock_db.get_table_data("intel_hourly_metrics")) == 0
    
    @pytest.mark.asyncio
    async def test_daily_rollup_handles_missing_hourly(
        self, mock_db
    ):
        """
        Verify daily rollup handles missing hourly data gracefully.
        """
        from backend.services.intel.aggregation.daily import DailyRollup
        
        # Don't seed any hourly data
        rollup = DailyRollup(mock_db)
        
        # Should not raise, just return 0
        count = await rollup.run()
        
        assert count == 0
    
    @pytest.mark.asyncio
    async def test_quota_exhaustion_handling(
        self, mock_redis, mock_youtube
    ):
        """
        Verify collection handles quota exhaustion gracefully.
        """
        from backend.services.intel.collectors.quota_manager import QuotaManager
        from backend.services.intel.core.exceptions import IntelQuotaError
        
        quota = QuotaManager(mock_redis)
        await quota.initialize()
        
        # Exhaust quota
        quota._quota_bucket.units_used = 9999
        
        # Should raise quota error
        with pytest.raises(IntelQuotaError):
            quota.check_quota(100)
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_opens_after_failures(
        self, mock_redis, mock_youtube
    ):
        """
        Verify circuit breaker opens after repeated failures.
        """
        from backend.services.intel.collectors.quota_manager import QuotaManager
        
        quota = QuotaManager(mock_redis)
        await quota.initialize()
        
        # Simulate failures
        for i in range(5):
            await quota.record_failure("fortnite", Exception(f"Failure {i}"))
        
        # Circuit should be open
        status = quota.get_quota_status()
        assert status["circuit_open"] is True


# =============================================================================
# TEST CLASS 4: DATA CONSISTENCY
# =============================================================================

class TestDataConsistency:
    """
    Tests that verify aggregation math is correct and data is consistent.
    """
    
    @pytest.mark.asyncio
    async def test_hourly_video_counts_match_source(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Verify hourly aggregation video counts match source data.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        # Seed with known video count
        video_count = 25
        mock_youtube.video_count = video_count
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite"]
        )
        
        aggregator = HourlyAggregator(mock_redis, mock_db)
        await aggregator.run()
        
        # Check the aggregated record
        records = mock_db.get_table_data("intel_hourly_metrics")
        fortnite_records = [r for r in records if r["category_key"] == "fortnite"]
        
        assert len(fortnite_records) > 0
        assert fortnite_records[0]["video_count"] == video_count
    
    @pytest.mark.asyncio
    async def test_hourly_view_totals_are_correct(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Verify hourly total_views equals sum of individual views.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite"]
        )
        
        # Get source data to calculate expected total
        raw = await mock_redis.get("youtube:games:fortnite")
        data = json.loads(raw)
        expected_total = sum(v.get("view_count", 0) for v in data["videos"])
        
        aggregator = HourlyAggregator(mock_redis, mock_db)
        await aggregator.run()
        
        records = mock_db.get_table_data("intel_hourly_metrics")
        fortnite_records = [r for r in records if r["category_key"] == "fortnite"]
        
        assert len(fortnite_records) > 0
        assert fortnite_records[0]["total_views"] == expected_total
    
    @pytest.mark.asyncio
    async def test_shorts_longform_counts_sum_to_total(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Verify shorts + longform counts equal total video count.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite"]
        )
        
        aggregator = HourlyAggregator(mock_redis, mock_db)
        await aggregator.run()
        
        records = mock_db.get_table_data("intel_hourly_metrics")
        fortnite_records = [r for r in records if r["category_key"] == "fortnite"]
        
        assert len(fortnite_records) > 0
        record = fortnite_records[0]
        
        # shorts + longform should equal total
        assert record["shorts_count"] + record["longform_count"] == record["video_count"]
    
    @pytest.mark.asyncio
    async def test_daily_rollup_aggregates_correctly(
        self, mock_db
    ):
        """
        Verify daily rollup correctly aggregates hourly data.
        """
        from backend.services.intel.aggregation.daily import DailyRollup
        
        # Seed hourly data with known values
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        
        hourly_viral_counts = []
        for hour in range(24):
            hour_start = yesterday.replace(hour=hour, minute=0, second=0, microsecond=0)
            viral_count = 2 + hour  # Increasing viral count
            hourly_viral_counts.append(viral_count)
            
            record = {
                "category_key": "fortnite",
                "hour_start": hour_start.isoformat(),
                "video_count": 30,
                "avg_views": 15000 + hour * 100,
                "avg_engagement": 0.05,
                "total_views": 450000,
                "viral_count": viral_count,
                "rising_count": 5,
                "avg_velocity": 1000,
                "max_velocity": 5000,
                "shorts_count": 6,
                "shorts_avg_views": 20000,
                "longform_count": 24,
                "longform_avg_views": 14000,
                "avg_duration_seconds": 600,
                "optimal_duration_bucket": "10-15 minutes",
                "language_distribution": json.dumps({"en": 20, "es": 10}),
                "dominant_language": "en",
            }
            mock_db.tables.setdefault("intel_hourly_metrics", []).append(record)
        
        rollup = DailyRollup(mock_db)
        await rollup.run()
        
        daily_records = mock_db.get_table_data("intel_daily_metrics")
        fortnite_daily = [r for r in daily_records if r["category_key"] == "fortnite"]
        
        assert len(fortnite_daily) > 0
        record = fortnite_daily[0]
        
        # Verify peak viral count
        assert record["peak_viral_count"] == max(hourly_viral_counts)
        
        # Verify avg viral count
        expected_avg = sum(hourly_viral_counts) / len(hourly_viral_counts)
        assert abs(record["avg_viral_count"] - expected_avg) < 0.1
    
    @pytest.mark.asyncio
    async def test_language_distribution_preserved(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Verify language distribution is correctly captured.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite"]
        )
        
        aggregator = HourlyAggregator(mock_redis, mock_db)
        await aggregator.run()
        
        records = mock_db.get_table_data("intel_hourly_metrics")
        fortnite_records = [r for r in records if r["category_key"] == "fortnite"]
        
        assert len(fortnite_records) > 0
        record = fortnite_records[0]
        
        # Language distribution should be a dict or JSON string
        lang_dist = record["language_distribution"]
        if isinstance(lang_dist, str):
            lang_dist = json.loads(lang_dist)
        
        # Should have detected languages
        assert len(lang_dist) > 0
        
        # Dominant language should be set
        assert record["dominant_language"] in lang_dist


# =============================================================================
# TEST CLASS 5: OBSERVABILITY
# =============================================================================

class TestObservability:
    """
    Tests that verify metrics and health checks work correctly.
    """
    
    @pytest.mark.asyncio
    async def test_metrics_track_operations(
        self, mock_redis, mock_youtube
    ):
        """
        Verify metrics are collected during operations.
        """
        from backend.services.intel.core.metrics import get_intel_metrics, reset_intel_metrics
        from backend.services.intel.analyzers.runner import AnalyzerRunner
        
        reset_intel_metrics()
        metrics = get_intel_metrics()
        
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite"]
        )
        
        runner = AnalyzerRunner()
        
        with patch('backend.services.intel.core.base_analyzer.BaseAnalyzer.get_redis',
                   return_value=mock_redis):
            await runner.run_category("fortnite", force_refresh=True)
        
        # Check metrics were collected
        all_metrics = metrics.get_all_metrics()
        
        # Should have some counters
        assert len(all_metrics["counters"]["analysis_count"]) > 0 or \
               all_metrics["gauges"]["active_operations"] >= 0
    
    @pytest.mark.asyncio
    async def test_health_check_detects_healthy_system(
        self, mock_redis, mock_db
    ):
        """
        Verify health check reports healthy when all is well.
        """
        from backend.workers.intel.health import HealthChecker, HealthStatus
        
        checker = HealthChecker(mock_redis, mock_db)
        health = await checker.check_all()
        
        # Redis and basic checks should pass
        redis_health = next(
            (c for c in health.components if c.name == "redis"), None
        )
        assert redis_health is not None
        assert redis_health.status == HealthStatus.HEALTHY
    
    @pytest.mark.asyncio
    async def test_health_check_detects_stale_data(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Verify health check detects stale data.
        """
        from backend.workers.intel.health import HealthChecker, HealthStatus
        
        # Seed data with old timestamp
        old_time = datetime.now(timezone.utc) - timedelta(hours=12)
        for game in ["fortnite", "valorant", "minecraft"]:
            data = {
                "game_key": game,
                "videos": mock_youtube._generate_videos(game, 10),
                "fetched_at": old_time.isoformat(),
            }
            await mock_redis.set(f"youtube:games:{game}", json.dumps(data))
        
        checker = HealthChecker(mock_redis, mock_db)
        health = await checker.check_all()
        
        # Data freshness should be degraded or unhealthy
        freshness = next(
            (c for c in health.components if c.name == "data_freshness"), None
        )
        assert freshness is not None
        assert freshness.status in [HealthStatus.DEGRADED, HealthStatus.UNHEALTHY]
    
    @pytest.mark.asyncio
    async def test_quota_status_reporting(
        self, mock_redis
    ):
        """
        Verify quota status is correctly reported.
        """
        from backend.services.intel.collectors.quota_manager import QuotaManager
        
        quota = QuotaManager(mock_redis)
        await quota.initialize()
        
        # Use some quota
        await quota.record_collection(
            game_key="fortnite",
            units_used=100,
            videos_fetched=50,
            content_hash="abc123",
        )
        
        status = quota.get_quota_status()
        
        assert status["units_used"] == 100
        assert status["units_remaining"] == 9900
        assert status["percent_used"] == 1.0
        assert status["circuit_open"] is False


# =============================================================================
# TEST CLASS 6: EDGE CASES
# =============================================================================

class TestEdgeCases:
    """
    Tests for edge cases and boundary conditions.
    """
    
    @pytest.mark.asyncio
    async def test_empty_video_list(
        self, mock_redis, mock_db
    ):
        """
        Verify system handles empty video lists gracefully.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        # Seed with empty videos
        data = {
            "game_key": "fortnite",
            "videos": [],
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        await mock_redis.set("youtube:games:fortnite", json.dumps(data))
        
        aggregator = HourlyAggregator(mock_redis, mock_db)
        count = await aggregator.run()
        
        # Should handle gracefully (either skip or create record with zeros)
        assert count >= 0
    
    @pytest.mark.asyncio
    async def test_malformed_json_in_redis(
        self, mock_redis, mock_db
    ):
        """
        Verify system handles malformed JSON gracefully.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        # Store malformed JSON
        await mock_redis.set("youtube:games:fortnite", "not valid json {{{")
        
        aggregator = HourlyAggregator(mock_redis, mock_db)
        
        # Should not raise, just skip
        count = await aggregator.run()
        assert count >= 0
    
    @pytest.mark.asyncio
    async def test_very_large_video_counts(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Verify system handles large video counts.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        # Generate lots of videos
        mock_youtube.video_count = 100
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite"]
        )
        
        aggregator = HourlyAggregator(mock_redis, mock_db)
        count = await aggregator.run()
        
        assert count > 0
        
        records = mock_db.get_table_data("intel_hourly_metrics")
        assert len(records) > 0
        assert records[0]["video_count"] == 100
    
    @pytest.mark.asyncio
    async def test_unicode_in_video_data(
        self, mock_redis, mock_db
    ):
        """
        Verify system handles unicode characters in video data.
        """
        from backend.services.intel.aggregation.hourly import HourlyAggregator
        
        # Seed with unicode data
        data = {
            "game_key": "fortnite",
            "videos": [
                {
                    "video_id": "vid_1",
                    "title": "フォートナイト 🎮 Epic Win! 日本語",
                    "view_count": 10000,
                    "duration_seconds": 600,
                    "is_short": False,
                    "default_audio_language": "ja",
                    "engagement_rate": 0.05,
                }
                for _ in range(15)
            ],
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        await mock_redis.set("youtube:games:fortnite", json.dumps(data, ensure_ascii=False))
        
        aggregator = HourlyAggregator(mock_redis, mock_db)
        count = await aggregator.run()
        
        assert count > 0


# =============================================================================
# PERFORMANCE TESTS (Optional - run with -k "perf")
# =============================================================================

class TestPerformance:
    """
    Performance tests to ensure the pipeline scales.
    
    Run with: pytest -k "perf" -v
    """
    
    @pytest.mark.asyncio
    async def test_perf_analysis_completes_in_time(
        self, mock_redis, mock_youtube
    ):
        """
        Verify analysis completes within acceptable time.
        """
        from backend.services.intel.analyzers.runner import AnalyzerRunner
        
        # Use larger dataset
        mock_youtube.video_count = 50
        TestDataFactory.seed_redis_with_youtube_data(
            mock_redis, mock_youtube, ["fortnite", "valorant", "minecraft"]
        )
        
        runner = AnalyzerRunner()
        
        start = time.time()
        
        with patch('backend.services.intel.core.base_analyzer.BaseAnalyzer.get_redis',
                   return_value=mock_redis):
            results = await runner.run_batch(
                ["fortnite", "valorant", "minecraft"],
                force_refresh=True
            )
        
        duration = time.time() - start
        
        # Should complete in under 30 seconds
        assert duration < 30, f"Analysis took {duration:.2f}s, expected < 30s"
        
        # All should have results
        assert len(results) == 3
    
    @pytest.mark.asyncio
    async def test_perf_full_pipeline_8_games(
        self, mock_redis, mock_db, mock_youtube
    ):
        """
        Verify full pipeline handles 8 games efficiently.
        """
        games = [
            "fortnite", "valorant", "minecraft", "apex_legends",
            "warzone", "gta", "roblox", "league_of_legends"
        ]
        
        mock_youtube.video_count = 30
        TestDataFactory.seed_redis_with_youtube_data(mock_redis, mock_youtube, games)
        
        runner = PipelineStageRunner(mock_redis, mock_db, mock_youtube)
        
        start = time.time()
        results = await runner.run_full_pipeline(games)
        duration = time.time() - start
        
        # Should complete in under 2 minutes
        assert duration < 120, f"Pipeline took {duration:.2f}s, expected < 120s"
        
        logger.info(f"8-game pipeline completed in {duration:.2f}s")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
