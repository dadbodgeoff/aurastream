# AuraStream Frontend Experience Report
**Generated: December 28, 2025**
**Version: 2.0 - Technical Deep Dive**

---

## 1. PUBLIC PAGES (Unauthenticated)

### Landing Page (`/`)
- Hero section with animated asset showcase
- Features section highlighting AI generation
- CTA section for signup
- Footer with links

### Authentication Pages
| Route | Purpose |
|-------|---------|
| `/login` | Email/password login |
| `/signup` | New account registration |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password (from email link) |
| `/auth/verify-email` | Email verification handler |
| `/auth/oauth-callback` | OAuth provider callback |

### Legal Pages
| Route | Purpose |
|-------|---------|
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |

---

## 2. DASHBOARD PAGES (Authenticated)

### Main Navigation
| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Overview | Stats, recent assets, quick actions |
| `/dashboard/create` | Create Asset | Full creation flow with platform/type selection |
| `/dashboard/quick-create` | Quick Create | Template-based wizard for fast generation |
| `/dashboard/assets` | Asset Library | Grid view of all generated assets |
| `/dashboard/brand-kits` | Brand Studio | Manage brand kits (colors, fonts, logos) |
| `/dashboard/coach` | Prompt Coach | AI-assisted prompt refinement (Studio tier) |
| `/dashboard/settings` | Settings | Profile, billing, preferences |
| `/dashboard/twitch` | Twitch Tools | Twitch-specific asset generation |
| `/dashboard/templates` | Templates | Browse available templates |
| `/dashboard/generate/[jobId]` | Generation Progress | Real-time SSE progress for active jobs |

### Admin Pages (Admin only)
| Route | Purpose |
|-------|---------|
| `/admin` | Admin Dashboard |
| `/admin/analytics` | Site Analytics |

---

## 3. ASSET TYPES - COMPLETE TECHNICAL SPECIFICATIONS

### Generation Asset Types (Backend Enum)
```python
AssetTypeEnum = Literal[
    "thumbnail",           # YouTube/general thumbnails
    "overlay",             # Stream overlays
    "banner",              # Channel banners
    "story_graphic",       # Vertical stories (IG/TikTok)
    "clip_cover",          # Square clip covers
    # Twitch Emotes (multi-size)
    "twitch_emote",        # Base emote (512×512 generation)
    "twitch_emote_112",    # Large export (112×112)
    "twitch_emote_56",     # Medium export (56×56)
    "twitch_emote_28",     # Small export (28×28)
    # TikTok Emotes (multi-size)
    "tiktok_emote",        # Base emote
    "tiktok_emote_300",    # Large (300×300)
    "tiktok_emote_200",    # Medium (200×200)
    "tiktok_emote_100",    # Small (100×100)
    # Other Twitch assets
    "twitch_badge",        # Sub badges (72×72)
    "twitch_panel",        # Channel panels (320×160)
    "twitch_offline"       # Offline screens (1920×1080)
]
```

### Dimension Specifications

| Asset Type | Generation Size | Export Size | Aspect Ratio |
|------------|-----------------|-------------|--------------|
| `thumbnail` | 1280×720 | 1280×720 | 16:9 |
| `clip_cover` | 1080×1080 | 1080×1080 | 1:1 |
| `overlay` | 1920×1080 | 1920×1080 | 16:9 |
| `twitch_offline` | 1920×1080 | 1920×1080 | 16:9 |
| `story_graphic` | 1080×1920 | 1080×1920 | 9:16 |
| `banner` | 1200×480 | 1200×480 | 2.5:1 |
| `twitch_panel` | 320×160 | 320×160 | 2:1 |
| `twitch_emote` | 1024×1024 | 512×512 | 1:1 |
| `twitch_emote_112` | 1024×1024 | 112×112 | 1:1 |
| `twitch_emote_56` | 1024×1024 | 56×56 | 1:1 |
| `twitch_emote_28` | 1024×1024 | 28×28 | 1:1 |
| `twitch_badge` | 512×512 | 72×72 | 1:1 |
| `twitch_badge_36` | 512×512 | 36×36 | 1:1 |
| `twitch_badge_18` | 512×512 | 18×18 | 1:1 |

### Platform Filters
```typescript
const PLATFORMS = [
  { id: 'general', label: 'All Platforms', icon: '🌐' },
  { id: 'twitch', label: 'Twitch', icon: '💜' },
  { id: 'youtube', label: 'YouTube', icon: '🔴' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
];
```

---

## 4. AI GENERATION ENGINE - TECHNICAL DETAILS

### Generation Model
- **Provider:** Google Gemini API
- **Model:** `gemini-3-pro-image-preview`
- **Timeout:** 120 seconds
- **Max Retries:** 3 (exponential backoff: 1s, 2s, 4s)

### Strict Content Constraint (Prepended to ALL prompts)
```
STRICT CONTENT RULES - YOU MUST FOLLOW THESE:

## TEXT RENDERING - HIGHEST PRIORITY
1. If the prompt includes ANY text (title, subtitle, CTA, labels), you MUST render that text EXACTLY as written
2. Text must be clearly legible and prominently displayed
3. Spell every word EXACTLY as provided - no corrections, no changes
4. If text is in quotes, render it EXACTLY including capitalization
5. TEXT MUST NEVER BE COVERED OR OBSCURED by any visual elements, characters, or assets
6. Ensure adequate contrast between text and background for maximum readability
7. Use professional typography hierarchy: headlines largest, subtext smaller, CTAs prominent

## LAYOUT & COMPOSITION - ENTERPRISE GRADE
8. Follow professional design patterns with clear visual hierarchy
9. Leave breathing room around text - no elements should crowd or overlap text
10. Characters/subjects should be positioned to COMPLEMENT text, never cover it
11. Use rule of thirds for balanced composition
12. Maintain consistent margins and padding throughout the design
13. Text placement zones should be kept clear of busy visual elements

## CONTENT RULES
14. DO NOT add any text, words, letters, numbers, dates, or labels unless explicitly specified
15. DO NOT invent or add extra items, elements, or details not mentioned in the prompt
16. If the prompt says "3 items" - render EXACTLY 3, not more, not less
17. If the prompt mentions specific days - show ONLY those days
18. DO NOT add watermarks, signatures, timestamps, or any identifying marks
19. Render ONLY what is explicitly described - nothing more, nothing less

## SCALABILITY FOR EMOTES/BADGES
20. For emotes, badges, or icons: Create VECTOR-STYLE art with bold outlines and flat colors
21. Design must be recognizable when scaled down to 28x28 pixels
22. Use thick outlines (3-4px minimum), high contrast, and simple iconic shapes
23. Avoid fine details, thin lines, or gradients that disappear at small sizes
```

### Safety Settings
```python
safetySettings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]
```

---

## 5. BASE PROMPT TEMPLATES (Per Asset Type)

### Thumbnail (`thumbnail/v1.0.yaml`)
```yaml
base_prompt: |
  Create a YouTube thumbnail with {tone} style.
  Use colors: {primary_colors}.
  Accent colors: {accent_colors}.
  Typography style: {headline_font} for headlines, {body_font} for body text.
  Style reference: {style_reference}
  {custom_prompt}

quality_modifiers:
  - "high quality"
  - "professional"
  - "eye-catching"
  - "4K resolution"
  - "vibrant colors"
  - "sharp details"
  - "YouTube optimized"
  - "16:9 aspect ratio"
```

### Twitch Emote (`twitch_emote/v1.0.yaml`)
```yaml
base_prompt: |
  Create a Twitch emote with {tone} style.
  Use colors: {primary_colors}.
  Accent colors: {accent_colors}.
  Style reference: {style_reference}
  
  CRITICAL SCALABILITY REQUIREMENTS:
  - Design as VECTOR-STYLE ART that scales perfectly from 28px to 112px
  - Use BOLD, THICK OUTLINES (minimum 3-4px at 112px scale) for visibility at tiny sizes
  - NO fine details, thin lines, or intricate patterns that disappear when scaled down
  - HIGH CONTRAST between subject and background for clear silhouette
  - SIMPLE, ICONIC shapes - think emoji/sticker style, not realistic
  - FLAT or MINIMAL shading - avoid gradients that muddy at small sizes
  - SOLID COLOR FILLS with clean edges
  - The emote MUST be recognizable and expressive at 28x28 pixels
  
  The emote should be expressive, readable at all Twitch sizes (28px, 56px, 112px), and have a clear silhouette.
  Use a transparent or solid color background suitable for Twitch chat.
  {custom_prompt}

quality_modifiers:
  - "vector art style"
  - "sticker style"
  - "bold thick outlines"
  - "flat colors"
  - "high contrast"
  - "simple iconic design"
  - "expressive"
  - "clear silhouette"
  - "Twitch chat ready"
  - "scales perfectly to 28px"
  - "transparent background"
  - "no fine details"
```

### Banner (`banner/v1.0.yaml`)
```yaml
base_prompt: |
  Create a channel banner with {tone} style.
  Use colors: {primary_colors}.
  Accent colors: {accent_colors}.
  Typography style: {headline_font} for headlines, {body_font} for body text.
  Style reference: {style_reference}
  {custom_prompt}

quality_modifiers:
  - "high quality"
  - "professional banner"
  - "wide format"
  - "2560x1440 resolution"
  - "social media optimized"
  - "brand consistent"
  - "visually striking"
  - "safe zone aware"
```

### Stream Overlay (`overlay/v1.0.yaml`)
```yaml
base_prompt: |
  Create a stream overlay graphic with {tone} style.
  Use colors: {primary_colors}.
  Accent colors: {accent_colors}.
  Typography style: {headline_font} for headlines, {body_font} for body text.
  Style reference: {style_reference}
  {custom_prompt}

quality_modifiers:
  - "high quality"
  - "professional streaming overlay"
  - "clean design"
  - "transparent background compatible"
  - "1080p resolution"
  - "modern aesthetic"
  - "readable text"
  - "stream-ready"
```

### Story Graphic (`story_graphic/v1.0.yaml`)
```yaml
base_prompt: |
  Create a social media story graphic with {tone} style.
  Use colors: {primary_colors}.
  Accent colors: {accent_colors}.
  Typography style: {headline_font} for headlines, {body_font} for body text.
  Style reference: {style_reference}
  {custom_prompt}

quality_modifiers:
  - "high quality"
  - "vertical format"
  - "9:16 aspect ratio"
  - "1080x1920 resolution"
  - "Instagram/TikTok optimized"
  - "mobile-first design"
  - "engaging visuals"
  - "story-ready"
```

### Twitch Panel (`twitch_panel/v1.0.yaml`)
```yaml
base_prompt: |
  Create a Twitch channel panel header with {tone} style.
  Use colors: {primary_colors}.
  Accent colors: {accent_colors}.
  Style reference: {style_reference}
  The panel should be 320x160 pixels, professional, and match Twitch profile aesthetics.
  {custom_prompt}

quality_modifiers:
  - "clean design"
  - "professional"
  - "Twitch panel style"
  - "320x160 pixels"
  - "consistent branding"
  - "readable text"
```

### Twitch Badge (`twitch_badge/v1.0.yaml`)
```yaml
base_prompt: |
  Create a Twitch subscriber badge with {tone} style.
  Use colors: {primary_colors}.
  Accent colors: {accent_colors}.
  Style reference: {style_reference}
  The badge should be small (18x18, 36x36, 72x72 pixels), iconic, and recognizable.
  {custom_prompt}

quality_modifiers:
  - "badge style"
  - "iconic"
  - "small-size optimized"
  - "subscriber badge"
  - "Twitch ready"
  - "clear at small sizes"
```

### Twitch Offline (`twitch_offline/v1.0.yaml`)
```yaml
base_prompt: |
  Create a Twitch offline screen with {tone} style.
  Use colors: {primary_colors}.
  Accent colors: {accent_colors}.
  Style reference: {style_reference}
  The screen should be 1920x1080 pixels, informative, and branded.
  {custom_prompt}

quality_modifiers:
  - "offline aesthetic"
  - "branded placeholder"
  - "informative"
  - "professional"
  - "1920x1080 pixels"
  - "Twitch channel ready"
```

### Clip Cover (`clip_cover/v1.0.yaml`)
```yaml
base_prompt: |
  Create a video clip cover image with {tone} style.
  Use colors: {primary_colors}.
  Accent colors: {accent_colors}.
  Typography style: {headline_font} for headlines, {body_font} for body text.
  Style reference: {style_reference}
  {custom_prompt}

quality_modifiers:
  - "high quality"
  - "professional"
  - "attention-grabbing"
  - "1280x720 resolution"
  - "clip thumbnail optimized"
  - "dynamic composition"
  - "clear focal point"
  - "platform-ready"
```

---

## 6. QUICK CREATE TEMPLATES - FULL VIBE PROMPTS

### Template: YouTube Thumbnail (`thumbnail`)
**Dimensions:** 1280×720 (16:9)

#### Vibe: Aesthetic Pro
```
A 16:9 high-end YouTube thumbnail. Background: A blurred, cinematic wide-angle shot of a cozy streamer's room with purple Nanoleaf wall lights and warm fairy lights. Center-Right: A high-detail, heroic render of a character looking cool and approachable. Text: A floating frosted-glass UI panel on the left contains the title '{title}' in bold, sharp white typography. Below it, the subtitle '{subtitle}' in a soft glowing accent color. Lighting: Volumetric 'Gamer-Glow' and soft bokeh. 8k resolution, professionally designed, clean and sophisticated.
```

#### Vibe: Viral Hype
```
A high-octane 16:9 YouTube thumbnail designed for maximum CTR. Foreground: A high-detail character striking an intense battle pose, facing the viewer. The character has a thick, vibrant white glowing 'Sticker-Outline' to pop off the background. Background: A high-contrast action scene with dramatic speed lines radiating from the center. Text: Massive, blocky 3D lettering at the top reads '{title}' in vibrant yellow with a heavy black drop-shadow. The subtitle '{subtitle}' is tilted for energy. Lighting: High-saturation, cinematic orange and teal color grading, 8k resolution.
```

#### Vibe: Anime Cinematic
```
A 16:9 cinematic anime-style YouTube thumbnail. Background: A stylized, cel-shaded environmental render of a dramatic location during a sunset. Center: A stylized anime-version character with intense 'Battle-Glow' eyes and dynamic wind-swept hair. Text: Large, stylized block typography reads '{title}' with a 'Chroma-Aberration' glitch effect. The subtitle '{subtitle}' is written in sharp Japanese-style English font. Style: Ufotable or MAPPA studio aesthetic, vibrant colors, dramatic lighting, sharp digital illustration.
```

#### Vibe: Playful 3D
```
A professional 3D-render YouTube thumbnail in a 'Designer Toy' aesthetic. Foreground: A cute, high-gloss 3D vinyl figurine version of a character, waving at the camera. Material: Glossy plastic and soft-touch clay. Text: Large, chunky 'Bubble-Text' floating in 3D space reads '{title}'. Subtitle '{subtitle}' is written on a 3D wooden sign or floating digital tag. Background: A colorful, soft-focus 'Toy-World' environment. Lighting: Bright, cheerful studio lighting with soft shadows. 8k resolution, playful and vibrant.
```

#### Vibe: After Dark
```
A 16:9 'Tactical-Noir' YouTube thumbnail. Background: A dark, moody night-ops scene with emerald green emergency lights and deep shadows. Center: A character wearing tactical gear, illuminated by a sharp side-light (rim lighting) in a vibrant cyan. Material: Matte carbon fiber and glowing glass. Text: Razor-sharp 'Ink-Trap' typography at the top reads '{title}' in a glowing white neon font. Below, the subtitle '{subtitle}' in a small, minimalist tech-tag. Detail: Cinematic rain particles and realistic lens flares. 8k resolution, elite pro-esports aesthetic.
```

#### Vibe: Color Pop (Custom Colors)
```
A 16:9 high-impact YouTube thumbnail with a bold {background_scheme} background. Center: A dynamic character or subject with a thick white glowing outline to pop off the background. The background features {background_scheme} with subtle geometric patterns or gradients for depth. Text: Large, bold 3D typography reads '{title}' with a contrasting drop shadow. Subtitle '{subtitle}' in a clean sans-serif font below. Style: High contrast, vibrant saturation, professional color grading. The color scheme creates visual harmony while maximizing click-through appeal. 8k resolution, eye-catching, YouTube optimized.
```

**Color Pop Background Options:**
- `vibrant purple and cyan gradient`
- `fiery orange and red gradient`
- `electric blue and neon green`
- `sunset pink and gold`
- `deep navy and silver`
- `lime green and black`
- `hot pink and electric purple`
- `teal and coral`
- `crimson red and dark gray`
- `golden yellow and royal blue`

---

### Template: Custom Emote (`emote`)
**Dimensions:** 112×112 (1:1)
**Emotions:** `hype`, `sad`, `laugh`, `love`, `comfy`, `rage`, `pog`, `gg`

#### Vibe: 3D Glossy Sticker
```
A 1:1 3D glossy vinyl emote. A cute chibi character representing a streamer expressing '{emotion}'. If '{text}' is provided, it is held on a small 3D sign. Thick white border, isolated on a flat green background. High-gloss finish, bold colors, readable at 28px.
```

#### Vibe: Pixel-Art Classic
```
A 1:1 professional pixel-art emote. A 16-bit stylized character making a '{emotion}' face. Vibrant retro color palette, sharp 1-pixel outlines. If '{text}' is provided, it appears in pixel font. Simple, iconic, and extremely readable for Twitch chat. Isolated on a flat green background.
```

#### Vibe: Modern 64-Bit
```
A master-level modern pixel art Twitch emote. Subject: A focused icon or character expressing '{emotion}'. Style: High-fidelity 64-bit resolution with advanced sub-pixel shading and anti-aliasing. Palette: Vibrant, high-contrast arcade colors. Outline: A crisp, perfect 1-pixel black border to ensure a sharp silhouette in Twitch chat. Background: Isolated on a flat, solid neon-green background. Professional retro-future gaming aesthetic, pixel-perfect digital art.
```

#### Vibe: Elite Glass
```
A sophisticated 'Glassmorphism' Twitch emote. Subject: A translucent icon representing '{emotion}' (e.g., a glowing heart or a lightning bolt). Material: Multi-layered frosted glass with realistic internal refraction and caustic light play. Accent: An internal glowing core that emits a soft light. Outline: A sharp, polished glass edge with ray-traced reflections. Background: Isolated on a flat, solid neon-green background. 8k resolution, looks like a premium spatial-computing UI asset.
```

#### Vibe: Halftone Pop
```
A vibrant 2D 'Pop Art' comic book style Twitch emote. Subject: A character or action-word '{text}' expressing extreme '{emotion}'. Style: Heavy ink brush strokes, dramatic halftone dot patterns for shading, and Ben-Day dots. Colors: High-saturation primary colors with a vintage yellow-paper texture. Detail: Dramatic speed lines and 'Kapow-style' action clouds. Background: Isolated on a flat, solid neon-green background. High-contrast, iconic, and professionally illustrated.
```

#### Vibe: Marble & Gold
```
A hyper-realistic 3D luxury Twitch emote. Subject: A '{emotion}' themed object (e.g., a crown or a trophy). Material: Polished white Carrara marble with inlaid 24k liquid gold veins that glow slightly. Texture: Mirror-finish stone with realistic subsurface scattering. Lighting: Cinematic 'Museum-Grade' spotlights with sharp high-specular glints. Outline: A thick, polished gold beveled border. Background: Isolated on a flat, solid neon-green background. 8k resolution, peak designer-quality branding.
```

#### Vibe: Cozy Doodle
```
A professional hand-drawn 'Doodle' style Twitch emote. Subject: A stylized character or object representing '{emotion}' (e.g., a steaming cup of coffee for 'comfy' or a sleepy cloud). Style: Soft pencil-sketch lines with watercolor-wash textures and a slightly messy, charming aesthetic. Lineart: Charcoal grey organic lines. Colors: Soft pastels with 'paper grain' texture visible. Isolated on a flat, solid neon-green background. Professional whimsical illustration, 8k resolution, clear and legible at small chat sizes.
```

#### Vibe: Retro 90s Holographic
```
A single 3D holographic sticker Twitch emote. Subject: A vibrant '{emotion}' icon (e.g., a lightning bolt for 'hype' or a crying moon for 'sad'). Style: 90s retro-future with a 'Prismatic Iridescent' foil finish that shifts colors in the light. Detail: Faux-embossed texture with a thick, jagged white 'Sticker-Peel' border. Lighting: Vibrant 'Flash-Photography' reflections. Isolated on a flat, solid neon-green background. High-contrast, nostalgic, and extremely eye-catching.
```

#### Vibe: Cel-Shaded Anime
```
A professional anime-style Twitch emote. Subject: A high-detail chibi head of a character expressing an exaggerated '{emotion}'. Style: 'Modern Cel-Shaded' with sharp, clean ink lines and distinct 3-tone shadow blocks. Eyes: Large, expressive 'Glistening' anime eyes. Outline: A thick, consistent black stroke for chat readability. Background: Isolated on a flat, solid neon-green background. Ufotable or Studio MAPPA aesthetic, vibrant colors, 8k digital art.
```

#### Vibe: Vaporwave Neon
```
A minimalist 'Vaporwave' neon Twitch emote. Subject: A glowing wireframe or vector icon representing '{emotion}' (e.g., a 3D heart or a 'GG' badge). Style: Translucent neon glass tubing with an internal 'Electric Glow'. Colors: Cyber-pink and electric-blue gradients. Detail: Subtle digital 'Glitch' artifacts on the edges. Isolated on a flat, solid neon-green background. Sharp, clean vectors, high-end digital broadcast quality.
```

#### Vibe: Tactical Patch
```
A hyper-realistic 3D embroidered tactical patch Twitch emote. Subject: A '{emotion}' themed design (e.g., a shield, medal, or character face). Texture: Highly detailed individual thread-weave patterns and 'Merrowed' stitched edges. Material: Tactical nylon fabric with slightly frayed high-quality embroidery. Lighting: Soft side-lighting to emphasize the 'Thread-Depth' and physical height of the embroidery. Isolated on a flat, solid neon-green background. 8k resolution macro photography, indistinguishable from a real physical patch.
```

#### Vibe: Kawaii Blob
```
A 1:1 ultra-cute 'Blob' style Twitch emote. A round, squishy character with minimal features expressing '{emotion}'. Soft gradient shading, tiny sparkle highlights. If '{text}' is provided, it floats above in a cute bubble. Pastel colors, maximum cuteness, isolated on flat green background. Kawaii aesthetic, readable at all sizes.
```

---

### Template: Going Live (`going-live`)
**Dimensions:** 1080×1920 (9:16)
**Fields:** `title`, `game`, `time`

#### Vibe: Pro Aesthetic
```
A vertical 9:16 high-end photography shot of a professional streamer's setup at night. Foreground: A high-detail blurred view of a mechanical keyboard and a high-end microphone. Center: A floating frosted-glass UI panel with sharp white text reading '{title}'. Below it, the game '{game}' is displayed in a minimalist tag. Lighting: Soft teal and pink 'Gamer-Glow' from Nanoleafs in the background. Cinematic bokeh, ray-traced reflections, 8k resolution.
```

#### Vibe: Anime Hype
```
A vertical 9:16 cinematic anime-style illustration. A stylized character representing the streamer in a dynamic heroic pose, surrounded by glowing energy auras matching the world of {game}. Massive, stylized block typography at the top reads '{title}'. A digital clock-font at the bottom reads '{time}'. Vibrant cel-shaded colors, dramatic speed lines, high-octane energy, Ufotable studio art style.
```

#### Vibe: 3D Toy
```
A vertical 9:16 3D render of a custom designer vinyl toy figurine of a streamer holding a {game} weapon. The figurine is in a high-gloss finish. The background is a vibrant, solid color studio. Floating 3D bubble letters in the air spell out '{title}'. A small 3D 'LIVE' tag shows '{time}'. Soft studio lighting, clay-render aesthetic, playful and colorful, 8k textures.
```

---

### Template: Weekly Schedule (`schedule`)
**Dimensions:** 1200×480 (2.5:1)
**Fields:** `days`, `times`

#### Vibe: Clean Minimalist
```
A 2.5:1 horizontal flat-lay banner. A professional studio desk view with a matte-black desk mat. Clean white glass cards are arranged horizontally, one card for each streaming day listed. The cards display the days '{days}' with the time '{times}' below each day in sharp sans-serif typography. A high-end camera lens and a controller are placed artistically in the margins. Soft global illumination, extremely organized and professional.
```

#### Vibe: Retro Arcade
```
A 2.5:1 horizontal neon arcade aesthetic. Glowing 80s-style CRT monitors arranged in a row, one monitor for each day listed. Each screen displays one day from '{days}' with the time '{times}' in pixel-art fonts. Neon pink and electric blue 'Glow-wire' connects the monitors. The background is a dark grid-pattern 'Synthwave' landscape. High-contrast, nostalgic, and high-energy.
```

#### Vibe: Colorful Calendar
```
A 2.5:1 horizontal 3D render of a playful calendar board. Colorful 3D day blocks arranged in a row, one block for each day in '{days}'. Each block has a cute clock icon displaying '{times}'. Soft pastel background with floating gaming icons. Clay-render aesthetic, cheerful and inviting, 8k textures.
```

---

### Template: Starting Soon (`starting-soon`)
**Dimensions:** 1920×1080 (16:9)
**Fields:** `message`

#### Vibe: High-Tech Command
```
A 16:9 professional broadcast 'Command Center' aesthetic. A futuristic 3D UI interface with rotating data rings and pulse waves. In the center, a bold digital display reads '{message}' in a high-contrast 'Ink-Trap' font. Background features a dark tech-brushed metal texture with pulsing RGB strips. Clean, sharp, and high-production value.
```

#### Vibe: Energy Burst
```
A 16:9 anime-style energy burst composition. Dramatic speed lines radiating from center. Bold stylized text '{message}' with glowing outline effect. Vibrant color gradients, particle effects, and dynamic motion blur. High-energy anticipation aesthetic, anime broadcast quality.
```

#### Vibe: Cozy Lofi
```
A 16:9 cinematic shot of a cozy gaming room during a rainy night. View from behind a dual-monitor setup showing a blurred game menu. Soft fairy lights and a steaming mug of coffee on the desk. In the center of the air, a soft glowing text overlay reads '{message}'. Warm atmospheric lighting, floating dust motes, lofi-aesthetic, extremely relaxing broadcast quality.
```

---

### Template: Clip Highlight (`clip-highlight`)
**Dimensions:** 1080×1080 (1:1)
**Fields:** `title`, `game`

#### Vibe: Action Freeze-Frame
```
A square 1:1 high-impact action shot. A character from {game} captured mid-air during an explosion. High-motion blur on the environment, but the character is razor-sharp. Large bold yellow text with a heavy black stroke reads '{title}'. High-saturation color grading, 'Victory Royale' aesthetic, designed for maximum scroll-stopping impact on social media.
```

#### Vibe: Manga Speed-Line
```
A square 1:1 black and white manga-style illustration with vibrant color accents. A character making a shocked 'Hype' expression. Dramatic black ink speed lines radiating from the center. Bold 'Katakana-style' English text reads '{title}'. High contrast, sharp edges, extremely stylized and professional.
```

#### Vibe: Pop Victory
```
A square 1:1 3D pop-art style render. A cute chibi character celebrating with confetti. Bold 3D bubble text reads '{title}'. Bright saturated colors, comic-style halftone patterns in background. Playful victory aesthetic, social media optimized, 8k textures.
```

---

### Template: Milestone (`milestone`)
**Dimensions:** 1080×1920 (9:16)
**Fields:** `type` (followers/subs/viewers), `count`

#### Vibe: Golden Trophy
```
A vertical 9:16 3D render of a massive, polished gold trophy shaped like the number '{count}'. The trophy is sitting on a high-gloss stage reflecting 'Gamer-Blue' stage lights. Floating 3D text above reads 'NEW {type} ACHIEVED'. Falling 3D metallic confetti and volumetric spotlights. Triumphant, luxury esports aesthetic.
```

#### Vibe: Level Up
```
A vertical 9:16 anime-style level-up celebration. Dramatic golden light rays bursting from center. The number '{count}' rendered in massive metallic 3D with energy aura. Floating icons representing {type} swirling around. Vibrant cel-shaded style, epic achievement moment, anime game aesthetic.
```

#### Vibe: Pop-Art Celebration
```
A vertical 9:16 vibrant pop-art illustration. A large, comic-book style speech bubble contains the number '{count}'. Surrounding the number are 3D icons of {type} (hearts for followers, stars for subs). Bright 'Halftone' patterns in the background, neon colors, 'Level Up' energy, very high energy.
```

---

### Template: Channel Panel (`panel`)
**Dimensions:** 320×160 (2:1)
**Fields:** `type` (about/schedule/rules/donate)

#### Vibe: Matte Hardware
```
A 2:1 horizontal Twitch panel. A 3D render of a matte-white gaming controller or headset on the left. The text '{type}' in a clean, bold black sans-serif font on the right. Background is a soft grey gradient with a subtle hexagonal texture. Professional, minimalist, and high-end.
```

#### Vibe: Neon Sign
```
A 2:1 horizontal neon sign aesthetic. A glowing glass tube shaped like a gaming icon next to the word '{type}' in a vibrant neon font. The background is a dark brick wall with soft color spill. Warm, inviting, 'Night-stream' aesthetic.
```

#### Vibe: Cute Icon
```
A 2:1 horizontal panel with cute 3D icon style. A playful cartoon icon representing '{type}' on the left. Bold colorful text '{type}' on the right. Soft pastel gradient background. Friendly, approachable, kawaii-inspired aesthetic.
```

---

### Template: Offline Screen (`offline`)
**Dimensions:** 1920×1080 (16:9)
**Fields:** `message`, `schedule`

#### Vibe: Technical Glitch
```
A 16:9 'Technical Difficulties' aesthetic but professional. A dark screen with a subtle scan-line texture. A central frosted-glass UI box reads '{message}'. Below it, a clean schedule reads 'Next Stream: {schedule}'. Subtle RGB glitch effects on the borders, very high-end and informative.
```

#### Vibe: Anime Away
```
A 16:9 anime-style offline screen. A cute chibi version of a streamer character sleeping or waving goodbye. Soft dreamy background with stars. Text '{message}' in stylized anime font. 'Returning: {schedule}' in smaller text. Warm, friendly, anime aesthetic.
```

#### Vibe: Cozy Desk
```
A 16:9 wide-shot of an empty streamer's chair and a glowing desk at midnight. The monitors show a 'Goodbye' screen. A small sticky note on the monitor reads '{message}'. In the corner of the screen, the text 'Returning: {schedule}'. Soft moonlight coming through a window, peaceful, branded, and high-quality.
```

---

## 7. QUICK CREATE VIBES - FRONTEND DEFINITIONS

### Standard Vibes (Most Templates)
```typescript
const STANDARD_VIBES = [
  { id: 'pro', name: 'Pro Aesthetic', tagline: 'Clean, professional, high-end photography style', icon: '🎯', gradient: 'from-slate-600 to-zinc-800' },
  { id: 'anime', name: 'Anime Hype', tagline: 'Dynamic cel-shaded illustration with energy', icon: '⚡', gradient: 'from-purple-600 to-pink-600' },
  { id: 'playful', name: '3D Playful', tagline: 'Colorful 3D toy aesthetic, fun and inviting', icon: '🎨', gradient: 'from-cyan-500 to-blue-600' },
];
```

### Emote-Specific Vibes
```typescript
const EMOTE_VIBES = [
  { id: 'glossy', name: '3D Glossy', tagline: 'Shiny vinyl sticker with bold colors', icon: '✨', gradient: 'from-rose-500 to-orange-500' },
  { id: 'pixel', name: 'Pixel Classic', tagline: 'Retro 16-bit game aesthetic', icon: '👾', gradient: 'from-green-600 to-emerald-500' },
  { id: 'cozy', name: 'Cozy Doodle', tagline: 'Hand-drawn sketch with watercolor warmth', icon: '☕', gradient: 'from-amber-500 to-orange-400' },
  { id: 'retro', name: 'Retro 90s', tagline: 'Holographic iridescent sticker nostalgia', icon: '🌈', gradient: 'from-fuchsia-500 to-cyan-400' },
  { id: 'anime', name: 'Cel-Shaded', tagline: 'Studio-quality anime with expressive eyes', icon: '🎌', gradient: 'from-purple-600 to-pink-600' },
  { id: 'vaporwave', name: 'Vaporwave', tagline: 'Neon wireframe with cyber aesthetics', icon: '🌃', gradient: 'from-violet-600 to-fuchsia-500' },
  { id: 'tactical', name: 'Tactical Patch', tagline: 'Embroidered fabric with realistic threads', icon: '🎖️', gradient: 'from-stone-600 to-zinc-700' },
  { id: 'kawaii', name: 'Kawaii Blob', tagline: 'Ultra-cute squishy blob characters', icon: '🩷', gradient: 'from-pink-400 to-rose-400' },
];
```

### Thumbnail-Specific Vibes
```typescript
const THUMBNAIL_VIBES = [
  { id: 'aesthetic-pro', name: 'Aesthetic Pro', tagline: 'Clean, cinematic gamer-glow', icon: '✨', gradient: 'from-purple-600 to-indigo-800' },
  { id: 'viral-hype', name: 'Viral Hype', tagline: 'Maximum CTR energy', icon: '🔥', gradient: 'from-orange-500 to-red-600' },
  { id: 'anime-cinematic', name: 'Anime Cinematic', tagline: 'Studio-quality anime style', icon: '🎌', gradient: 'from-purple-600 to-pink-600' },
  { id: 'playful-3d', name: 'Playful 3D', tagline: 'Cute vinyl toy aesthetic', icon: '🎨', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'after-dark', name: 'After Dark', tagline: 'Tactical noir esports', icon: '🌙', gradient: 'from-emerald-600 to-slate-800' },
  { id: 'color-pop', name: 'Color Pop', tagline: 'Choose your color scheme', icon: '🎨', gradient: 'from-fuchsia-500 to-cyan-400' },
  { id: 'pro', name: 'Shock Face', tagline: 'Viral-style reaction', icon: '😱', gradient: 'from-red-600 to-orange-500' },
  { id: 'anime', name: 'The Duel', tagline: 'Epic versus split', icon: '⚔️', gradient: 'from-blue-600 to-red-600' },
  { id: 'playful', name: 'Cartoon Pop', tagline: 'Colorful bubble text', icon: '🎮', gradient: 'from-purple-500 to-cyan-400' },
];
```

---

## 8. BRAND KIT SYSTEM

### Supported Fonts
```python
SUPPORTED_FONTS = [
    'Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Poppins',
    'Lato', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
    'Merriweather', 'Source Sans Pro', 'Ubuntu', 'Rubik', 'Work Sans',
    'Fira Sans', 'Barlow', 'Quicksand', 'Karla', 'Mulish'
]
```

### Brand Tones
```python
VALID_TONES = Literal['competitive', 'casual', 'educational', 'comedic', 'professional']
```

### Color Validation
- Format: `#RRGGBB` (6-digit hex)
- Primary colors: 1-5 colors
- Accent colors: 0-3 colors

### Logo Types
```python
LogoTypeEnum = Literal["primary", "secondary", "icon", "watermark"]
```

### Logo Positions
```python
LogoPositionEnum = Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"]
```

### Logo Sizes
```python
LogoSizeEnum = Literal["small", "medium", "large"]
# small = 10% of asset, medium = 15%, large = 20%
```

### Brand Intensity
```python
BrandIntensityEnum = Literal["subtle", "balanced", "strong"]
```

---

## 9. PROMPT COACH SYSTEM

### Coach Access Tiers
```python
TIER_ACCESS = {
    "free":   {"coach_access": False, "feature": "tips_only", "grounding": False, "trial_available": True},
    "pro":    {"coach_access": False, "feature": "tips_only", "grounding": False, "trial_available": True},
    "studio": {"coach_access": True,  "feature": "full_coach", "grounding": True, "trial_available": False},
}
```

### Coach Asset Types
```python
AssetTypeEnum = Literal[
    "thumbnail", "overlay", "banner", "story_graphic", "clip_cover",
    "twitch_emote", "twitch_badge", "twitch_panel", "twitch_offline",
    "youtube_thumbnail", "twitch_banner", "tiktok_story", 
    "instagram_story", "instagram_reel"
]
```

### Coach Moods
```python
MoodEnum = Literal["hype", "cozy", "rage", "chill", "custom"]
```

### SSE Stream Chunk Types
```python
StreamChunkTypeEnum = Literal[
    "token",              # Streaming text token
    "intent_ready",       # Intent analysis complete
    "grounding",          # Web grounding in progress
    "grounding_complete", # Web grounding finished
    "done",               # Stream complete
    "error"               # Error occurred
]
```

### Validation Severity Levels
```python
ValidationSeverityEnum = Literal["error", "warning", "info"]
```

### Session Limits
- **Max turns per session:** 10
- **Session timeout:** 30 minutes
- **Rate limits (Studio):**
  - Messages: 10 per 60 seconds
  - Sessions: 20 per hour

---

## 10. API SCHEMAS - REQUEST/RESPONSE FORMATS

### Generation Request
```typescript
interface GenerateRequest {
  asset_type: AssetTypeEnum;           // Required
  brand_kit_id?: string | null;        // Optional UUID
  custom_prompt?: string;              // Max 500 chars
  brand_customization?: {
    colors?: {
      primary_index: number;           // 0-4
      secondary_index?: number;        // 0-4
      accent_index?: number;           // 0-2
      use_gradient?: number;           // 0-2
    };
    typography?: {
      level: 'display' | 'headline' | 'subheadline' | 'body' | 'caption' | 'accent';
    };
    voice?: {
      use_tagline: boolean;
      use_catchphrase?: number;
    };
    include_logo: boolean;
    logo_type: 'primary' | 'secondary' | 'icon' | 'watermark';
    logo_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    logo_size: 'small' | 'medium' | 'large';
    brand_intensity: 'subtle' | 'balanced' | 'strong';
  };
}
```

### Job Response
```typescript
interface JobResponse {
  id: string;                          // UUID
  user_id: string;                     // UUID
  brand_kit_id: string | null;         // UUID or null
  asset_type: AssetTypeEnum;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
  progress: number;                    // 0-100
  error_message: string | null;
  created_at: string;                  // ISO 8601
  updated_at: string;                  // ISO 8601
  completed_at: string | null;         // ISO 8601
}
```

### Brand Kit Create Request
```typescript
interface BrandKitCreate {
  name: string;                        // 1-100 chars
  primary_colors: string[];            // 1-5 hex codes (#RRGGBB)
  accent_colors?: string[];            // 0-3 hex codes
  fonts: {
    headline: SupportedFont;
    body: SupportedFont;
  };
  tone?: 'competitive' | 'casual' | 'educational' | 'comedic' | 'professional';
  style_reference?: string;            // Max 500 chars
  logo_url?: string;
}
```

### Coach Start Request
```typescript
interface StartCoachRequest {
  brand_context?: {
    brand_kit_id?: string;
    colors: Array<{ hex: string; name: string }>;
    tone: string;
    fonts?: { headline: string; body: string };
    logo_url?: string;
  };
  asset_type: AssetTypeEnum;           // Required
  mood: 'hype' | 'cozy' | 'rage' | 'chill' | 'custom';
  custom_mood?: string;                // Required if mood='custom'
  game_id?: string;
  game_name?: string;
  description: string;                 // 5-500 chars
}
```

---

## 11. EMOTE SIZE CONFIGURATIONS

### Twitch Emote Sizes
| Size Label | Dimensions | Use Case |
|------------|------------|----------|
| Large | 112×112 | Desktop chat, emote picker |
| Medium | 56×56 | Mobile chat |
| Small | 28×28 | Compact chat, mentions |

### TikTok Emote Sizes
| Size Label | Dimensions | Use Case |
|------------|------------|----------|
| Standard | 300×300 | Full display |
| Medium | 200×200 | Compact display |
| Small | 100×100 | Inline display |

### Twitch Badge Sizes
| Size Label | Dimensions | Use Case |
|------------|------------|----------|
| Large | 72×72 | Badge picker |
| Medium | 36×36 | Chat display |
| Small | 18×18 | Compact chat |

### Generation vs Export Sizes
All emotes/badges are generated at high resolution (1024×1024 or 512×512) then downscaled to export sizes for quality.

---

## 12. MODALS & OVERLAYS

### Dashboard Modals
| Component | Purpose | Trigger |
|-----------|---------|---------|
| `Modal` | Base modal wrapper | Various |
| `ConfirmDialog` | Confirmation prompts | Delete actions |
| `AssetPreview` | Full asset preview | Click on asset |

### Lightbox System
| Component | Purpose |
|-----------|---------|
| `ImageLightbox` | Full-screen image viewer |
| `LightboxControls` | Zoom, download, share buttons |
| `LightboxOverlay` | Backdrop with click-to-close |
| `LightboxZoom` | Pinch-to-zoom functionality |

### Slide-Overs
| Component | Purpose |
|-----------|---------|
| `CoachSlideOver` | Prompt Coach chat panel |

### Command Palette
- Triggered by `⌘K` / `Ctrl+K`
- Navigation commands
- Action commands (New Asset, New Brand Kit)
- Recent commands tracking

### Keyboard Shortcuts Modal
- Triggered by `?` key
- Shows all available shortcuts

---

## 13. COMPONENT LIBRARY

### Coach Chat Components
```
tsx/apps/web/src/components/coach/
├── CoachChatIntegrated.tsx      # Full chat interface
├── CoachMessage.tsx             # Individual message bubbles
├── CoachContextForm.tsx         # Context input form
├── CoachTips.tsx                # Static tips for non-premium
├── ThinkingIndicator.tsx        # AI thinking animation
├── ChainOfThought.tsx           # Reasoning display
├── cards/
│   ├── PromptCard.tsx           # Prompt suggestions
│   ├── ValidationCard.tsx       # Validation feedback
│   └── SuggestionCard.tsx       # Improvement suggestions
├── input/
│   ├── CoachInput.tsx           # Message input
│   └── SuggestionChips.tsx      # Quick action chips
├── generation/
│   ├── GenerationProgress.tsx   # Progress bar
│   ├── GenerationResult.tsx     # Completed asset
│   └── InlineGenerationCard.tsx # Generation preview
└── context/
    ├── SessionContextBar.tsx    # Session info header
    ├── TurnsIndicator.tsx       # Remaining turns
    └── SessionBadge.tsx         # Session status
```

### Empty States
| Component | Used On |
|-----------|---------|
| `AssetsEmptyState` | Asset Library (no assets) |
| `BrandKitsEmptyState` | Brand Kits (no kits) |
| `JobsEmptyState` | Jobs list (no jobs) |
| `SearchEmptyState` | Search results (no matches) |

### Skeletons
| Component | Purpose |
|-----------|---------|
| `AssetGridSkeleton` | Asset grid loading |
| `BrandKitCardSkeleton` | Brand kit card loading |
| `DashboardStatsSkeleton` | Stats cards loading |
| `CoachMessageSkeleton` | Chat message loading |

---

## 14. CELEBRATIONS & FEEDBACK

### Milestone System
```typescript
const MILESTONES = [
  { count: 1, title: 'First Creation!', message: 'You created your first asset!' },
  { count: 10, title: 'Getting Started', message: '10 assets and counting!' },
  { count: 50, title: 'Content Creator', message: '50 assets generated!' },
  { count: 100, title: 'Pro Creator', message: '100 assets! You\'re on fire!' },
];
```

### Celebration Components
- `CelebrationOverlay` - Full-screen milestone celebration
- `Confetti` - Confetti particle animation
- Sound effects (optional, user preference)
- Social share buttons

### Undo System
- 5-second countdown for destructive actions
- Toast notification with undo button
- Automatic rollback on undo click
- Actions: Delete asset, Delete brand kit, Deactivate brand kit

### Toast Notifications
- Variants: `success`, `error`, `warning`, `info`
- Auto-dismiss: 5 seconds (configurable)
- Manual dismiss available
- Stacking support (max 3 visible)

---

## 15. USAGE & LIMITS

### Tier Limits
| Tier | Monthly Assets | Coach Access | Trial |
|------|----------------|--------------|-------|
| Free | 10 | Tips only | 1 session |
| Pro | 100 | Tips only | 1 session |
| Studio | Unlimited | Full coach | N/A |

### Usage Display Component
```typescript
interface UsageDisplayProps {
  variant: 'compact' | 'full';
  showUpgrade: boolean;
  onUpgrade?: () => void;
}
```

### Usage Tracking
- `assets_generated_this_month` - Resets monthly
- `coach_trial_used` - Boolean, one-time trial

---

## 16. MOBILE EXPERIENCE

### Mobile Navigation
- `MobileNavDropdown` - Compact dropdown selector in header
- Shows current page with dropdown to switch
- Replaces sidebar on viewports < 768px

### Mobile Detection
```typescript
// useIsMobile hook
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
```

### Responsive Breakpoints
| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets, mobile/desktop split |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Mobile-Specific Components
- `MobileHeader` - Simplified header with logo + dropdown
- `MobileNavDropdown` - Navigation dropdown
- Touch-optimized buttons (min 44px tap targets)

---

## 17. KEYBOARD SHORTCUTS

| Shortcut | Action | Scope |
|----------|--------|-------|
| `⌘K` / `Ctrl+K` | Open Command Palette | Global |
| `N` | New Asset | Dashboard |
| `B` | Go to Brand Kits | Dashboard |
| `A` | Go to Assets | Dashboard |
| `?` | Show Shortcuts | Global |
| `Escape` | Close modal/palette | Global |

### Implementation
```typescript
// KeyboardShortcutsProvider wraps the app
// Shortcuts registered via useKeyboardShortcut hook
useKeyboardShortcut('k', { meta: true }, openCommandPalette);
useKeyboardShortcut('n', {}, () => router.push('/dashboard/create'));
```

---

## 18. ONBOARDING TOUR

### Tour Steps
1. **Welcome** - Introduction to AuraStream
2. **Quick Create** - Template-based generation
3. **Brand Kits** - Brand management
4. **Assets** - Asset library
5. **Coach** - AI prompt assistance (Studio preview)

### Tour State
```typescript
interface OnboardingState {
  hasCompletedTour: boolean;
  currentStep: number;
  skippedAt?: string;
  completedAt?: string;
}
```

### Tour Triggers
- Auto-starts on first login
- Can be restarted from Settings
- Persists to localStorage

---

## 19. FORM VALIDATION

### Validation Rules
```typescript
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    message: 'Password must be 8+ chars with uppercase, lowercase, and number',
  },
  displayName: {
    minLength: 2,
    maxLength: 50,
    message: 'Display name must be 2-50 characters',
  },
  brandKitName: {
    minLength: 1,
    maxLength: 100,
    message: 'Brand kit name is required (max 100 chars)',
  },
  hexColor: {
    pattern: /^#[0-9A-Fa-f]{6}$/,
    message: 'Invalid hex color format (use #RRGGBB)',
  },
};
```

### Validation Components
- `ValidatedInput` - Input with inline validation
- `ValidationFeedback` - Success/error message display
- Debounced validation (300ms)
- Positive feedback on valid input

---

## 20. ANALYTICS SYSTEM

### Event Categories
```python
VALID_CATEGORIES = {"page", "modal", "wizard", "user_action", "feature", "performance", "error"}
```

### Event Tracking
```typescript
// Frontend tracker
tracker.track({
  event: 'asset_generated',
  category: 'user_action',
  properties: {
    asset_type: 'twitch_emote',
    brand_kit_used: true,
    generation_time_ms: 4500,
  },
});
```

### Analytics Architecture
```
Frontend Tracker → Batch (max 50) → POST /api/v1/analytics
                                           ↓
                                    Redis (real-time)
                                           ↓
                              Hourly flush → PostgreSQL
```

### Admin Analytics Dashboard
- Total page views
- Unique visitors
- Popular pages
- Event breakdown by category
- Popular asset types
- Generation success rate

---

## 21. GENERATION FLOW - COMPLETE SEQUENCE

### Create Page Flow
```
1. Select Platform (All, Twitch, YouTube, TikTok)
   └── Filters available asset types
   
2. Select Asset Type
   └── Shows dimensions, description
   
3. Select Brand Kit (optional)
   └── Loads colors, fonts, tone, logos
   
4. Choose Prompt Method
   ├── Manual → Text input (max 500 chars)
   └── Coach → AI-assisted (Studio tier)
   
5. Configure Logo Options (if brand kit selected)
   ├── Include logo toggle
   ├── Logo type (primary/secondary/icon/watermark)
   ├── Position (top-left/top-right/bottom-left/bottom-right/center)
   └── Size (small/medium/large)
   
6. Generate
   └── POST /api/v1/generate
```

### Quick Create Flow
```
1. Select Template
   └── Shows category, dimensions, fields
   
2. Fill Template Fields
   └── Dynamic fields based on template
   
3. Select Vibe/Style
   └── Template-specific vibes
   
4. Preview (optional)
   └── Shows prompt preview
   
5. Generate
   └── POST /api/v1/generate with template data
```

### Generation Progress Page (`/dashboard/generate/[jobId]`)
```
1. SSE Connection
   └── GET /api/v1/jobs/{id}/stream
   
2. Progress Updates
   ├── status: queued → processing → completed
   ├── progress: 0 → 100
   └── Real-time percentage display
   
3. Completion
   ├── Asset preview
   ├── Download button
   ├── Share options
   └── Generate another CTA
   
4. Error Handling
   ├── Retry button
   ├── Error message display
   └── Support link
```

---

## 22. ERROR HANDLING

### Error Pages
- `error.tsx` - Generic error boundary
- `not-found.tsx` - 404 page

### API Error Codes
| Status | Meaning | User Message |
|--------|---------|--------------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Please log in |
| 403 | Forbidden | Upgrade required / Not allowed |
| 404 | Not Found | Resource not found |
| 422 | Validation Error | Check your input |
| 429 | Rate Limited | Too many requests, try again |
| 500 | Server Error | Something went wrong |

### Generation Errors
| Error Type | Cause | Recovery |
|------------|-------|----------|
| `ContentPolicyError` | Prompt violates policy | Modify prompt |
| `RateLimitError` | API rate limit | Wait and retry |
| `GenerationTimeoutError` | 120s timeout | Retry |
| `GenerationError` | Generic failure | Retry or contact support |

---

## 23. SETTINGS PAGE

### Settings Tabs
| Tab | Features |
|-----|----------|
| **Profile** | Display name, email, avatar upload |
| **Billing** | Current plan, usage, upgrade/downgrade |
| **Preferences** | Theme, notifications, keyboard shortcuts |

### Profile Settings
- Display name (2-50 chars)
- Email (read-only, verified status)
- Avatar upload (max 5MB, jpg/png/webp)
- Delete account (requires confirmation)

### Billing Settings
- Current tier display
- Usage this month
- Upgrade CTA (free/pro)
- Manage subscription (Stripe portal)
- Invoice history

---

## 24. TWITCH PACK TYPES

### Pack Definitions
```python
PackType = Literal["seasonal", "emote", "stream"]
```

### Seasonal Pack
- Holiday-themed assets
- Includes: emotes, badges, panels, offline screen
- Customizable theme (Winter, Summer, Halloween, etc.)

### Emote Pack
- Set of related emotes
- Common emotions: hype, sad, laugh, love, comfy, rage, pog, gg
- Consistent style across pack

### Stream Pack
- Complete stream branding
- Includes: overlay, starting soon, BRB, ending, offline
- Matching visual style

---

## 25. FILE FORMATS & STORAGE

### Supported Output Formats
| Format | Use Case | Quality |
|--------|----------|---------|
| PNG | Default, transparency | Lossless |
| WebP | Web optimized | 90% quality |
| JPEG | Photos, thumbnails | 85% quality |

### Storage Structure
```
/assets/{user_id}/{job_id}/{asset_id}.{format}
```

### CDN Delivery
- Assets served via CDN
- Cache headers: 1 year
- Signed URLs for private assets

---

*This report covers 100% of the frontend experience with full technical specifications as of December 28, 2025.*
