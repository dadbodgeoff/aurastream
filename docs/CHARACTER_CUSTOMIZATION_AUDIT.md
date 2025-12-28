# Character Customization Audit

## Overview
This document audits all prompt templates to identify which ones generate characters/people and need character customization options.

## Templates That Need Character Customization

### HIGH PRIORITY - Explicit Character Generation

| Template | Vibe | Character Type | Needs Customization |
|----------|------|----------------|---------------------|
| `going-live.yaml` | anime | "stylized character representing the streamer" | ✅ YES |
| `going-live.yaml` | playful | "custom designer vinyl toy figurine of a streamer" | ✅ YES |
| `thumbnail.yaml` | aesthetic-pro | "heroic render of a character" | ✅ YES |
| `thumbnail.yaml` | viral-hype | "high-detail character striking an intense battle pose" | ✅ YES |
| `thumbnail.yaml` | anime-cinematic | "stylized anime-version character" | ✅ YES |
| `thumbnail.yaml` | playful-3d | "cute, high-gloss 3D vinyl figurine version of a character" | ✅ YES |
| `thumbnail.yaml` | after-dark | "character wearing tactical gear" | ✅ YES |
| `thumbnail.yaml` | pro (shock face) | "high-detail, expressive 3D character" | ✅ YES |
| `thumbnail.yaml` | anime (duel) | "Two legendary character skins" | ✅ YES |
| `thumbnail.yaml` | playful (cartoon) | "cute exaggerated character with big eyes" | ✅ YES |
| `thumbnail.yaml` | color-pop | "dynamic character or subject" | ✅ YES |
| `emote.yaml` | glossy | "cute chibi character representing a streamer" | ✅ YES |
| `emote.yaml` | pixel | "16-bit stylized character" | ✅ YES |
| `emote.yaml` | modern-pixel | "focused icon or character" | ✅ YES |
| `emote.yaml` | halftone-pop | "character or action-word" | ✅ YES |
| `emote.yaml` | cozy | "stylized character or object" | ✅ YES |
| `emote.yaml` | anime | "high-detail chibi head of a character" | ✅ YES |
| `emote.yaml` | kawaii | "round, squishy character" | ✅ YES |
| `offline.yaml` | anime | "cute chibi version of a streamer character" | ✅ YES |
| `clip-highlight.yaml` | pro | "character from {game}" | ⚠️ MAYBE (game-specific) |
| `clip-highlight.yaml` | anime | "character making a shocked 'Hype' expression" | ✅ YES |
| `clip-highlight.yaml` | playful | "cute chibi character celebrating" | ✅ YES |

### LOW PRIORITY - No Character or Abstract

| Template | Notes |
|----------|-------|
| `starting-soon.yaml` | No characters, just UI/environment |
| `milestone.yaml` | Numbers and icons, no characters |
| `schedule.yaml` | Calendar/schedule layout, no characters |
| `panel.yaml` | Icons and text only |
| `logo.yaml` | Icons/symbols, not human characters |

---

## Proposed Character Customization Schema

### Database: `user_avatars` table
```sql
CREATE TABLE user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Avatar',
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Physical Appearance
  gender TEXT DEFAULT 'neutral', -- male, female, neutral, other
  body_type TEXT DEFAULT 'average', -- slim, average, athletic, curvy, muscular
  skin_tone TEXT DEFAULT 'medium', -- very-light, light, medium, tan, brown, dark
  
  -- Face
  face_shape TEXT DEFAULT 'oval', -- oval, round, square, heart, long
  eye_color TEXT DEFAULT 'brown', -- brown, blue, green, hazel, gray, amber, heterochromia
  eye_style TEXT DEFAULT 'normal', -- normal, anime-large, narrow, round
  
  -- Hair
  hair_color TEXT DEFAULT 'brown', -- black, brown, blonde, red, gray, white, pink, blue, purple, green, rainbow
  hair_style TEXT DEFAULT 'short', -- bald, buzz, short, medium, long, ponytail, braids, mohawk, afro, curly
  hair_texture TEXT DEFAULT 'straight', -- straight, wavy, curly, coily
  
  -- Expression Defaults
  default_expression TEXT DEFAULT 'friendly', -- friendly, serious, excited, mysterious, playful
  
  -- Style Preferences
  art_style TEXT DEFAULT 'realistic', -- realistic, anime, cartoon, pixel, 3d-render
  outfit_style TEXT DEFAULT 'casual-gamer', -- casual-gamer, esports-pro, streetwear, fantasy, sci-fi
  
  -- Accessories
  glasses BOOLEAN DEFAULT FALSE,
  glasses_style TEXT, -- round, square, gaming, sunglasses
  headwear TEXT, -- none, cap, beanie, headphones, crown, hood
  facial_hair TEXT, -- none, stubble, beard, goatee, mustache
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

CREATE INDEX idx_user_avatars_user ON user_avatars(user_id);
CREATE INDEX idx_user_avatars_default ON user_avatars(user_id, is_default) WHERE is_default = TRUE;
```

### API Schema: `CharacterCustomization`
```python
class CharacterCustomization(BaseModel):
    # Physical
    gender: Literal["male", "female", "neutral", "other"] = "neutral"
    body_type: Literal["slim", "average", "athletic", "curvy", "muscular"] = "average"
    skin_tone: Literal["very-light", "light", "medium", "tan", "brown", "dark"] = "medium"
    
    # Face
    face_shape: Literal["oval", "round", "square", "heart", "long"] = "oval"
    eye_color: Literal["brown", "blue", "green", "hazel", "gray", "amber", "heterochromia"] = "brown"
    eye_style: Literal["normal", "anime-large", "narrow", "round"] = "normal"
    
    # Hair
    hair_color: Literal["black", "brown", "blonde", "red", "gray", "white", "pink", "blue", "purple", "green", "rainbow"] = "brown"
    hair_style: Literal["bald", "buzz", "short", "medium", "long", "ponytail", "braids", "mohawk", "afro", "curly"] = "short"
    hair_texture: Literal["straight", "wavy", "curly", "coily"] = "straight"
    
    # Expression (can be overridden per-generation)
    expression: Literal["friendly", "serious", "excited", "shocked", "angry", "sad", "mysterious", "playful", "confident"] = "friendly"
    
    # Style
    art_style: Literal["realistic", "anime", "cartoon", "pixel", "3d-render"] = "realistic"
    outfit_style: Literal["casual-gamer", "esports-pro", "streetwear", "fantasy", "sci-fi", "tactical"] = "casual-gamer"
    
    # Accessories
    glasses: bool = False
    glasses_style: Optional[Literal["round", "square", "gaming", "sunglasses"]] = None
    headwear: Optional[Literal["cap", "beanie", "headphones", "crown", "hood"]] = None
    facial_hair: Optional[Literal["stubble", "beard", "goatee", "mustache"]] = None
```

### Prompt Injection Format
When character customization is provided, inject this block:
```
[CHARACTER: {gender} {body_type} build, {skin_tone} skin, {face_shape} face, {eye_color} {eye_style} eyes, {hair_color} {hair_texture} {hair_style} hair, {expression} expression, {outfit_style} outfit{accessories}]
```

Example:
```
[CHARACTER: female athletic build, tan skin, oval face, green normal eyes, pink wavy long hair, excited expression, esports-pro outfit, gaming glasses, headphones]
```

---

## Frontend Changes Required

### New Components
1. `AvatarBuilder.tsx` - Full avatar customization wizard
2. `AvatarPreview.tsx` - Live preview of avatar settings
3. `AvatarSelector.tsx` - Quick select from saved avatars
4. `ExpressionPicker.tsx` - Per-generation expression override

### Integration Points
1. **Quick Create Flow**: Show avatar selector when template has `needs_character: true`
2. **Coach Flow**: Coach can ask about character preferences
3. **Brand Kit**: Option to link default avatar to brand kit
4. **Settings Page**: Full avatar management section

### UI Flow
1. First-time user → Prompt to create avatar during onboarding
2. Generation with character → Show avatar selector + expression picker
3. No avatar saved → Show "Create Your Avatar" CTA

---

## Implementation Priority

### Phase 1: Core Infrastructure
- [ ] Create `user_avatars` database table
- [ ] Create API endpoints (CRUD for avatars)
- [ ] Update prompt engine to inject character block
- [ ] Update Nano Banana system prompt (DONE ✅)

### Phase 2: Frontend - Avatar Builder
- [ ] Create AvatarBuilder component
- [ ] Create AvatarPreview component
- [ ] Add to Settings page
- [ ] Add to onboarding flow

### Phase 3: Integration
- [ ] Update Quick Create to show avatar selector
- [ ] Update template metadata with `needs_character` flag
- [ ] Add expression picker to generation flow
- [ ] Coach integration for character questions

### Phase 4: Polish
- [ ] Avatar presets (quick start options)
- [ ] Import from profile picture (AI analysis)
- [ ] Multiple saved avatars per user
- [ ] Avatar sharing/templates
