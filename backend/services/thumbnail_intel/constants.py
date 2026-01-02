"""
Thumbnail Intelligence Constants

Defines gaming categories, search queries, and configuration.
"""

from typing import Dict, List

# Gaming categories to track
# keywords: Used for matching trending videos to categories (case-insensitive)
# search_queries: Used for game-specific searches to guarantee coverage
GAMING_CATEGORIES: Dict[str, Dict] = {
    "fortnite": {
        "name": "Fortnite",
        "keywords": ["fortnite", "battle royale", "epic games"],
        "search_queries": ["fortnite gameplay", "fortnite highlights", "fortnite win"],
        "twitch_game_id": "33214",
        "color_theme": "#9D4DFF",  # Purple
    },
    "warzone": {
        "name": "Call of Duty: Warzone",
        "keywords": ["warzone", "call of duty", "cod", "modern warfare", "black ops"],
        "search_queries": ["warzone gameplay", "warzone highlights", "warzone win"],
        "twitch_game_id": "512710",
        "color_theme": "#FF6B00",  # Orange
    },
    "arc_raiders": {
        "name": "Arc Raiders",
        "keywords": ["arc raiders", "embark studios"],
        "search_queries": ["arc raiders gameplay", "arc raiders highlights", "arc raiders beta"],
        "twitch_game_id": "518338",
        "color_theme": "#00D4FF",  # Cyan
    },
    "valorant": {
        "name": "Valorant",
        "keywords": ["valorant", "riot games", "valo"],
        "search_queries": ["valorant gameplay", "valorant highlights", "valorant ace"],
        "twitch_game_id": "516575",
        "color_theme": "#FF4655",  # Red
    },
    "apex_legends": {
        "name": "Apex Legends",
        "keywords": ["apex legends", "apex", "respawn"],
        "search_queries": ["apex legends gameplay", "apex legends highlights", "apex legends win"],
        "twitch_game_id": "511224",
        "color_theme": "#DA292A",  # Red
    },
    "gta": {
        "name": "GTA VI / GTA Online",
        "keywords": ["gta", "grand theft auto", "rockstar"],
        "search_queries": ["gta 6 gameplay", "gta 6 trailer", "gta online"],
        "twitch_game_id": "32982",
        "color_theme": "#5FA55A",  # Green
    },
    "minecraft": {
        "name": "Minecraft",
        "keywords": ["minecraft", "mojang", "creeper", "steve"],
        "search_queries": ["minecraft gameplay", "minecraft build", "minecraft survival"],
        "twitch_game_id": "27471",
        "color_theme": "#62B47A",  # Green
    },
    "roblox": {
        "name": "Roblox",
        "keywords": ["roblox", "robux"],
        "search_queries": ["roblox gameplay", "roblox funny moments", "roblox obby"],
        "twitch_game_id": "23020",
        "color_theme": "#E2231A",  # Red
    },
}

# Number of thumbnails to analyze per category
# Increased from 3 to 10 for better pattern detection (cost: ~$0.01/run)
THUMBNAILS_PER_CATEGORY = 10

# Minimum view count to consider a video "top performing"
# Lower threshold since we filter by recency
MIN_VIEW_COUNT = 10_000

# Maximum age of videos to consider (in days)
# 7 days gives us enough pool to find quality thumbnails
MAX_VIDEO_AGE_DAYS = 7

# Gemini model for vision analysis
GEMINI_VISION_MODEL = "gemini-2.0-flash-001"

# Analysis cache duration (hours)
CACHE_DURATION_HOURS = 24
