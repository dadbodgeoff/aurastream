#!/usr/bin/env python3
"""
Generate the first playbook report and verify data quality.

This script:
1. Fetches fresh data from YouTube and Twitch APIs
2. Runs all analyzers and generators
3. Saves the playbook to the database
4. Displays detailed results for verification

Usage:
    python scripts/generate_first_playbook.py
"""

import asyncio
import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from backend/.env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env'))


def print_section(title: str):
    """Print a section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_subsection(title: str):
    """Print a subsection header."""
    print(f"\n  📌 {title}")
    print("  " + "-" * 50)


async def main():
    print("\n" + "🎮" * 25)
    print("  AURASTREAM PLAYBOOK - FIRST GENERATION")
    print("🎮" * 25)
    print(f"\nTimestamp: {datetime.now().isoformat()}")
    
    # Check environment
    print_section("ENVIRONMENT CHECK")
    
    env_vars = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        "GOOGLE_API_KEY": os.getenv("GOOGLE_API_KEY"),
        "TWITCH_CLIENT_ID": os.getenv("TWITCH_CLIENT_ID"),
        "TWITCH_CLIENT_SECRET": os.getenv("TWITCH_CLIENT_SECRET"),
    }
    
    all_configured = True
    for key, value in env_vars.items():
        status = "✅" if value else "❌"
        masked = value[:10] + "..." if value and len(value) > 10 else value
        print(f"  {status} {key}: {masked if value else 'NOT SET'}")
        if not value and key in ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]:
            all_configured = False
    
    if not all_configured:
        print("\n  ❌ Required environment variables not configured!")
        print("  Please ensure backend/.env is properly configured.")
        return 1
    
    # Import services
    print_section("IMPORTING SERVICES")
    
    try:
        from backend.services.playbook import get_playbook_service
        from backend.services.trends import get_youtube_collector, get_twitch_collector
        print("  ✅ All services imported successfully")
    except Exception as e:
        print(f"  ❌ Import error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    # Test data fetching
    print_section("FETCHING TREND DATA")
    
    youtube = get_youtube_collector()
    twitch = get_twitch_collector()
    
    # YouTube
    print_subsection("YouTube Trending Videos")
    try:
        yt_videos = await youtube.fetch_trending(category="gaming", max_results=20)
        print(f"  ✅ Fetched {len(yt_videos)} YouTube videos")
        if yt_videos:
            for i, v in enumerate(yt_videos[:5]):
                views = f"{v.view_count:,}" if v.view_count else "N/A"
                print(f"     {i+1}. {v.title[:50]}... ({views} views)")
    except Exception as e:
        print(f"  ❌ YouTube fetch failed: {e}")
        yt_videos = []
    
    # Twitch Streams
    print_subsection("Twitch Live Streams")
    try:
        tw_streams = await twitch.fetch_top_streams(limit=50)
        print(f"  ✅ Fetched {len(tw_streams)} Twitch streams")
        if tw_streams:
            total_viewers = sum(s.viewer_count for s in tw_streams)
            print(f"     Total viewers: {total_viewers:,}")
            for i, s in enumerate(tw_streams[:5]):
                print(f"     {i+1}. {s.user_name} playing {s.game_name} ({s.viewer_count:,} viewers)")
    except Exception as e:
        print(f"  ❌ Twitch streams fetch failed: {e}")
        tw_streams = []
    
    # Twitch Games
    print_subsection("Twitch Top Games")
    try:
        tw_games = await twitch.fetch_top_games(limit=20)
        print(f"  ✅ Fetched {len(tw_games)} Twitch games")
        if tw_games:
            for i, g in enumerate(tw_games[:5]):
                print(f"     {i+1}. {g.name}")
    except Exception as e:
        print(f"  ❌ Twitch games fetch failed: {e}")
        tw_games = []
    
    # Twitch Clips
    print_subsection("Twitch Viral Clips")
    try:
        tw_clips = await twitch.fetch_clips(period="day", limit=10)
        print(f"  ✅ Fetched {len(tw_clips)} Twitch clips")
        if tw_clips:
            for i, c in enumerate(tw_clips[:3]):
                print(f"     {i+1}. {c.title[:40]}... ({c.view_count:,} views)")
    except Exception as e:
        print(f"  ❌ Twitch clips fetch failed: {e}")
        tw_clips = []
    
    # Generate Playbook
    print_section("GENERATING PLAYBOOK")
    
    try:
        service = get_playbook_service()
        
        print("  ⏳ Running analyzers and generators...")
        print("     - Golden Hours Analyzer")
        print("     - Niche Finder Analyzer")
        print("     - Viral Hooks Analyzer")
        print("     - Strategy Generator")
        print("     - Insight Generator")
        print("     - Headline Generator")
        
        playbook = await service.generate_playbook(save_to_db=True)
        
        print("\n  ✅ PLAYBOOK GENERATED SUCCESSFULLY!")
        
    except Exception as e:
        print(f"\n  ❌ Playbook generation failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    # Display Results
    print_section("PLAYBOOK RESULTS")
    
    print_subsection("Hero Section")
    print(f"  📅 Date: {playbook.playbook_date}")
    print(f"  🕐 Generated: {playbook.generated_at}")
    print(f"  🎯 Mood: {playbook.mood.upper()}")
    print(f"  📰 Headline: {playbook.headline}")
    print(f"  📝 Subheadline: {playbook.subheadline}")
    
    print_subsection("Quick Stats")
    print(f"  📺 Total Twitch Viewers: {playbook.total_twitch_viewers:,}")
    print(f"  🎬 Total YouTube Views: {playbook.total_youtube_gaming_views:,}")
    print(f"  🎮 Trending Game: {playbook.trending_game}")
    print(f"  🔥 Viral Video Count: {playbook.viral_video_count}")
    
    print_subsection(f"Golden Hours ({len(playbook.golden_hours)} found)")
    for i, gh in enumerate(playbook.golden_hours[:3]):
        print(f"  {i+1}. {gh.day} {gh.start_hour}:00-{gh.end_hour}:00 UTC")
        print(f"     Score: {gh.opportunity_score}% | Competition: {gh.competition_level} | Viewers: {gh.viewer_availability}")
        print(f"     💡 {gh.reasoning}")
    
    print_subsection(f"Niche Opportunities ({len(playbook.niche_opportunities)} found)")
    for i, niche in enumerate(playbook.niche_opportunities[:3]):
        print(f"  {i+1}. {niche.game_or_niche}")
        print(f"     Viewers: {niche.current_viewers:,} | Streams: {niche.stream_count} | Growth: {niche.growth_potential}")
        print(f"     Saturation: {niche.saturation_score}% | Opportunity: {100 - niche.saturation_score}%")
        print(f"     💡 {niche.why_now}")
        print(f"     🎯 Angle: {niche.suggested_angle}")
    
    print_subsection(f"Viral Hooks ({len(playbook.viral_hooks)} found)")
    for i, hook in enumerate(playbook.viral_hooks[:5]):
        print(f"  {i+1}. [{hook.hook_type.upper()}] {hook.hook}")
        print(f"     Virality: {hook.virality_score}% | Timing: {hook.time_sensitivity}")
        print(f"     💡 {hook.usage_tip}")
    
    print_subsection(f"Content Strategies ({len(playbook.strategies)} found)")
    for i, strategy in enumerate(playbook.strategies[:3]):
        print(f"  {i+1}. {strategy.title}")
        print(f"     Difficulty: {strategy.difficulty} | Impact: {strategy.expected_impact}")
        print(f"     Time: {strategy.time_investment}")
        print(f"     📝 {strategy.description[:80]}...")
    
    print_subsection(f"Title Formulas ({len(playbook.title_formulas)} found)")
    for i, formula in enumerate(playbook.title_formulas[:3]):
        print(f"  {i+1}. {formula.formula}")
        print(f"     Template: {formula.template}")
        if formula.example:
            print(f"     Example: {formula.example[:60]}...")
    
    print_subsection(f"Insight Cards ({len(playbook.insight_cards)} found)")
    for card in playbook.insight_cards[:4]:
        print(f"  {card.icon} {card.headline}")
        if card.metric:
            print(f"     {card.metric} {card.metric_label or ''}")
        print(f"     {card.body[:60]}...")
    
    print_subsection("Trending Hashtags")
    print(f"  {' '.join(playbook.trending_hashtags[:10])}")
    
    print_subsection("Title Keywords")
    print(f"  {', '.join(playbook.title_keywords[:10])}")
    
    print_subsection("Daily Mantra")
    print(f"  ✨ \"{playbook.daily_mantra}\"")
    
    # Verify Database Storage
    print_section("DATABASE VERIFICATION")
    
    try:
        latest = await service.get_latest_playbook()
        if latest and latest.headline == playbook.headline:
            print("  ✅ Playbook successfully stored in database")
            print(f"     Headline matches: {latest.headline[:50]}...")
        else:
            print("  ⚠️  Database verification inconclusive")
    except Exception as e:
        print(f"  ❌ Database verification failed: {e}")
    
    # Summary
    print_section("SUMMARY")
    print(f"""
  ✅ Playbook Generation: SUCCESS
  
  📊 Data Quality:
     - Golden Hours: {len(playbook.golden_hours)} windows identified
     - Niche Opportunities: {len(playbook.niche_opportunities)} games found
     - Viral Hooks: {len(playbook.viral_hooks)} patterns detected
     - Strategies: {len(playbook.strategies)} actionable plans
     - Insight Cards: {len(playbook.insight_cards)} quick insights
     - Title Formulas: {len(playbook.title_formulas)} templates
     - Thumbnail Recipes: {len(playbook.thumbnail_recipes)} designs
     - Hashtags: {len(playbook.trending_hashtags)} trending
     - Keywords: {len(playbook.title_keywords)} for titles
  
  🎯 Market Mood: {playbook.mood.upper()}
  📰 Today's Headline: {playbook.headline}
  
  The playbook is now available at /dashboard/playbook
    """)
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
