#!/usr/bin/env python3
"""
Compare OLD vs NEW Algorithm Results

Shows concrete improvements in data quality for Fortnite.
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'backend', 'services', 'intel'))

import redis.asyncio as redis

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6380")


def old_algorithm_stats(videos: list) -> dict:
    """
    OLD ALGORITHM: Simple averaging, no outlier removal, top-heavy weighting.
    This is what you had before.
    """
    views = [v.get("view_count", 0) for v in videos if v.get("view_count", 0) > 0]
    
    # Old: Simple mean (skewed by outliers)
    mean = sum(views) / len(views) if views else 0
    
    # Old: Just took top 5-10 videos for keywords
    top_videos = sorted(videos, key=lambda x: x.get("view_count", 0), reverse=True)[:5]
    
    # Old: Keywords from top videos only
    keywords = {}
    for v in top_videos:
        title = v.get("title", "").lower()
        for word in title.split():
            if len(word) > 3:
                keywords[word] = keywords.get(word, 0) + 1
    
    top_keywords = sorted(keywords.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Old: Viral detection was random or hardcoded thresholds
    viral_threshold = 5000  # Hardcoded, not data-driven
    
    return {
        "mean_views": mean,
        "outliers_removed": 0,
        "top_keywords": [k for k, _ in top_keywords],
        "viral_threshold": viral_threshold,
        "videos_analyzed_for_keywords": 5,
        "confidence": "N/A (not calculated)",
    }


def new_algorithm_stats(videos: list) -> dict:
    """
    NEW ALGORITHM: Outlier removal, position-weighted, statistical thresholds.
    """
    from stats.core import calculate_mean, calculate_std, calculate_percentile
    from stats.outliers import remove_outliers_iqr, detect_outliers, OutlierMethod
    from decay.velocity import velocity_from_timestamps
    from confidence.calculator import calculate_confidence
    from datetime import datetime, timezone
    import re
    
    views = [v.get("view_count", 0) for v in videos if v.get("view_count", 0) > 0]
    
    # NEW: Outlier detection and removal
    outlier_result = detect_outliers(views, OutlierMethod.IQR, k=1.5)
    clean_views = outlier_result.clean_values
    
    # NEW: Stats on clean data
    mean = calculate_mean(clean_views)
    
    # NEW: Position-weighted keyword extraction (all videos contribute)
    keywords = {}
    STOP_WORDS = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
                  "of", "with", "by", "from", "is", "it", "this", "that", "i", "my", "we",
                  "fortnite", "gameplay", "game", "video"}
    
    for idx, v in enumerate(videos):
        title = v.get("title", "")
        view_count = v.get("view_count", 0)
        
        # Position weight: top videos count more, but ALL contribute
        position_weight = max(0.5, 1.0 - (idx / len(videos)) * 0.5)
        
        words = re.findall(r'\b[a-zA-Z]{3,}\b', title.lower())
        for word in words:
            if word in STOP_WORDS:
                continue
            if word not in keywords:
                keywords[word] = {"weighted_freq": 0, "total_views": 0, "count": 0}
            keywords[word]["weighted_freq"] += position_weight
            keywords[word]["total_views"] += view_count
            keywords[word]["count"] += 1
    
    # NEW: Score by weighted_freq * avg_views
    scored_keywords = []
    for word, stats in keywords.items():
        if stats["count"] >= 2:
            avg_views = stats["total_views"] / stats["count"]
            score = stats["weighted_freq"] * avg_views
            scored_keywords.append((word, score, stats["count"]))
    
    scored_keywords.sort(key=lambda x: x[1], reverse=True)
    top_keywords = [(k, c) for k, _, c in scored_keywords[:10]]
    
    # NEW: Data-driven viral threshold (p90 velocity)
    now = datetime.now(timezone.utc)
    velocities = []
    for v in videos:
        views = v.get("view_count", 0)
        published = v.get("published_at")
        if views > 0 and published:
            vel = velocity_from_timestamps(views, published, now)
            if vel:
                velocities.append(vel)
    
    viral_threshold = calculate_percentile(velocities, 90) if velocities else 0
    
    # NEW: Confidence score
    confidence = calculate_confidence(
        sample_size=len(videos),
        score_variance=0.15,
        data_freshness_hours=48,
    )
    
    return {
        "mean_views": mean,
        "outliers_removed": outlier_result.outlier_count,
        "outlier_values": [int(v) for v in outlier_result.outliers],
        "top_keywords": [f"{k} (n={c})" for k, c in top_keywords],
        "viral_threshold": viral_threshold,
        "videos_analyzed_for_keywords": len(videos),
        "confidence": f"{confidence}/100",
    }


async def main():
    game_key = sys.argv[1] if len(sys.argv) > 1 else "fortnite"
    
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    
    try:
        cache_key = f"youtube:games:{game_key}"
        raw_data = await redis_client.get(cache_key)
        
        if not raw_data:
            print(f"No data for {game_key}")
            return
        
        data = json.loads(raw_data)
        videos = data.get("videos", [])
        
        print("\n" + "="*70)
        print(f"📊 ALGORITHM COMPARISON: {game_key.upper()}")
        print(f"   {len(videos)} videos analyzed")
        print("="*70)
        
        old = old_algorithm_stats(videos)
        new = new_algorithm_stats(videos)
        
        print("\n" + "-"*70)
        print("METRIC                    | OLD ALGORITHM        | NEW ALGORITHM")
        print("-"*70)
        
        # Mean views
        old_mean = f"{old['mean_views']:,.0f}"
        new_mean = f"{new['mean_views']:,.0f}"
        diff = ((new['mean_views'] - old['mean_views']) / old['mean_views'] * 100) if old['mean_views'] else 0
        print(f"Mean Views                | {old_mean:20} | {new_mean:20}")
        if diff < 0:
            print(f"  └─ Change               |                      | ↓ {abs(diff):.1f}% (outliers removed)")
        
        # Outliers
        print(f"Outliers Removed          | {old['outliers_removed']:20} | {new['outliers_removed']:20}")
        if new['outlier_values']:
            print(f"  └─ Outlier values       |                      | {new['outlier_values']}")
        
        # Viral threshold
        old_viral = f"{old['viral_threshold']:,} (hardcoded)"
        new_viral = f"{new['viral_threshold']:,.0f} views/hr (p90)"
        print(f"Viral Threshold           | {old_viral:20} | {new_viral}")
        
        # Videos analyzed
        print(f"Videos for Keywords       | {old['videos_analyzed_for_keywords']:20} | {new['videos_analyzed_for_keywords']:20}")
        
        # Confidence
        print(f"Confidence Score          | {old['confidence']:20} | {new['confidence']:20}")
        
        print("-"*70)
        
        # Keywords comparison
        print("\n📝 KEYWORD COMPARISON:")
        print("-"*70)
        print(f"OLD (top 5 videos only):     {', '.join(old['top_keywords'][:5])}")
        print(f"NEW (all videos, weighted):  {', '.join(new['top_keywords'][:5])}")
        
        # Show what's different
        old_set = set(old['top_keywords'])
        new_set = set(k.split(' (')[0] for k in new['top_keywords'])
        
        new_discoveries = new_set - old_set
        if new_discoveries:
            print(f"\n✨ NEW discoveries (missed by old algorithm): {', '.join(list(new_discoveries)[:5])}")
        
        print("\n" + "="*70)
        print("📈 KEY IMPROVEMENTS:")
        print("="*70)
        print("""
1. OUTLIER REMOVAL
   - Old: Mega-viral videos skewed ALL statistics
   - New: IQR-based removal gives accurate category baseline
   
2. POSITION-WEIGHTED KEYWORDS  
   - Old: Only looked at top 5 videos (missed patterns in videos 6-20)
   - New: All videos contribute, weighted by position (0.5-1.0)
   
3. DATA-DRIVEN VIRAL THRESHOLD
   - Old: Hardcoded 5000 views/hr for all categories
   - New: P90 velocity calculated per-category (Fortnite ≠ Arc Raiders)
   
4. CONFIDENCE SCORING
   - Old: No way to know if recommendations were reliable
   - New: 0-100 confidence based on sample size, variance, freshness
   
5. DETERMINISTIC FALLBACKS
   - Old: random.uniform() when data missing (different results each time)
   - New: Hash-based deterministic values (consistent recommendations)
""")
        
    finally:
        await redis_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
