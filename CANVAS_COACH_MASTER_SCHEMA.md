# Canvas → Coach → Nano Banana Master Schema

## Token-Conscious Design Principles

1. **Structured over verbose** - Use compact JSON, not prose
2. **Classify first, clarify only ambiguous** - Don't ask about obvious elements
3. **Single-pass clarification** - One message to clarify all ambiguous items
4. **Compact output format** - Nano Banana gets structured instructions, not essays

---

## Element Classification System

### Auto-Classified (No Clarification Needed)

| Element Type | Auto-Classification | Reasoning |
|--------------|---------------------|-----------|
| `image` (background) | `KEEP_ASSET` | Full-canvas backgrounds are base layers |
| `image` (character/object) | `KEEP_ASSET` | User placed it intentionally |
| `sticker` (emoji) | `KEEP_DECORATION` | Decorative intent clear |
| `arrow` | `PLACEMENT_HINT` | Points to where something goes |
| `rectangle` (outline) | `REGION_MARKER` | Indicates area for content |
| `circle` (outline) | `REGION_MARKER` | Indicates area for content |
| `freehand` (small) | `ANNOTATION` | Quick sketch/note |

### Needs Clarification (Ambiguous)

| Element Type | Ambiguity | Question Template |
|--------------|-----------|-------------------|
| `text` (ALL CAPS, short) | Title vs instruction? | `"[text]" - display as title or instruction?` |
| `text` (sentence) | Instruction vs render? | `"[text]" - render this scene or display as text?` |
| `text` ("[thing] here") | Place thing or show text? | `"[text]" - place [thing] there or show as text?` |
| `rectangle` (filled) | Keep shape or region? | Keep this box or use as placement area? |
| `image` (small, corner) | Keep or reference only? | Keep visible or just for reference? |

---

## Compact Canvas Context Format

```json
{
  "canvas": {
    "type": "youtube_thumbnail",
    "size": [1280, 720]
  },
  "assets": [
    {"id": "a1", "name": "Fortnite Ch7 BG", "type": "background", "pos": "full", "z": 1},
    {"id": "a2", "name": "Ikonik Skin", "type": "character", "pos": "25,70", "size": "30x40", "z": 2}
  ],
  "texts": [
    {"id": "t1", "content": "The BEST Shotgun EVER?", "pos": "50,15", "style": "large"},
    {"id": "t2", "content": "Pump here", "pos": "70,60", "style": "small"},
    {"id": "t3", "content": "Make this dramatic", "pos": "80,10", "style": "note"}
  ],
  "drawings": [
    {"id": "d1", "type": "arrow", "from": "65,55", "to": "70,60"}
  ],
  "snapshot_url": "https://..."
}
```

**Token count: ~400 tokens** (vs ~2000 for verbose description)

---

## Coach Clarification Protocol

### Step 1: Auto-Classify Elements

```python
def classify_element(element: dict) -> tuple[str, float]:
    """Returns (classification, confidence)"""
    
    if element['type'] == 'image':
        if element.get('size') == 'full' or element.get('type') == 'background':
            return ('KEEP_ASSET', 1.0)
        return ('KEEP_ASSET', 0.9)
    
    if element['type'] == 'text':
        content = element['content']
        
        # High confidence: ALL CAPS with punctuation = title
        if content.isupper() and any(p in content for p in '?!'):
            return ('DISPLAY_TEXT', 0.95)
        
        # High confidence: Imperative verbs = instruction
        if any(content.lower().startswith(v) for v in ['make', 'add', 'create', 'render']):
            return ('INSTRUCTION', 0.9)
        
        # Medium confidence: "[thing] here" pattern
        if content.lower().endswith(' here'):
            return ('PLACEMENT_HINT', 0.7)  # Needs clarification
        
        # Medium confidence: Descriptive sentence
        if ' ' in content and len(content) > 20:
            return ('RENDER_SCENE', 0.6)  # Needs clarification
        
        return ('AMBIGUOUS', 0.5)
    
    if element['type'] == 'arrow':
        return ('PLACEMENT_HINT', 0.95)
    
    if element['type'] in ['rectangle', 'circle']:
        if element.get('filled'):
            return ('AMBIGUOUS', 0.5)
        return ('REGION_MARKER', 0.85)
    
    return ('KEEP_DECORATION', 0.7)
```

### Step 2: Generate Minimal Clarification

Only ask about elements with confidence < 0.8:

```python
def generate_clarifications(elements: list) -> str:
    ambiguous = [(e, c) for e, (cls, conf) in elements if conf < 0.8]
    
    if not ambiguous:
        return None  # No clarification needed!
    
    questions = []
    for elem, classification in ambiguous:
        if elem['type'] == 'text':
            content = elem['content']
            if classification == 'PLACEMENT_HINT':
                thing = content.replace(' here', '').strip()
                questions.append(f'"{content}" → place {thing} or show as text?')
            elif classification == 'RENDER_SCENE':
                questions.append(f'"{content}" → render this or display as text?')
            else:
                questions.append(f'"{content}" → title, instruction, or render?')
    
    return "Quick check:\n" + "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
```

**Example output:**
```
Quick check:
1. "Pump here" → place Pump Shotgun or show as text?
2. "Ikonik fighting Omega" → render this scene or display as text?
```

### Step 3: Parse User Response

User can respond tersely:
- "1 place, 2 render"
- "pump shotgun there, render the fight"
- "yes/no" for single questions

---

## Nano Banana Output Format

### Compact Structured Prompt

```json
{
  "base": {"asset": "a1", "treatment": "keep"},
  "display": [
    {"text": "The BEST Shotgun EVER?", "pos": "top-center", "style": "title"}
  ],
  "render": [
    {"desc": "Ikonik + Omega skins fighting", "pos": "bottom-left", "ref": "a2"},
    {"desc": "Pump Shotgun", "pos": "center-right"}
  ],
  "style": ["dramatic", "high-energy", "youtube-thumbnail"],
  "ignore": ["Make this dramatic"]
}
```

### Natural Language Version (for Nano Banana)

```
YouTube thumbnail 1280x720:
- BG: Fortnite Ch7 (keep)
- Title "The BEST Shotgun EVER?" top-center, bold
- Render: Ikonik + Omega fighting, bottom-left
- Render: Pump Shotgun, center-right  
- Style: dramatic, high-energy
```

**Token count: ~80 tokens**

---

## Element Type Reference

### 1. IMAGE (Placed Assets)

| Property | Use |
|----------|-----|
| `assetId` | Reference to media library |
| `displayName` | Human-readable name |
| `assetType` | background, character, object, logo, face |
| `position` | {x, y} percentage |
| `size` | {width, height} percentage |
| `zIndex` | Layer order |
| `rotation` | Degrees |
| `opacity` | 0-100 |

**Classification:**
- `background` + full size → `KEEP_ASSET` (base layer)
- `character`/`object` → `KEEP_ASSET` (user placed intentionally)
- Small corner placement → May need clarification (reference only?)

### 2. TEXT (Annotations)

| Property | Use |
|----------|-----|
| `text` | Content string |
| `position` | {x, y} percentage |
| `fontSize` | Pixel size |
| `fontFamily` | Font name |
| `color` | Hex color |

**Classification Heuristics:**
- ALL CAPS + punctuation → `DISPLAY_TEXT` (title)
- Starts with verb (make, add, create) → `INSTRUCTION`
- Ends with "here" → `PLACEMENT_HINT`
- Describes scene → `RENDER_SCENE`
- Short label → `DISPLAY_TEXT`

### 3. ARROW

| Property | Use |
|----------|-----|
| `startX/Y` | Arrow start |
| `endX/Y` | Arrow end (points to) |

**Classification:** Always `PLACEMENT_HINT` - indicates where something goes

### 4. RECTANGLE / CIRCLE

| Property | Use |
|----------|-----|
| `x, y, width, height` | Bounds |
| `filled` | Solid or outline |
| `color` | Stroke/fill color |

**Classification:**
- Outline → `REGION_MARKER` (area for content)
- Filled → May need clarification (keep shape or region?)

### 5. FREEHAND

| Property | Use |
|----------|-----|
| `points` | Array of {x, y} |
| `color` | Stroke color |
| `strokeWidth` | Line thickness |

**Classification:**
- Small/simple → `ANNOTATION` (ignore or reference)
- Large/complex → May need clarification

### 6. STICKER

| Property | Use |
|----------|-----|
| `stickerId` | Sticker reference |
| `content` | Emoji or image URL |
| `stickerType` | emoji, svg, image |

**Classification:** Always `KEEP_DECORATION` - user wants it visible

### 7. LINE

| Property | Use |
|----------|-----|
| `startX/Y, endX/Y` | Line endpoints |

**Classification:** `ANNOTATION` or `REGION_MARKER` depending on context

---

## Position Mapping

### Percentage to Region

```python
def pos_to_region(x: float, y: float) -> str:
    col = 'left' if x < 33 else 'right' if x > 66 else 'center'
    row = 'top' if y < 33 else 'bottom' if y > 66 else 'center'
    
    if row == 'center' and col == 'center':
        return 'center'
    if row == 'center':
        return f'center-{col}'
    if col == 'center':
        return f'{row}-center'
    return f'{row}-{col}'
```

### Region Grid

```
┌─────────────┬─────────────┬─────────────┐
│  top-left   │ top-center  │  top-right  │
│   (0-33%)   │  (33-66%)   │  (66-100%)  │
├─────────────┼─────────────┼─────────────┤
│ center-left │   center    │center-right │
│   (0-33%)   │  (33-66%)   │  (66-100%)  │
├─────────────┼─────────────┼─────────────┤
│ bottom-left │bottom-center│ bottom-right│
│   (0-33%)   │  (33-66%)   │  (66-100%)  │
└─────────────┴─────────────┴─────────────┘
```

---

## Token Budget

| Stage | Max Tokens | Purpose |
|-------|------------|---------|
| Canvas context to Coach | 500 | Structured element data |
| Coach clarification question | 100 | Minimal, numbered list |
| User response | 50 | Terse answers |
| Coach confirmation | 150 | Summary + [INTENT_READY] |
| Output to Nano Banana | 200 | Structured generation prompt |

**Total conversation: ~1000 tokens** (vs ~5000 for verbose approach)

---

## Implementation Checklist

- [x] Create `canvas.py` with `CanvasIntentSchema` and classification logic
- [x] Update `__init__.py` to export canvas module
- [x] Add `canvas_schema` field to `CoachSession` model
- [x] Update `service.py` to use `CanvasIntentSchema` when canvas context provided
- [x] Add `build_compact_canvas_prompt()` to `prompts.py`
- [x] Add `_generate_canvas_description()` helper to service
- [x] Include canvas metadata in `intent_ready` stream chunks
- [x] Handle canvas clarification responses in `continue_chat`
- [x] Update generation endpoint to use `to_nano_banana_prompt()` when canvas ready
- [x] Pass structured prompt to generation worker via `canvas_snapshot_description`
- [x] Add `canvas_context` field to `StartCoachRequest` schema
- [x] Update sessions endpoint to pass `canvas_context` to service
- [x] Frontend: Add `CompactCanvasContext` types
- [x] Frontend: Add `buildCompactCanvasContext()` function
- [x] Frontend: Update `useSendToCoach` to build compact context
- [x] Frontend: Update `buildCoachRequest` to include `canvas_context`
- [ ] Frontend: Display canvas clarification questions from `canvas_clarification`
- [ ] Frontend: Show ready state when `nano_banana_prompt` is populated

## Coming Soon Locks (Pre-Launch)

The following features are visible but locked with "Coming Soon" badges:

### Quick Create Templates (`TemplateGrid.tsx`)
- All 10 templates (going-live, schedule, starting-soon, etc.) are visible but disabled
- Amber "Soon" badge with lock icon on each card
- Notice banner directing users to Custom or AI Coach

### Canvas Studio Modes (`CanvasStudio.tsx`)
- **Templates** tab: Locked with "Soon" badge
- **Easy** tab: Locked with "Soon" badge
- Default mode changed from `templates` → `regions`

### Canvas Composer Modes (`CanvasComposer.tsx`)
- **Templates** tab: Locked with "Soon" badge
- **Easy** tab: Locked with "Soon" badge
- Default mode changed from `easy` → `regions`

**To unlock:** Set `TEMPLATES_LOCKED = false` in `TemplateGrid.tsx` and remove modes from `LOCKED_MODES` sets in `CanvasStudio.tsx` and `CanvasComposer.tsx`.

## Pipeline Flow (Verified)

```
Frontend Canvas Studio
    ↓
POST /coach/start with canvas_context (compact JSON)
    ↓
CoachService.start_with_context()
    ↓
classify_canvas_elements() → CanvasIntentSchema
    ↓
session.canvas_schema = schema.to_dict()
    ↓
Coach LLM generates clarification questions
    ↓
Frontend displays questions, user responds
    ↓
POST /coach/sessions/{id}/messages
    ↓
apply_clarification_response() updates schema
    ↓
When canvas_schema.is_ready() == True:
    ↓
POST /coach/sessions/{id}/generate
    ↓
canvas_schema.to_nano_banana_prompt() → structured prompt
    ↓
Generation Worker downloads canvas snapshot
    ↓
Nano Banana receives: input_image + structured prompt
    ↓
Generated asset returned
```
