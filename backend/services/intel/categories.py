"""
Creator Intel Available Categories

Defines the list of gaming categories available for subscription.
"""

from typing import List
from backend.api.schemas.intel import AvailableCategory


# ============================================================================
# Available Categories
# ============================================================================

AVAILABLE_CATEGORIES: List[dict] = [
    {
        "key": "fortnite",
        "name": "Fortnite",
        "twitch_id": "33214",
        "youtube_query": "fortnite",
        "platform": "both",
        "icon": "🎮",
        "color": "#9D4DFF",
    },
    {
        "key": "valorant",
        "name": "Valorant",
        "twitch_id": "516575",
        "youtube_query": "valorant",
        "platform": "both",
        "icon": "🎯",
        "color": "#FF4655",
    },
    {
        "key": "minecraft",
        "name": "Minecraft",
        "twitch_id": "27471",
        "youtube_query": "minecraft",
        "platform": "both",
        "icon": "⛏️",
        "color": "#62B47A",
    },
    {
        "key": "league_of_legends",
        "name": "League of Legends",
        "twitch_id": "21779",
        "youtube_query": "league of legends",
        "platform": "both",
        "icon": "⚔️",
        "color": "#C89B3C",
    },
    {
        "key": "apex_legends",
        "name": "Apex Legends",
        "twitch_id": "511224",
        "youtube_query": "apex legends",
        "platform": "both",
        "icon": "🔫",
        "color": "#DA292A",
    },
    {
        "key": "call_of_duty",
        "name": "Call of Duty",
        "twitch_id": "512710",
        "youtube_query": "call of duty",
        "platform": "both",
        "icon": "🎖️",
        "color": "#1E1E1E",
    },
    {
        "key": "gta_v",
        "name": "GTA V",
        "twitch_id": "32982",
        "youtube_query": "gta 5",
        "platform": "both",
        "icon": "🚗",
        "color": "#5FA55A",
    },
    {
        "key": "just_chatting",
        "name": "Just Chatting",
        "twitch_id": "509658",
        "youtube_query": None,
        "platform": "twitch",
        "icon": "💬",
        "color": "#9147FF",
    },
    {
        "key": "overwatch_2",
        "name": "Overwatch 2",
        "twitch_id": "515025",
        "youtube_query": "overwatch 2",
        "platform": "both",
        "icon": "🦸",
        "color": "#F99E1A",
    },
    {
        "key": "counter_strike",
        "name": "Counter-Strike 2",
        "twitch_id": "32399",
        "youtube_query": "counter strike 2",
        "platform": "both",
        "icon": "💣",
        "color": "#DE9B35",
    },
    {
        "key": "rocket_league",
        "name": "Rocket League",
        "twitch_id": "30921",
        "youtube_query": "rocket league",
        "platform": "both",
        "icon": "🚀",
        "color": "#0078F2",
    },
    {
        "key": "dead_by_daylight",
        "name": "Dead by Daylight",
        "twitch_id": "491487",
        "youtube_query": "dead by daylight",
        "platform": "both",
        "icon": "🔪",
        "color": "#1A1A1A",
    },
    {
        "key": "elden_ring",
        "name": "Elden Ring",
        "twitch_id": "512953",
        "youtube_query": "elden ring",
        "platform": "both",
        "icon": "🗡️",
        "color": "#C4A747",
    },
    {
        "key": "world_of_warcraft",
        "name": "World of Warcraft",
        "twitch_id": "18122",
        "youtube_query": "world of warcraft",
        "platform": "both",
        "icon": "🐉",
        "color": "#148EFF",
    },
    {
        "key": "dota_2",
        "name": "Dota 2",
        "twitch_id": "29595",
        "youtube_query": "dota 2",
        "platform": "both",
        "icon": "🏰",
        "color": "#BE1E2D",
    },
    {
        "key": "escape_from_tarkov",
        "name": "Escape from Tarkov",
        "twitch_id": "491931",
        "youtube_query": "escape from tarkov",
        "platform": "both",
        "icon": "🎒",
        "color": "#1C1C1C",
    },
    {
        "key": "rust",
        "name": "Rust",
        "twitch_id": "263490",
        "youtube_query": "rust game",
        "platform": "both",
        "icon": "🏚️",
        "color": "#CD412B",
    },
    {
        "key": "fifa",
        "name": "EA Sports FC",
        "twitch_id": "1745202732",
        "youtube_query": "ea sports fc",
        "platform": "both",
        "icon": "⚽",
        "color": "#326295",
    },
    {
        "key": "pokemon",
        "name": "Pokémon",
        "twitch_id": "26936",
        "youtube_query": "pokemon",
        "platform": "both",
        "icon": "⚡",
        "color": "#FFCB05",
    },
    {
        "key": "roblox",
        "name": "Roblox",
        "twitch_id": "23020",
        "youtube_query": "roblox",
        "platform": "both",
        "icon": "🧱",
        "color": "#E2231A",
    },
    {
        "key": "arc_raiders",
        "name": "Arc Raiders",
        "twitch_id": "518338",
        "youtube_query": "arc raiders",
        "platform": "both",
        "icon": "🛸",
        "color": "#00D4FF",
    },
]


def get_available_categories() -> List[AvailableCategory]:
    """Get all available categories for subscription."""
    return [AvailableCategory(**cat) for cat in AVAILABLE_CATEGORIES]
