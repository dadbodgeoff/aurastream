"""
Playbook AI Refiner - Uses Gemini to synthesize insights into actionable recommendations.

Takes raw analyzer outputs and trend data, sends a dense summary to Gemini,
and gets back refined headlines, strategies, and weekly schedule insights.
"""

import json
import logging
import os
from typing import Dict, Any, List, Optional

import google.generativeai as genai

from backend.api.schemas.playbook import (
    WeeklySchedule,
    WeeklyTimeSlot,
    GoldenHourWindow,
    NicheOpportunity,
    ViralHook,
    ContentStrategy,
    InsightCard,
    VideoIdea,
)

logger = logging.getLogger(__name__)


class PlaybookAIRefiner:
    """
    Refines playbook insights using Gemini AI.
    
    Sends a token-efficient but context-rich summary to Gemini
    and receives refined, actionable recommendations.
    """
    
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel("gemini-2.0-flash-001")
            self.enabled = True
        else:
            logger.warning("GOOGLE_API_KEY not set - AI refinement disabled")
            self.model = None
            self.enabled = False
    
    async def refine_playbook(
        self,
        twitch_data: Dict[str, Any],
        youtube_data: Dict[str, Any],
        golden_hours: List[GoldenHourWindow],
        niches: List[NicheOpportunity],
        viral_hooks: List[ViralHook],
        current_headline: str,
        current_mood: str,
    ) -> Dict[str, Any]:
        """
        Refine playbook with AI-generated insights.
        
        Returns dict with:
        - headline: Refined attention-grabbing headline
        - subheadline: Supporting context
        - mood: Market mood assessment
        - weekly_insight: AI analysis of best streaming times
        - strategy_angles: List of refined strategy recommendations
        - daily_mantra: Motivational quote
        - niche_angles: Dict mapping game names to refined angles
        """
        if not self.enabled:
            return self._fallback_response(current_headline, current_mood)
        
        try:
            # Build dense context summary
            context = self._build_context_summary(
                twitch_data, youtube_data, golden_hours, niches, viral_hooks
            )
            
            # Build prompt
            prompt = self._build_prompt(context)
            
            # Call Gemini
            response = await self._call_gemini(prompt)
            
            # Parse response
            return self._parse_response(response, current_headline, current_mood)
            
        except Exception as e:
            logger.error(f"AI refinement failed: {e}")
            return self._fallback_response(current_headline, current_mood)
    
    def _build_context_summary(
        self,
        twitch_data: Dict[str, Any],
        youtube_data: Dict[str, Any],
        golden_hours: List[GoldenHourWindow],
        niches: List[NicheOpportunity],
        viral_hooks: List[ViralHook],
    ) -> str:
        """Build a dense, token-efficient context summary."""
        lines = []
        
        # Twitch Live Data
        lines.append("=== TWITCH LIVE NOW ===")
        
        # Top games with stats
        games = twitch_data.get("games", [])[:8]
        if games:
            game_strs = []
            for g in games:
                name = g.get("name", "Unknown")
                viewers = g.get("twitch_viewers", 0)
                streams = g.get("twitch_streams", 0)
                game_strs.append(f"{name}({self._fmt_num(viewers)}v/{streams}s)")
            lines.append(f"Top Games: {', '.join(game_strs)}")
        
        # Stream stats
        streams = twitch_data.get("streams", [])
        total_viewers = sum(s.get("viewer_count", 0) for s in streams)
        big_streamers = len([s for s in streams if s.get("viewer_count", 0) > 5000])
        lines.append(f"Big Streamers Online: {big_streamers} (5K+ viewers)")
        lines.append(f"Total: {self._fmt_num(total_viewers)} viewers / {len(streams)} streams")
        
        # Top streamer names for context
        top_streamers = sorted(streams, key=lambda x: x.get("viewer_count", 0), reverse=True)[:5]
        if top_streamers:
            names = [f"{s.get('user_name', '?')}({s.get('game_name', '?')})" for s in top_streamers]
            lines.append(f"Top Live: {', '.join(names)}")
        
        lines.append("")
        
        # YouTube Gaming Data - DETAILED for video ideas
        lines.append("=== YOUTUBE GAMING TOP VIDEOS (24h) ===")
        
        videos = youtube_data.get("videos", [])
        viral_count = len([v for v in videos if (v.get("view_count", 0) or v.get("views", 0)) > 1_000_000])
        lines.append(f"Viral Videos (1M+): {viral_count}")
        
        # Detailed top videos for AI to generate ideas from
        lines.append("")
        lines.append("TOP PERFORMING VIDEOS:")
        for i, v in enumerate(videos[:12], 1):
            views = v.get("view_count", 0) or v.get("views", 0)
            title = v.get("title", "Unknown")[:80]
            channel = v.get("channel_title", v.get("channel", "Unknown"))[:30]
            tags = v.get("tags", [])[:5]
            tags_str = ", ".join(tags) if tags else "none"
            lines.append(f"{i}. [{self._fmt_num(views)} views] \"{title}\"")
            lines.append(f"   Channel: {channel} | Tags: {tags_str}")
        
        # Extract trending tags/keywords
        all_tags = []
        for v in videos:
            all_tags.extend(v.get("tags", [])[:5])
        if all_tags:
            from collections import Counter
            top_tags = [t for t, _ in Counter(all_tags).most_common(15)]
            lines.append(f"\nTrending Tags: {', '.join(['#' + t for t in top_tags])}")
        
        lines.append("")
        
        # Calculated Insights
        lines.append("=== NICHE OPPORTUNITIES ===")
        for n in niches[:6]:
            opp = 100 - n.saturation_score
            lines.append(
                f"• {n.game_or_niche}: {self._fmt_num(n.current_viewers)}v/{n.stream_count}s, "
                f"{opp}% opportunity, growth={n.growth_potential}"
            )
        
        lines.append("")
        lines.append("=== GOLDEN HOURS (next 48h) ===")
        for gh in golden_hours[:5]:
            lines.append(
                f"• {gh.day} {gh.start_hour}:00-{gh.end_hour}:00 UTC: "
                f"{gh.opportunity_score}% (comp={gh.competition_level}, viewers={gh.viewer_availability})"
            )
        
        lines.append("")
        lines.append("=== VIRAL PATTERNS ===")
        for vh in viral_hooks[:6]:
            lines.append(f"• [{vh.hook_type}] {vh.hook}: {vh.virality_score}% viral, timing={vh.time_sensitivity}")
        
        # Cross-platform signals
        lines.append("")
        lines.append("=== CROSS-PLATFORM SIGNALS ===")
        
        # Find games trending on both
        yt_games = set()
        for v in videos:
            title_lower = v.get("title", "").lower()
            for g in games:
                if g.get("name", "").lower() in title_lower:
                    yt_games.add(g.get("name"))
        
        if yt_games:
            lines.append(f"Hot on both YT+Twitch: {', '.join(list(yt_games)[:4])}")
        
        # Find underserved (high YT, low Twitch saturation)
        underserved = [n for n in niches if n.growth_potential in ("explosive", "high") and n.saturation_score < 40]
        if underserved:
            lines.append(f"Underserved gems: {', '.join([n.game_or_niche for n in underserved[:3]])}")
        
        return "\n".join(lines)
    
    def _build_prompt(self, context: str) -> str:
        """Build the Gemini prompt."""
        return f"""You are a streaming strategy expert analyzing live Twitch/YouTube data for small streamers.

{context}

Based on this data, provide strategic recommendations in JSON format:

{{
  "headline": "Attention-grabbing headline about today's opportunity (max 60 chars, use emoji)",
  "subheadline": "Supporting context explaining the opportunity (max 120 chars)",
  "mood": "bullish|opportunity|competitive|cautious",
  "weekly_insight": "Analysis of best streaming times based on the data (max 200 chars)",
  "best_slot_summary": "e.g. 'Wednesday 10AM-12PM UTC' - the single best time to stream",
  "strategy_angles": [
    {{
      "game": "Game name",
      "angle": "Specific content angle to stand out (max 100 chars)",
      "why": "Why this works right now (max 80 chars)"
    }}
  ],
  "video_ideas": [
    {{
      "game_or_category": "Game or category name",
      "title": "Catchy video/stream title that would work (max 80 chars)",
      "title_reasoning": "Why this title pattern works - reference the data (max 100 chars)",
      "hook": "Opening hook for first 30 seconds to grab attention",
      "description": "Brief content description (max 150 chars)",
      "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
      "tags_reasoning": "Why these specific tags - reference trending tags from data (max 100 chars)",
      "thumbnail_concept": "Visual concept for thumbnail (max 100 chars)",
      "thumbnail_text": "Bold text to put on thumbnail (max 20 chars)",
      "thumbnail_colors": ["#hex1", "#hex2"],
      "inspired_by": "Title of the trending video this is inspired by",
      "inspired_by_views": 123456,
      "why_this_works": "Strategic reasoning - why this idea has potential right now (max 150 chars)",
      "difficulty": "beginner|intermediate|advanced",
      "estimated_length": "e.g. '15-20 min' or '2-3 hours'"
    }}
  ],
  "daily_mantra": "Motivational quote for streamers (max 60 chars)",
  "top_insight": "The single most important takeaway (max 150 chars)"
}}

Rules:
- Be specific, reference actual games/data from the context
- Focus on actionable advice for small streamers (under 100 avg viewers)
- Highlight underserved niches over saturated ones
- Connect timing recommendations to specific games when possible
- Keep copy punchy and streamer-friendly (not corporate)
- Use emojis sparingly but effectively
- Generate 3-5 video_ideas based on the TOP PERFORMING VIDEOS data
- Each video idea should be inspired by a real trending video but adapted for small streamers
- Make titles clickable but not clickbait - deliver on the promise
- Thumbnail concepts should be simple and achievable
- IMPORTANT: Include reasoning for titles, tags, and overall strategy - explain WHY based on the data"""
    
    async def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API."""
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                max_output_tokens=1500,  # Increased for video ideas
            ),
        )
        return response.text
    
    def _parse_response(
        self,
        response: str,
        fallback_headline: str,
        fallback_mood: str,
    ) -> Dict[str, Any]:
        """Parse Gemini response JSON."""
        try:
            # Extract JSON from response (handle markdown code blocks)
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            
            data = json.loads(json_str.strip())
            
            # Parse video ideas into VideoIdea objects
            video_ideas = []
            for i, idea in enumerate(data.get("video_ideas", [])):
                try:
                    video_ideas.append(VideoIdea(
                        idea_id=f"ai-idea-{i+1}",
                        game_or_category=idea.get("game_or_category", "Gaming"),
                        title=idea.get("title", "Untitled"),
                        title_reasoning=idea.get("title_reasoning", ""),
                        hook=idea.get("hook", ""),
                        description=idea.get("description", ""),
                        tags=idea.get("tags", [])[:8],
                        tags_reasoning=idea.get("tags_reasoning", ""),
                        thumbnail_concept=idea.get("thumbnail_concept", ""),
                        thumbnail_text=idea.get("thumbnail_text", ""),
                        thumbnail_colors=idea.get("thumbnail_colors", ["#9333EA", "#EC4899"]),
                        inspired_by=idea.get("inspired_by", ""),
                        inspired_by_views=idea.get("inspired_by_views", 0),
                        why_this_works=idea.get("why_this_works", ""),
                        difficulty=idea.get("difficulty", "beginner"),
                        estimated_length=idea.get("estimated_length", "10-15 min"),
                    ))
                except Exception as e:
                    logger.warning(f"Failed to parse video idea {i}: {e}")
            
            return {
                "headline": data.get("headline", fallback_headline),
                "subheadline": data.get("subheadline", ""),
                "mood": data.get("mood", fallback_mood),
                "weekly_insight": data.get("weekly_insight", ""),
                "best_slot_summary": data.get("best_slot_summary", ""),
                "strategy_angles": data.get("strategy_angles", []),
                "video_ideas": video_ideas,
                "daily_mantra": data.get("daily_mantra", ""),
                "top_insight": data.get("top_insight", ""),
            }
            
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            logger.warning(f"Failed to parse Gemini response: {e}")
            return self._fallback_response(fallback_headline, fallback_mood)
    
    def _fallback_response(self, headline: str, mood: str) -> Dict[str, Any]:
        """Return fallback when AI is unavailable."""
        return {
            "headline": headline,
            "subheadline": "Fresh insights updated every 4 hours",
            "mood": mood,
            "weekly_insight": "",
            "best_slot_summary": "",
            "strategy_angles": [],
            "video_ideas": [],
            "daily_mantra": "Consistency beats virality. Show up.",
            "top_insight": "",
        }
    
    def _fmt_num(self, n: int) -> str:
        """Format number compactly."""
        if n >= 1_000_000:
            return f"{n/1_000_000:.1f}M"
        if n >= 1_000:
            return f"{n/1_000:.1f}K"
        return str(n)
    
    async def generate_weekly_schedule(
        self,
        twitch_streams: List[Dict[str, Any]],
        golden_hours: List[GoldenHourWindow],
    ) -> WeeklySchedule:
        """
        Generate a full 7-day weekly schedule with hourly scores.
        
        Uses algorithmic calculation (no AI needed for the grid itself).
        """
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        schedule_data = {}
        
        # Calculate base scores for each hour of each day
        for day_idx, day_name in enumerate(days):
            slots = []
            for hour in range(24):
                score = self._calculate_hour_score(day_idx, hour, twitch_streams)
                competition = self._get_competition(day_idx, hour)
                viewers = self._get_viewer_level(day_idx, hour)
                
                slots.append(WeeklyTimeSlot(
                    hour=hour,
                    score=score,
                    competition=competition,
                    viewers=viewers,
                ))
            schedule_data[day_name] = slots
        
        # Find best slot from golden hours
        best_slot = None
        if golden_hours:
            gh = golden_hours[0]
            best_slot = f"{gh.day} {gh.start_hour}:00-{gh.end_hour}:00 UTC"
        
        return WeeklySchedule(
            **schedule_data,
            timezone="UTC",
            best_slot=best_slot,
            ai_insight=None,  # Will be filled by refine_playbook
        )
    
    def _calculate_hour_score(
        self,
        day_idx: int,
        hour: int,
        streams: List[Dict[str, Any]],
    ) -> int:
        """Calculate opportunity score for a specific hour."""
        score = 50  # Base
        
        # Peak hours (high competition)
        peak_hours = {
            0: [19, 20, 21, 22],  # Monday
            1: [19, 20, 21, 22],
            2: [19, 20, 21, 22],
            3: [19, 20, 21, 22],
            4: [18, 19, 20, 21, 22, 23],  # Friday
            5: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23],  # Saturday
            6: [14, 15, 16, 17, 18, 19, 20, 21],  # Sunday
        }
        
        # Opportunity hours (low competition, decent viewers)
        opp_hours = {
            0: [10, 11, 12, 13, 14],
            1: [10, 11, 12, 13, 14],
            2: [10, 11, 12, 13, 14],
            3: [10, 11, 12, 13, 14],
            4: [10, 11, 12, 13, 14, 15, 16],
            5: [10, 11, 12, 13],
            6: [10, 11, 12, 13],
        }
        
        if hour in opp_hours.get(day_idx, []):
            score += 20
        elif hour in peak_hours.get(day_idx, []):
            score -= 10
        
        # Weekend bonus
        if day_idx in [5, 6]:
            score += 10
        
        # Dead hours penalty
        if hour in [2, 3, 4, 5, 6, 7]:
            score -= 25
        
        # Late night slight bonus
        if hour in [23, 0, 1]:
            score += 5
        
        return max(0, min(100, score))
    
    def _get_competition(self, day_idx: int, hour: int) -> str:
        """Get competition level for hour."""
        peak = [19, 20, 21, 22]
        if day_idx >= 5:  # Weekend
            peak = list(range(14, 24))
        
        if hour in peak:
            return "high"
        elif hour in [2, 3, 4, 5, 6, 7]:
            return "low"
        elif hour in [10, 11, 12, 13, 14]:
            return "low"
        return "medium"
    
    def _get_viewer_level(self, day_idx: int, hour: int) -> str:
        """Get viewer availability for hour."""
        # Weekend afternoons/evenings
        if day_idx in [5, 6] and hour in range(12, 23):
            return "high"
        # Weekday evenings
        if day_idx < 5 and hour in range(18, 23):
            return "high"
        # Dead hours
        if hour in [2, 3, 4, 5, 6, 7]:
            return "low"
        return "medium"


# Singleton instance
_refiner: Optional[PlaybookAIRefiner] = None


def get_ai_refiner() -> PlaybookAIRefiner:
    """Get or create the AI refiner singleton."""
    global _refiner
    if _refiner is None:
        _refiner = PlaybookAIRefiner()
    return _refiner
