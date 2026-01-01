"""
Insight Generator - Creates quick insight cards.

Generates bite-sized insights for the playbook dashboard,
including stats, tips, warnings, and opportunities.
"""

import logging
import random
from typing import List, Dict, Any

from backend.api.schemas.playbook import InsightCard

logger = logging.getLogger(__name__)


class InsightGenerator:
    """Generates insight cards for the playbook."""
    
    def __init__(self):
        pass
    
    async def generate_insights(
        self,
        twitch_streams: List[Dict[str, Any]],
        twitch_games: List[Dict[str, Any]],
        youtube_videos: List[Dict[str, Any]],
        golden_hours: List[Dict[str, Any]],
        niche_opportunities: List[Dict[str, Any]],
        viral_hooks: List[Dict[str, Any]],
    ) -> List[InsightCard]:
        """
        Generate insight cards from all available data.
        
        Returns a mix of stat cards, tips, warnings, and opportunities.
        """
        cards: List[InsightCard] = []
        
        # Stat cards
        cards.extend(self._generate_stat_cards(
            twitch_streams, twitch_games, youtube_videos
        ))
        
        # Opportunity cards
        cards.extend(self._generate_opportunity_cards(
            golden_hours, niche_opportunities
        ))
        
        # Tip cards
        cards.extend(self._generate_tip_cards(viral_hooks))
        
        # Warning cards (if applicable)
        cards.extend(self._generate_warning_cards(
            twitch_streams, twitch_games
        ))
        
        # Shuffle and limit
        random.shuffle(cards)
        return cards[:8]
    
    def _generate_stat_cards(
        self,
        streams: List[Dict[str, Any]],
        games: List[Dict[str, Any]],
        videos: List[Dict[str, Any]],
    ) -> List[InsightCard]:
        """Generate stat-based insight cards."""
        cards: List[InsightCard] = []
        
        # Total Twitch viewers
        total_viewers = sum(s.get("viewer_count", 0) for s in streams)
        cards.append(InsightCard(
            card_id="stat_twitch_viewers",
            card_type="stat",
            icon="📺",
            headline="Twitch Right Now",
            body="Total viewers across top streams",
            metric=self._format_number(total_viewers),
            metric_label="viewers live",
            color_theme="purple",
        ))
        
        # Top game
        if games:
            top_game = games[0]
            cards.append(InsightCard(
                card_id="stat_top_game",
                card_type="stat",
                icon="🎮",
                headline="Hottest Game",
                body=top_game.get("name", "Unknown"),
                metric=self._format_number(top_game.get("twitch_viewers", 0)),
                metric_label="viewers",
                color_theme="green",
            ))
        
        # YouTube engagement
        if videos:
            avg_engagement = sum(
                v.get("engagement_rate", 0) or 0 for v in videos
            ) / len(videos)
            cards.append(InsightCard(
                card_id="stat_yt_engagement",
                card_type="stat",
                icon="📈",
                headline="YouTube Engagement",
                body="Average engagement on trending videos",
                metric=f"{avg_engagement:.1f}%",
                metric_label="engagement rate",
                color_theme="blue",
            ))
        
        # Stream count
        cards.append(InsightCard(
            card_id="stat_stream_count",
            card_type="stat",
            icon="🔴",
            headline="Competition Level",
            body="Active streams in top categories",
            metric=str(len(streams)),
            metric_label="live streams",
            color_theme="orange",
        ))
        
        return cards
    
    def _generate_opportunity_cards(
        self,
        golden_hours: List[Dict[str, Any]],
        niches: List[Dict[str, Any]],
    ) -> List[InsightCard]:
        """Generate opportunity insight cards."""
        cards: List[InsightCard] = []
        
        # Best golden hour
        if golden_hours:
            best = golden_hours[0]
            cards.append(InsightCard(
                card_id="opp_golden_hour",
                card_type="opportunity",
                icon="⏰",
                headline="Golden Hour Alert",
                body=f"{best.get('day', 'Today')} {best.get('start_hour', 0)}:00 UTC - {best.get('reasoning', 'Low competition window')}",
                metric=str(best.get("opportunity_score", 0)),
                metric_label="opportunity score",
                action_text="Plan Your Stream",
                color_theme="cyan",
            ))
        
        # Top niche opportunity
        if niches:
            top_niche = niches[0]
            cards.append(InsightCard(
                card_id="opp_niche",
                card_type="opportunity",
                icon="💎",
                headline="Hidden Gem",
                body=f"{top_niche.get('game_or_niche', 'Unknown')} - {top_niche.get('why_now', 'Underserved niche')}",
                metric=f"{100 - top_niche.get('saturation_score', 50)}%",
                metric_label="opportunity",
                action_text="Explore This Niche",
                color_theme="green",
            ))
        
        return cards
    
    def _generate_tip_cards(
        self,
        hooks: List[Dict[str, Any]],
    ) -> List[InsightCard]:
        """Generate tip insight cards."""
        cards: List[InsightCard] = []
        
        # Viral hook tip
        if hooks:
            top_hook = hooks[0]
            cards.append(InsightCard(
                card_id="tip_viral_hook",
                card_type="tip",
                icon="🔥",
                headline="Trending Now",
                body=f"Use '{top_hook.get('hook', '')}' - {top_hook.get('usage_tip', '')}",
                metric=str(top_hook.get("virality_score", 0)),
                metric_label="virality",
                color_theme="orange",
            ))
        
        # Random pro tips
        pro_tips = [
            ("🎯", "Pro Tip", "Stream titles with numbers get 36% more clicks. Try '5 Tips' or '3 Secrets'."),
            ("🎨", "Thumbnail Hack", "Faces in thumbnails increase CTR by 38%. Show emotion!"),
            ("📱", "Cross-Post", "Clips posted within 1 hour of creation get 2x more views."),
            ("💬", "Engagement", "Streams with active chat get 40% more recommendations."),
            ("🕐", "Consistency", "Same-time streamers retain 60% more viewers week-over-week."),
        ]
        
        icon, headline, body = random.choice(pro_tips)
        cards.append(InsightCard(
            card_id="tip_pro",
            card_type="tip",
            icon=icon,
            headline=headline,
            body=body,
            color_theme="blue",
        ))
        
        return cards
    
    def _generate_warning_cards(
        self,
        streams: List[Dict[str, Any]],
        games: List[Dict[str, Any]],
    ) -> List[InsightCard]:
        """Generate warning cards for high competition periods."""
        cards: List[InsightCard] = []
        
        # Check for high competition
        big_streamers = len([s for s in streams if s.get("viewer_count", 0) > 10000])
        
        if big_streamers > 20:
            cards.append(InsightCard(
                card_id="warn_competition",
                card_type="warning",
                icon="⚠️",
                headline="High Competition Alert",
                body=f"{big_streamers} major streamers are live. Consider alternative time slots or niche games.",
                metric=str(big_streamers),
                metric_label="big streamers live",
                color_theme="red",
            ))
        
        # Oversaturated game warning
        if games:
            for game in games[:3]:
                streams_count = game.get("twitch_streams", 0)
                viewers = game.get("twitch_viewers", 0)
                if streams_count > 0:
                    ratio = viewers / streams_count
                    if ratio < 50:  # Very saturated
                        cards.append(InsightCard(
                            card_id=f"warn_saturated_{game.get('game_id', '')}",
                            card_type="warning",
                            icon="🚨",
                            headline=f"{game.get('name', 'Game')} Saturated",
                            body=f"Only {int(ratio)} avg viewers per stream. Consider a different game.",
                            metric=f"{int(ratio)}",
                            metric_label="viewers/stream",
                            color_theme="red",
                        ))
                        break  # Only one saturation warning
        
        return cards
    
    def _format_number(self, num: int) -> str:
        """Format large numbers for display."""
        if num >= 1_000_000:
            return f"{num / 1_000_000:.1f}M"
        elif num >= 1_000:
            return f"{num / 1_000:.1f}K"
        return str(num)
