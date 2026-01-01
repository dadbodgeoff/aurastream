"""
Playbook Constants - Templates, Mantras, and Configuration.
"""

from typing import List, Dict

# ============================================================================
# Daily Mantras - Rotating motivational quotes
# ============================================================================

DAILY_MANTRAS: List[str] = [
    "Small streams, big dreams. Your next viewer could be your biggest fan.",
    "Consistency beats virality. Show up, and they will too.",
    "The algorithm rewards authenticity. Be unapologetically you.",
    "Every big streamer started with zero viewers. Your time is coming.",
    "Your unique perspective is your superpower. No one else has it.",
    "Growth is a marathon, not a sprint. Celebrate the small wins.",
    "The best time to start was yesterday. The second best time is now.",
    "Your community doesn't need you to be perfect. They need you to be real.",
    "One engaged viewer is worth more than 100 lurkers. Quality over quantity.",
    "The algorithm follows engagement. Focus on connection, not numbers.",
]

# ============================================================================
# Headline Templates - Dynamic headlines based on market mood
# ============================================================================

HEADLINE_TEMPLATES: Dict[str, List[str]] = {
    "bullish": [
        "🚀 The Algorithm is Hungry Today",
        "📈 Perfect Storm Brewing for Small Streamers",
        "🔥 Today's the Day to Go Live",
        "⚡ High Opportunity Windows Detected",
    ],
    "cautious": [
        "🎯 Strategic Timing is Everything Today",
        "🧠 Smart Moves Beat Big Budgets",
        "📊 Data Says: Pick Your Battles Wisely",
        "🎪 Crowded Day - Here's How to Stand Out",
    ],
    "opportunity": [
        "💎 Hidden Gems: Underserved Niches Found",
        "🌟 Gap in the Market Detected",
        "🎰 Low Competition Windows Opening",
        "🔮 The Data Reveals: Opportunity Knocks",
    ],
    "competitive": [
        "⚔️ Battle Royale Day - Arm Yourself",
        "🛡️ Defense Mode: Protect Your Niche",
        "🎭 Differentiation is Your Weapon Today",
        "🏆 Competitive Day - Play to Your Strengths",
    ],
}

# ============================================================================
# Title Formula Templates
# ============================================================================

TITLE_FORMULAS: List[Dict] = [
    {
        "name": "The Curiosity Gap",
        "formula": "[Unexpected Thing] + [Game/Topic] = [Surprising Result]",
        "template": "I tried [X] in [Game] and [unexpected outcome]...",
        "best_for": ["gaming", "challenge", "experiment"],
    },
    {
        "name": "The Number Hook",
        "formula": "[Number] + [Benefit/Thing] + [Timeframe]",
        "template": "[X] tips that will [benefit] your [game] gameplay",
        "best_for": ["tutorial", "tips", "guide"],
    },
    {
        "name": "The Challenge",
        "formula": "[Difficulty] + [Challenge] + [Stakes]",
        "template": "Can I [challenge] in [game] without [limitation]?",
        "best_for": ["challenge", "gaming", "entertainment"],
    },
    {
        "name": "The Story Hook",
        "formula": "[Emotional Word] + [What Happened] + [Cliffhanger]",
        "template": "This [game] moment made me [emotion]...",
        "best_for": ["story", "highlight", "emotional"],
    },
    {
        "name": "The Authority",
        "formula": "[Credential] + [Teaches] + [Outcome]",
        "template": "[X rank] player shows you how to [achieve outcome]",
        "best_for": ["tutorial", "educational", "guide"],
    },
]

# ============================================================================
# Thumbnail Recipe Templates
# ============================================================================

THUMBNAIL_RECIPES: List[Dict] = [
    {
        "name": "The Reaction Face",
        "elements": ["Large expressive face", "Bold 2-3 word text", "High contrast background"],
        "emotion": "Shock/Surprise",
        "text_style": "Bold sans-serif, yellow or white with black outline",
        "success_rate": 78,
    },
    {
        "name": "The Before/After",
        "elements": ["Split screen", "Clear contrast", "Arrow or VS element"],
        "emotion": "Transformation/Progress",
        "text_style": "Minimal text, let visuals speak",
        "success_rate": 72,
    },
    {
        "name": "The Mystery Box",
        "elements": ["Blurred/hidden element", "Question mark", "Curious expression"],
        "emotion": "Curiosity/Intrigue",
        "text_style": "Question or '???' prominent",
        "success_rate": 68,
    },
    {
        "name": "The Achievement",
        "elements": ["Trophy/medal/rank icon", "Celebration pose", "Stats overlay"],
        "emotion": "Pride/Accomplishment",
        "text_style": "Numbers prominent, achievement text",
        "success_rate": 65,
    },
    {
        "name": "The Chaos",
        "elements": ["Multiple action elements", "Explosions/effects", "Dynamic angles"],
        "emotion": "Excitement/Energy",
        "text_style": "Action words, comic book style",
        "success_rate": 70,
    },
]
