"""
Clip Radar Constants
"""

# Categories to track for viral clips
TRACKED_CATEGORIES = {
    "509658": "Just Chatting",
    "33214": "Fortnite",
    "516575": "Valorant",
    "512710": "Call of Duty: Warzone",
    "511224": "Apex Legends",
    "491931": "Escape from Tarkov",
    "21779": "League of Legends",
    "32399": "Counter-Strike",
    "32982": "Grand Theft Auto V",
    "27471": "Minecraft",
}

# Polling configuration
POLL_INTERVAL_MINUTES = 5
CLIP_LOOKBACK_MINUTES = 360  # Look at clips from last 6 hours
MAX_CLIPS_PER_CATEGORY = 100

# Velocity thresholds for "viral" detection
VIRAL_VELOCITY_THRESHOLD = 3.0   # views/minute to be considered viral
HIGH_VELOCITY_THRESHOLD = 1.0    # views/minute for "trending"
MINIMUM_VIEWS_FOR_VIRAL = 20     # Must have at least this many views

# Redis keys
REDIS_KEY_PREFIX = "clip_radar:"
REDIS_CLIP_VIEWS_KEY = f"{REDIS_KEY_PREFIX}clip_views"  # Hash: clip_id -> view_count
REDIS_CLIP_DATA_KEY = f"{REDIS_KEY_PREFIX}clip_data"    # Hash: clip_id -> JSON data
REDIS_VIRAL_CLIPS_KEY = f"{REDIS_KEY_PREFIX}viral"      # Sorted set by velocity
REDIS_LAST_POLL_KEY = f"{REDIS_KEY_PREFIX}last_poll"    # String: timestamp

# Data retention
CLIP_TTL_HOURS = 24  # Keep clip data for 24 hours
