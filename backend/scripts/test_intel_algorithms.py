#!/usr/bin/env python3
"""
Test Creator Intel Algorithms

Run this to see all the enterprise-grade algorithms in action
using your existing cached YouTube data.

Usage:
    REDIS_URL=redis://localhost:6380 python backend/scripts/test_intel_algorithms.py
    
    # Test specific game:
    REDIS_URL=redis://localhost:6380 python backend/scripts/test_intel_algorithms.py fortnite
"""

import asyncio
import json
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Direct imports to avoid settings chain
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'backend', 'services', 'intel'))

import redis.asyncio as redis

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6380")


async def get_cached_games(redis_client: redis.Redis) -> list:
    """Get list of games with cached data."""
    keys = await redis_client.keys("youtube:games:*")
    games = [k.replace("youtube:games:", "") for k in keys]
    return sorted(games)


async def test_stats_module(videos: list):
    """Test the stats module with real data."""
    # Direct imports from the intel submodules
    from stats.core import calculate_mean, calculate_std, calculate_percentile
    from stats.outliers import remove_outliers_iqr
    from stats.percentile_scoring import calculate_percentile_score, PercentileThresholds
    
    views = [v.get("view_count", 0) for v in videos if v.get("view_count", 0) > 0]
    
    print("\n" + "="*60)
    print("📊 STATS MODULE TEST")
    print("="*60)
    
    print(f"\nSample size: {len(views)} videos")
    print(f"Raw mean: {calculate_mean(views):,.0f}")
    print(f"Raw std: {calculate_std(views):,.0f}")
    
    # Test outlier removal
    clean_views = remove_outliers_iqr(views, k=1.5)
    removed = len(views) - len(clean_views)
    print(f"\nOutliers removed (IQR): {removed}")
    print(f"Clean mean: {calculate_mean(clean_views):,.0f}")
    print(f"Clean std: {calculate_std(clean_views):,.0f}")
    
    # Percentiles
    p25 = calculate_percentile(clean_views, 25)
    p50 = calculate_percentile(clean_views, 50)
    p75 = calculate_percentile(clean_views, 75)
    p90 = calculate_percentile(clean_views, 90)
    
    print(f"\nPercentiles:")
    print(f"  P25: {p25:,.0f}")
    print(f"  P50 (median): {p50:,.0f}")
    print(f"  P75: {p75:,.0f}")
    print(f"  P90: {p90:,.0f}")
    
    # Test percentile scoring
    thresholds = PercentileThresholds(p25=p25, p50=p50, p75=p75, p90=p90)
    test_values = [p25, p50, p75, p90, p90 * 2]
    print(f"\nPercentile scores:")
    for val in test_values:
        score = calculate_percentile_score(val, thresholds)
        print(f"  {val:,.0f} views → {score:.1f} percentile")
    
    return clean_views


async def test_category_stats(game_key: str, videos: list):
    """Test CategoryStats building."""
    from stats.core import calculate_percentile, calculate_std, calculate_mean
    from stats.outliers import remove_outliers_iqr
    from decay.velocity import velocity_from_timestamps
    from datetime import datetime, timezone
    
    print("\n" + "="*60)
    print("📈 CATEGORY STATS TEST")
    print("="*60)
    
    now = datetime.now(timezone.utc)
    
    # Extract raw metrics
    raw_views = []
    velocities = []
    engagements = []
    
    for video in videos:
        view_count = video.get("view_count", 0)
        if view_count > 0:
            raw_views.append(float(view_count))
        
        published_at = video.get("published_at")
        if published_at and view_count > 0:
            velocity = velocity_from_timestamps(view_count, published_at, now)
            if velocity is not None:
                velocities.append(velocity)
        
        engagement = video.get("engagement_rate")
        if engagement is not None and engagement > 0:
            engagements.append(float(engagement))
    
    # Remove outliers
    clean_views = remove_outliers_iqr(raw_views, k=1.5)
    outliers_removed = len(raw_views) - len(clean_views)
    
    print(f"\nCategory: {game_key}")
    print(f"Sample count: {len(videos)}")
    print(f"Outliers removed: {outliers_removed}")
    print(f"\nView Stats:")
    print(f"  Mean: {calculate_mean(clean_views):,.0f}")
    print(f"  Std: {calculate_std(clean_views):,.0f}")
    print(f"  P50: {calculate_percentile(clean_views, 50):,.0f}")
    print(f"  P90: {calculate_percentile(clean_views, 90):,.0f}")
    print(f"\nVelocity Stats (views/hour):")
    print(f"  Mean: {calculate_mean(velocities):,.0f}")
    print(f"  P75: {calculate_percentile(velocities, 75):,.0f}")
    print(f"  P90 (viral threshold): {calculate_percentile(velocities, 90):,.0f}")
    print(f"\nEngagement:")
    print(f"  Mean: {calculate_mean(engagements):.2f}%")


async def test_decay_module():
    """Test decay functions."""
    from decay.freshness import freshness_decay, recency_boost, combined_freshness_score
    from decay.velocity import velocity_from_age
    from datetime import datetime, timezone, timedelta
    
    print("\n" + "="*60)
    print("⏱️ DECAY MODULE TEST")
    print("="*60)
    
    print("\nFreshness Decay (24h half-life):")
    for hours in [0, 6, 12, 24, 48, 72]:
        score = freshness_decay(hours, half_life=24)
        print(f"  {hours}h old → {score:.3f}")
    
    print("\nRecency Boost (6h window):")
    for hours in [0, 2, 4, 6, 8]:
        boost = recency_boost(hours, boost_window=6)
        print(f"  {hours}h old → {boost:.3f}")
    
    print("\nCombined Freshness:")
    for hours in [0, 3, 6, 12, 24]:
        combined = combined_freshness_score(hours)
        print(f"  {hours}h old → {combined:.3f}")
    
    # Test velocity calculation
    now = datetime.now(timezone.utc)
    published = now - timedelta(hours=6)
    velocity = velocity_from_age(100000, published, now)
    print(f"\nVelocity: 100k views in 6h = {velocity:,.0f} views/hr")


async def test_confidence_module(videos: list):
    """Test confidence and data quality."""
    from confidence.calculator import calculate_confidence, calculate_confidence_detailed, ConfidenceFactors
    from confidence.data_quality import assess_data_quality
    
    print("\n" + "="*60)
    print("🎯 CONFIDENCE & DATA QUALITY TEST")
    print("="*60)
    
    # Test confidence calculation
    factors = ConfidenceFactors(
        sample_size=len(videos),
        score_variance=0.15,
        data_freshness_hours=6,
    )
    result = calculate_confidence_detailed(factors)
    
    print(f"\nConfidence Calculation:")
    print(f"  Sample size: {len(videos)}")
    print(f"  Score variance: 0.15")
    print(f"  Data freshness: 6 hours")
    print(f"\n  Sample confidence: {result.sample_confidence:.1f}/50")
    print(f"  Consistency bonus: {result.consistency_bonus:.1f}/30")
    print(f"  Freshness bonus: {result.freshness_bonus:.1f}/20")
    print(f"  Total: {result.score}/100 ({result.level})")
    
    # Test data quality assessment
    quality = assess_data_quality(
        sample_size=len(videos),
        max_age_hours=24,
    )
    print(f"\nData Quality Assessment:")
    print(f"  Level: {quality.level.value}")
    print(f"  Score: {quality.score}/100")
    print(f"  Usable: {quality.is_usable}")
    if quality.issues:
        print(f"  Issues: {', '.join(quality.issues)}")


async def test_scoring_combiner():
    """Test multi-signal score combination."""
    from scoring.combiner import combine_scores, combine_scores_detailed, weighted_harmonic_mean
    from scoring.normalizer import calculate_category_difficulty
    
    print("\n" + "="*60)
    print("⚖️ SCORE COMBINER TEST")
    print("="*60)
    
    # Simulate mission scoring
    scores = {
        "competition": 0.75,      # Low competition = good
        "viral_opportunity": 0.60, # Some viral content
        "timing": 0.85,           # Good timing
        "history_match": 0.50,    # Neutral history
        "freshness": 0.70,        # Fairly fresh
    }
    
    weights = {
        "competition": 0.25,
        "viral_opportunity": 0.20,
        "timing": 0.20,
        "history_match": 0.15,
        "freshness": 0.20,
    }
    
    result = combine_scores_detailed(scores, weights)
    
    print(f"\nInput Scores:")
    for signal, score in scores.items():
        contrib = result.contributions.get(signal, 0)
        print(f"  {signal}: {score:.2f} × {weights[signal]:.2f} = {contrib:.3f}")
    
    print(f"\nCombined Score: {result.score:.3f} ({result.score*100:.1f}/100)")
    print(f"Confidence: {result.confidence}%")
    
    # Test harmonic mean (more conservative)
    hm = weighted_harmonic_mean(scores, weights)
    print(f"\nHarmonic Mean: {hm:.3f} (more conservative)")
    
    # Test category difficulty
    print(f"\nCategory Difficulty Examples:")
    examples = [
        ("Small game", 10000, 50, 5000),
        ("Medium game", 100000, 300, 50000),
        ("Large game (Fortnite)", 500000, 2000, 200000),
    ]
    for name, views, streams, viewers in examples:
        diff = calculate_category_difficulty(views, streams, viewers)
        print(f"  {name}: {diff:.3f} ({['Easy', 'Medium', 'Hard', 'Very Hard'][min(3, int(diff * 4))]})")


async def test_viral_detection(game_key: str, videos: list):
    """Test viral detection logic."""
    from stats.core import calculate_percentile
    from decay.velocity import velocity_from_timestamps
    
    print("\n" + "="*60)
    print("🔥 VIRAL DETECTION TEST")
    print("="*60)
    
    # Calculate velocities
    velocities = []
    video_data = []
    
    for v in videos:
        views = v.get("view_count", 0)
        published = v.get("published_at")
        if views > 0 and published:
            vel = velocity_from_timestamps(views, published)
            if vel:
                velocities.append(vel)
                video_data.append({
                    "title": v.get("title", "")[:50],
                    "views": views,
                    "velocity": vel,
                })
    
    if not velocities:
        print("No velocity data available")
        return
    
    # Calculate thresholds
    p50 = calculate_percentile(velocities, 50)
    p75 = calculate_percentile(velocities, 75)
    p90 = calculate_percentile(velocities, 90)
    
    print(f"\nVelocity Distribution:")
    print(f"  P50 (median): {p50:,.0f} views/hr")
    print(f"  P75 (rising threshold): {p75:,.0f} views/hr")
    print(f"  P90 (viral threshold): {p90:,.0f} views/hr")
    
    # Classify videos
    viral = [v for v in video_data if v["velocity"] > p90]
    rising = [v for v in video_data if p75 < v["velocity"] <= p90]
    stable = [v for v in video_data if p50 < v["velocity"] <= p75]
    
    print(f"\nClassification:")
    print(f"  🔥 Viral (>p90): {len(viral)} videos")
    print(f"  📈 Rising (>p75): {len(rising)} videos")
    print(f"  ➡️ Stable (>p50): {len(stable)} videos")
    
    # Show top videos
    sorted_videos = sorted(video_data, key=lambda x: x["velocity"], reverse=True)
    print(f"\nTop 5 by Velocity:")
    for i, v in enumerate(sorted_videos[:5], 1):
        trend = "🔥" if v["velocity"] > p90 else "📈" if v["velocity"] > p75 else "➡️"
        print(f"  {i}. {trend} {v['title']}...")
        print(f"     {v['views']:,} views, {v['velocity']:,.0f} views/hr")


async def test_title_analysis(videos: list):
    """Test title analysis logic."""
    from stats.core import calculate_percentile, calculate_mean
    import re
    
    print("\n" + "="*60)
    print("📝 TITLE ANALYSIS TEST")
    print("="*60)
    
    # Extract keywords
    STOP_WORDS = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
                  "of", "with", "by", "from", "is", "it", "this", "that", "i", "my", "we"}
    
    keyword_stats = {}
    
    for v in videos:
        title = v.get("title", "")
        views = v.get("view_count", 0)
        
        words = re.findall(r'\b[a-zA-Z]{3,}\b', title.lower())
        for word in words:
            if word in STOP_WORDS:
                continue
            if word not in keyword_stats:
                keyword_stats[word] = {"count": 0, "views": []}
            keyword_stats[word]["count"] += 1
            keyword_stats[word]["views"].append(views)
    
    # Calculate keyword metrics
    keywords = []
    for word, stats in keyword_stats.items():
        if stats["count"] >= 2:  # Minimum frequency
            avg_views = calculate_mean(stats["views"])
            keywords.append({
                "keyword": word,
                "frequency": stats["count"],
                "avg_views": avg_views,
            })
    
    # Sort by frequency * avg_views
    keywords.sort(key=lambda x: x["frequency"] * x["avg_views"], reverse=True)
    
    print(f"\nTop Keywords (freq × avg_views):")
    for k in keywords[:10]:
        print(f"  • {k['keyword']}: freq={k['frequency']}, avg_views={k['avg_views']:,.0f}")
    
    # Analyze title patterns
    patterns = {
        "has_caps": 0,
        "has_emoji": 0,
        "has_question": 0,
        "has_number": 0,
    }
    
    for v in videos:
        title = v.get("title", "")
        if re.search(r'[A-Z]{3,}', title):
            patterns["has_caps"] += 1
        if re.search(r'[\U0001F300-\U0001F9FF]', title):
            patterns["has_emoji"] += 1
        if title.strip().endswith('?'):
            patterns["has_question"] += 1
        if re.search(r'\d+', title):
            patterns["has_number"] += 1
    
    print(f"\nTitle Patterns ({len(videos)} videos):")
    for pattern, count in patterns.items():
        pct = count / len(videos) * 100
        print(f"  {pattern}: {count} ({pct:.0f}%)")


async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("🧪 CREATOR INTEL ALGORITHM TEST SUITE")
    print("="*60)
    
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    
    try:
        # Check what games we have cached
        games = await get_cached_games(redis_client)
        
        if not games:
            print("\n❌ No cached YouTube data found!")
            print("Run the YouTube worker first:")
            print("  python -m backend.workers.youtube_worker")
            return
        
        print(f"\n📦 Cached games: {', '.join(games)}")
        
        # Pick a game to test
        if len(sys.argv) > 1:
            game_key = sys.argv[1]
            if game_key not in games:
                print(f"\n❌ Game '{game_key}' not in cache. Available: {', '.join(games)}")
                return
        else:
            game_key = games[0]
        
        print(f"\n🎮 Testing with: {game_key}")
        
        # Load video data
        cache_key = f"youtube:games:{game_key}"
        raw_data = await redis_client.get(cache_key)
        data = json.loads(raw_data)
        videos = data.get("videos", [])
        fetched_at = data.get("fetched_at", "unknown")
        
        print(f"📹 Loaded {len(videos)} videos (fetched: {fetched_at})")
        
        # Run all tests
        await test_stats_module(videos)
        await test_category_stats(game_key, videos)
        await test_decay_module()
        await test_confidence_module(videos)
        await test_scoring_combiner()
        await test_viral_detection(game_key, videos)
        await test_title_analysis(videos)
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETE")
        print("="*60)
        print("\nTo test with a different game:")
        print(f"  REDIS_URL=redis://localhost:6380 python backend/scripts/test_intel_algorithms.py <game>")
        print(f"  Available: {', '.join(games)}")
        
    finally:
        await redis_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
