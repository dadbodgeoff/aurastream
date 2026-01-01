"""
Playbook Orchestrator - Main service that coordinates all modules.

This is the entry point for playbook generation. It:
1. Fetches fresh data from YouTube and Twitch collectors
2. Runs all analyzers to extract insights
3. Runs all generators to create content
4. Assembles the final playbook
5. Saves to database with timestamp
"""

import logging
import time
from datetime import datetime, date
from typing import Optional, List, Dict, Any

from backend.api.schemas.playbook import (
    TodaysPlaybook,
    PlaybookSummary,
    GoldenHourWindow,
    NicheOpportunity,
    ViralHook,
    TitleFormula,
    ThumbnailRecipe,
    ContentStrategy,
    InsightCard,
    WeeklySchedule,
    VideoIdea,
)
from backend.services.playbook.analyzers import (
    GoldenHoursAnalyzer,
    NicheFinderAnalyzer,
    ViralHooksAnalyzer,
)
from backend.services.playbook.generators import (
    StrategyGenerator,
    InsightGenerator,
    HeadlineGenerator,
)
from backend.services.playbook.repository import PlaybookRepository
from backend.services.playbook.ai_refiner import get_ai_refiner
from backend.services.trends import get_youtube_collector, get_twitch_collector

logger = logging.getLogger(__name__)


class PlaybookOrchestrator:
    """
    Main orchestrator for playbook generation.
    
    Coordinates data fetching, analysis, and content generation
    to produce timestamped playbook reports.
    """
    
    def __init__(self):
        # Analyzers
        self.golden_hours_analyzer = GoldenHoursAnalyzer()
        self.niche_finder = NicheFinderAnalyzer()
        self.viral_hooks_analyzer = ViralHooksAnalyzer()
        
        # Generators
        self.strategy_generator = StrategyGenerator()
        self.insight_generator = InsightGenerator()
        self.headline_generator = HeadlineGenerator()
        
        # Repository
        self.repository = PlaybookRepository()
    
    async def generate_playbook(
        self,
        save_to_db: bool = True,
    ) -> TodaysPlaybook:
        """
        Generate a complete playbook report.
        
        This is the main entry point called by the data refresh worker.
        
        Args:
            save_to_db: Whether to persist the report
            
        Returns:
            The generated playbook
        """
        start_time = time.time()
        logger.info("Starting playbook generation...")
        
        try:
            # Step 1: Fetch fresh data
            logger.info("Fetching trend data...")
            data = await self._fetch_all_data()
            
            # Step 2: Run analyzers
            logger.info("Running analyzers...")
            golden_hours = await self.golden_hours_analyzer.analyze(
                data["twitch_streams"],
                data["twitch_games"],
            )
            
            niche_opportunities = await self.niche_finder.analyze(
                data["twitch_games"],
                data["twitch_streams"],
                data["youtube_videos"],
            )
            
            viral_hooks = await self.viral_hooks_analyzer.analyze(
                data["youtube_videos"],
                data["twitch_clips"],
                data["keywords"],
            )
            
            # Step 3: Run generators
            logger.info("Running generators...")
            headline, subheadline, mood = self.headline_generator.generate(
                data["twitch_streams"],
                data["twitch_games"],
                [gh.model_dump() for gh in golden_hours],
                [n.model_dump() for n in niche_opportunities],
            )
            
            strategies = await self.strategy_generator.generate_strategies(
                [n.model_dump() for n in niche_opportunities],
                [gh.model_dump() for gh in golden_hours],
                [vh.model_dump() for vh in viral_hooks],
            )
            
            title_formulas = self.strategy_generator.generate_title_formulas(
                data["youtube_videos"]
            )
            
            thumbnail_recipes = self.strategy_generator.generate_thumbnail_recipes()
            
            insight_cards = await self.insight_generator.generate_insights(
                data["twitch_streams"],
                data["twitch_games"],
                data["youtube_videos"],
                [gh.model_dump() for gh in golden_hours],
                [n.model_dump() for n in niche_opportunities],
                [vh.model_dump() for vh in viral_hooks],
            )
            
            # Step 4: AI Refinement
            logger.info("Running AI refinement...")
            ai_refiner = get_ai_refiner()
            
            # Generate weekly schedule (algorithmic)
            weekly_schedule = await ai_refiner.generate_weekly_schedule(
                data["twitch_streams"],
                golden_hours,
            )
            
            # Refine with Gemini (sends rich context, gets smart copy)
            ai_refined = await ai_refiner.refine_playbook(
                twitch_data={
                    "games": data["twitch_games"],
                    "streams": data["twitch_streams"],
                },
                youtube_data={
                    "videos": data["youtube_videos"],
                },
                golden_hours=golden_hours,
                niches=niche_opportunities,
                viral_hooks=viral_hooks,
                current_headline=headline,
                current_mood=mood,
            )
            
            # Use AI-refined values if available
            if ai_refined.get("headline"):
                headline = ai_refined["headline"]
            if ai_refined.get("subheadline"):
                subheadline = ai_refined["subheadline"]
            if ai_refined.get("mood"):
                mood = ai_refined["mood"]
            if ai_refined.get("daily_mantra"):
                daily_mantra = ai_refined["daily_mantra"]
            else:
                daily_mantra = self.headline_generator.get_daily_mantra()
            
            # Update weekly schedule with AI insight
            if ai_refined.get("weekly_insight"):
                weekly_schedule.ai_insight = ai_refined["weekly_insight"]
            if ai_refined.get("best_slot_summary"):
                weekly_schedule.best_slot = ai_refined["best_slot_summary"]
            
            # Update niche angles with AI suggestions
            if ai_refined.get("strategy_angles"):
                angle_map = {a["game"]: a for a in ai_refined["strategy_angles"]}
                for niche in niche_opportunities:
                    if niche.game_or_niche in angle_map:
                        niche.suggested_angle = angle_map[niche.game_or_niche].get("angle", niche.suggested_angle)
            
            # Get video ideas from AI
            video_ideas = ai_refined.get("video_ideas", [])
            
            # Step 5: Assemble playbook
            logger.info("Assembling playbook...")
            playbook = TodaysPlaybook(
                playbook_date=date.today(),
                generated_at=datetime.utcnow(),
                headline=headline,
                subheadline=subheadline,
                mood=mood,
                total_twitch_viewers=sum(
                    s.get("viewer_count", 0) for s in data["twitch_streams"]
                ),
                total_youtube_gaming_views=sum(
                    v.get("view_count", 0) or v.get("views", 0) 
                    for v in data["youtube_videos"]
                ),
                trending_game=data["twitch_games"][0].get("name", "") if data["twitch_games"] else "",
                viral_video_count=len([
                    v for v in data["youtube_videos"]
                    if (v.get("view_count", 0) or v.get("views", 0)) > 1_000_000
                ]),
                golden_hours=golden_hours,
                weekly_schedule=weekly_schedule,
                niche_opportunities=niche_opportunities,
                viral_hooks=viral_hooks,
                title_formulas=title_formulas,
                thumbnail_recipes=thumbnail_recipes,
                video_ideas=video_ideas,
                strategies=strategies,
                insight_cards=insight_cards,
                trending_hashtags=data["keywords"].get("hashtags", [])[:10],
                title_keywords=[
                    kw.get("keyword", "") 
                    for kw in data["keywords"].get("title_keywords", [])[:10]
                ],
                daily_mantra=daily_mantra,
                success_story=None,  # Could be populated from community data
            )
            
            # Step 6: Save to database
            if save_to_db:
                logger.info("Saving playbook to database...")
                report_id = await self.repository.save_report(playbook)
                logger.info(f"Playbook saved with ID: {report_id}")
            
            duration = int((time.time() - start_time) * 1000)
            logger.info(f"Playbook generation complete in {duration}ms")
            
            return playbook
            
        except Exception as e:
            logger.error(f"Playbook generation failed: {e}")
            raise
    
    async def get_latest_playbook(self) -> Optional[TodaysPlaybook]:
        """Get the most recent playbook from the database."""
        report = await self.repository.get_latest_report()
        if report:
            return self._report_to_playbook(report)
        return None
    
    async def get_playbook_by_id(self, report_id: str) -> Optional[TodaysPlaybook]:
        """Get a specific playbook by ID."""
        report = await self.repository.get_report_by_id(report_id)
        if report:
            return self._report_to_playbook(report)
        return None
    
    async def list_reports(self, limit: int = 20) -> List[PlaybookSummary]:
        """List recent playbook reports."""
        reports = await self.repository.list_recent_reports(limit)
        return [
            PlaybookSummary(
                playbook_date=datetime.fromisoformat(r["report_date"]).date(),
                headline=r["headline"],
                top_opportunity=r.get("trending_game", ""),
                best_stream_time="Check report",
                trending_game=r.get("trending_game", ""),
                insight_count=0,  # Would need to count from JSON
                generated_at=datetime.fromisoformat(r["report_timestamp"]),
            )
            for r in reports
        ]
    
    async def _fetch_all_data(self) -> Dict[str, Any]:
        """Fetch all required data from collectors."""
        youtube = get_youtube_collector()
        twitch = get_twitch_collector()
        
        # Fetch in parallel would be better, but keeping simple for now
        youtube_videos = await youtube.fetch_trending(category="gaming", max_results=50)
        twitch_streams = await twitch.fetch_top_streams(limit=100)
        twitch_games = await twitch.fetch_top_games(limit=30)
        
        # Fetch clips from top games (need game_id)
        twitch_clips = []
        if twitch_games:
            # Get clips from top 3 games for variety
            for game in twitch_games[:3]:
                try:
                    game_clips = await twitch.fetch_clips(
                        game_id=game.id,
                        period="day",
                        limit=10
                    )
                    twitch_clips.extend(game_clips)
                except Exception as e:
                    logger.warning(f"Failed to fetch clips for {game.name}: {e}")
            
            # Sort by view count and take top 20
            twitch_clips.sort(key=lambda c: c.view_count, reverse=True)
            twitch_clips = twitch_clips[:20]
        
        # Build keywords data structure
        keywords = {
            "hashtags": ["#gaming", "#streamer", "#twitch", "#youtube", "#live"],
            "title_keywords": [],
            "tag_keywords": [],
            "topic_keywords": [],
        }
        
        # Extract keywords from videos
        from collections import Counter
        title_words: Counter = Counter()
        for video in youtube_videos:
            words = video.title.lower().split()
            for word in words:
                if len(word) > 3:
                    title_words[word] += 1
        
        keywords["title_keywords"] = [
            {"keyword": word, "count": count}
            for word, count in title_words.most_common(20)
        ]
        
        return {
            "youtube_videos": [v.model_dump() for v in youtube_videos],
            "twitch_streams": [self._stream_to_dict(s) for s in twitch_streams],
            "twitch_games": [self._game_to_dict(g) for g in twitch_games],
            "twitch_clips": [self._clip_to_dict(c) for c in twitch_clips],
            "keywords": keywords,
        }
    
    def _stream_to_dict(self, stream) -> Dict[str, Any]:
        """Convert stream dataclass to dict."""
        return {
            "user_id": stream.user_id,
            "user_name": stream.user_name,
            "game_id": stream.game_id,
            "game_name": stream.game_name,
            "viewer_count": stream.viewer_count,
            "title": stream.title,
            "started_at": stream.started_at.isoformat() if stream.started_at else None,
            "language": stream.language,
            "tags": stream.tags or [],
            "is_mature": stream.is_mature,
        }
    
    def _game_to_dict(self, game) -> Dict[str, Any]:
        """Convert game dataclass to dict."""
        return {
            "game_id": game.id,
            "id": game.id,
            "name": game.name,
            "box_art_url": game.box_art_url,
            "twitch_viewers": 0,  # Calculated separately
            "twitch_streams": 0,
        }
    
    def _clip_to_dict(self, clip) -> Dict[str, Any]:
        """Convert clip dataclass to dict."""
        return {
            "id": clip.id,
            "title": clip.title,
            "view_count": clip.view_count,
            "creator_name": clip.creator_name,
            "broadcaster_name": clip.broadcaster_name,
        }
    
    def _report_to_playbook(self, report: Dict[str, Any]) -> TodaysPlaybook:
        """Convert database report to TodaysPlaybook."""
        # Parse weekly schedule if present
        weekly_schedule = None
        if report.get("weekly_schedule"):
            from backend.api.schemas.playbook import WeeklyTimeSlot
            ws_data = report["weekly_schedule"]
            weekly_schedule = WeeklySchedule(
                monday=[WeeklyTimeSlot(**s) for s in ws_data.get("monday", [])],
                tuesday=[WeeklyTimeSlot(**s) for s in ws_data.get("tuesday", [])],
                wednesday=[WeeklyTimeSlot(**s) for s in ws_data.get("wednesday", [])],
                thursday=[WeeklyTimeSlot(**s) for s in ws_data.get("thursday", [])],
                friday=[WeeklyTimeSlot(**s) for s in ws_data.get("friday", [])],
                saturday=[WeeklyTimeSlot(**s) for s in ws_data.get("saturday", [])],
                sunday=[WeeklyTimeSlot(**s) for s in ws_data.get("sunday", [])],
                timezone=ws_data.get("timezone", "UTC"),
                best_slot=ws_data.get("best_slot"),
                ai_insight=ws_data.get("ai_insight"),
            )
        
        return TodaysPlaybook(
            playbook_date=datetime.fromisoformat(report["report_date"]).date(),
            generated_at=datetime.fromisoformat(report["report_timestamp"]),
            headline=report["headline"],
            subheadline=report.get("subheadline", ""),
            mood=report.get("mood", "opportunity"),
            total_twitch_viewers=report.get("total_twitch_viewers", 0),
            total_youtube_gaming_views=report.get("total_youtube_gaming_views", 0),
            trending_game=report.get("trending_game", ""),
            viral_video_count=report.get("viral_video_count", 0),
            golden_hours=[GoldenHourWindow(**gh) for gh in report.get("golden_hours", [])],
            weekly_schedule=weekly_schedule,
            niche_opportunities=[NicheOpportunity(**n) for n in report.get("niche_opportunities", [])],
            viral_hooks=[ViralHook(**vh) for vh in report.get("viral_hooks", [])],
            title_formulas=[TitleFormula(**tf) for tf in report.get("title_formulas", [])],
            thumbnail_recipes=[ThumbnailRecipe(**tr) for tr in report.get("thumbnail_recipes", [])],
            video_ideas=[VideoIdea(**vi) for vi in report.get("video_ideas", [])],
            strategies=[ContentStrategy(**s) for s in report.get("strategies", [])],
            insight_cards=[InsightCard(**ic) for ic in report.get("insight_cards", [])],
            trending_hashtags=report.get("trending_hashtags", []),
            title_keywords=report.get("title_keywords", []),
            daily_mantra=report.get("daily_mantra", ""),
            success_story=report.get("success_story"),
        )
