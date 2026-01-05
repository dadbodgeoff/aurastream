# Canvas Studio Research Plan
## Validating the "Photoshop for Streamers" Thesis

**Research Question:** Do streamers and non-designer creators prefer a canvas-first, AI-second workflow (sketch → place assets → coach refinement → AI polish) over prompt-only design tools? Does this approach feel more controllable, desirable, and easier to learn?

**Core Hypothesis:** 
The canvas-first approach will outperform prompt-only tools on usability, perceived control, and real-world adoption intent because it aligns with how creators naturally think (spatial/visual layout first), provides visible progress, and preserves agency while offloading tedious polish to AI.

---

## 1. RESEARCH OBJECTIVES

### Primary Objectives
1. **Validate usability:** Can non-designers complete core tasks (layout thumbnail, design overlay, arrange scene) with ≤10 min onboarding?
2. **Prove desirability:** Do >65% of participants perceive Canvas Studio as better than their current tools (Canva, OBS presets, Photoshop)?
3. **Test control perception:** Do >70% agree "I felt in control of layout and message" when using canvas + coach + AI polish workflow?
4. **Measure AI handoff acceptance:** Does the sketch → coach → "Make This Pro" pipeline feel intuitive, or do creators view AI output as a "black box"?
5. **Identify feature priorities:** Which additions (templates, safe zones, style packs, coach chat) provide the most value?

### Secondary Objectives
1. Identify unmet gaps in Canvas Studio's current feature set
2. Validate coach + Nano Banana integration timing and metadata passing
3. Determine if specific creator segments (Twitch vs YouTube, gamers vs lifestyle) have different workflows
4. Test whether templates/starters compete with or complement canvas-first approach

---

## 2. PARTICIPANT PROFILES & RECRUITMENT

### Target Segments (8–10 participants per segment; N=32–40 total)

**Segment A: Twitch Gaming Streamers (10 participants)**
- **Profile:** Active Twitch streamers (≥2 streams/week), primarily FPS/action games (Valorant, Fortnite, League, Apex)
- **Key criteria:**
  - Streaming ≥6 months (some experience with overlays/scenes)
  - Currently use OBS + off-the-shelf overlays OR Canva for starting screens
  - Basic design comfort (no professional designers)
  - AI familiarity: neutral to positive (use ChatGPT occasionally OR never)
- **Recruitment:** Discord communities (r/Twitch, Twitch Creator Camp), Twitter/X, direct outreach to 500–2K viewer streamers
- **Why:** Core use case for Canvas Studio; overlays + scenes are primary pain point

**Segment B: YouTube Content Creators (10 participants)**
- **Profile:** YouTubers across niches (gaming, lifestyle, education, comedy; 10K–1M subs)
- **Key criteria:**
  - Upload ≥1 video/week
  - Currently use Canva, Adobe Express, or Photoshop for thumbnails
  - Design experience: beginner to intermediate (not professionals)
  - AI comfort: exposure to Midjourney, Canva Magic, or ChatGPT
- **Recruitment:** YouTube Creator communities, Twitter, email outreach
- **Why:** Thumbnail design is core Canvas Studio workflow; testing generalizability beyond streaming

**Segment C: Non-Design-Native Multi-Format Creators (10 participants)**
- **Profile:** TikTok/Instagram/Pinterest creators, small business owners (coaches, SaaS, e-comm), digital marketers
- **Key criteria:**
  - Create visuals ≥2–3x/week (high volume, lower design skill)
  - Currently use Canva as primary tool OR struggle with manual design
  - Design background: none (self-taught Canva templates)
  - AI adoption: high (eager for time-saving tools)
- **Recruitment:** Canva communities, small business forums, LinkedIn, Slack groups
- **Why:** Tests whether canvas-first approach scales beyond streaming; identifies broader appeal

**Segment D: "Sketch-Happy" Creators (4–6 participants) — *Optional Power Users*
- **Profile:** Designers or design-curious streamers who actually sketch layouts on paper/Procreate before building
- **Key criteria:**
  - Currently spend 20+ min planning layouts (paper sketch, reference)
  - Comfortable with Figma, Procreate, or drawing tools
  - High AI comfort; open to hybrid workflows
- **Recruitment:** Designer-focused communities, Figma forums, podcasts
- **Why:** Validates whether Sketch Mode becomes a differentiator for power users

### Recruitment & Screening Criteria

**Must-Have:**
- Active creator (streams/posts ≥2x weekly)
- English-speaking, willing to screen share and think-aloud
- 18–55 years old (broad age range)
- Located in US/UK/Canada (timezone convenience for live sessions)

**Screening Survey (5 min):**
1. What platform do you create on? (Twitch, YouTube, TikTok, Instagram, other)
2. How often do you create design assets? (weekly, daily, multiple times/week)
3. What tools do you use now? (Canva, Photoshop, OBS, Adobe, other)
4. On a 1–7 scale, how comfortable are you with design tools?
5. Have you used AI tools (ChatGPT, Canva Magic, Midjourney)? 1–7 comfort level.
6. Biggest pain point in designing thumbnails/overlays/scenes?

**Stratification within each segment:**
- Design comfort: Mix beginner (1–3/7), intermediate (4–5/7), comfortable (6–7/7)
- AI comfort: Split between "new to AI" and "AI-familiar"
- Platform: 50/50 split Twitch vs non-Twitch within segments where relevant

---

## 3. RESEARCH SESSION DESIGN (90 min per participant)

### Pre-Session (5 min survey, async)
**Purpose:** Establish baseline and personalize tasks

1. **Streaming/creation setup:** Platform, frequency, audience size
2. **Current workflow:** "Walk me through how you design a thumbnail/overlay right now"
3. **Tool history:** Tools tried, why switched, frustrations
4. **AI attitude:** Ever used AI for design? Reaction? Trust level?
5. **Specific pain:** One thing you'd change about design right now?

### Session Structure (90 min, moderated, think-aloud)

**Part 1: Familiarization (15 min)**

*Moderator intro (2 min):*
"Today you'll test Canvas Studio, a new tool that lets you sketch and arrange elements on a canvas, then AI helps polish the final design. We're testing two things: (1) Is it easy to use? (2) Does it feel better than tools you use now? Think out loud—tell me what you're doing and why."

*Live demo of Canvas UI (5 min):*
- Show Placement Mode: drag badge/emote, 9-point snap, opacity, z-order
- Show Sketch Mode: pen, shapes, text, colors
- Show canvas presets (Twitch banner, YouTube thumbnail, etc.)
- Explicitly mention: "Coach and AI Polish are coming; we'll simulate those for you"

*Hands-on playground (8 min):*
- "Try placing one emote on a blank 1280×720 canvas. Move it around. Resize it."
- "Try drawing a simple rectangle and changing its color. Add text that says 'LIVE'."
- Observe: Where do they click? Do they immediately understand drag-drop? Do they try things that fail (e.g., copy-paste)?

---

**Part 2: Task-Based Testing (50 min)**

Each task is realistic and timed. Moderator observes, prompts with follow-up questions. Each task followed by a short post-task survey.

#### **Task 1: YouTube Thumbnail Design (18 min)**
**Scenario:** "You're uploading a Valorant highlights video tomorrow. Design a YouTube thumbnail (1280×720) that has your face/character, the game logo, and a headline text. Make it pop."

**Step-by-step instructions:**
1. Select YouTube Thumbnail preset
2. Add a background from the media library (or describe what you'd want)
3. Place your character/face emote in the center
4. Add the game logo to the top-left
5. Add headline text (e.g., "INSANE 1v5") in a color that stands out
6. Adjust opacity, layering, text size until it looks good

**Moderator prompts:**
- "What are you trying to do right now?"
- "Is this what you expected? Why/why not?"
- "If you got stuck, walk me through what confused you"
- Observe: Do they naturally use Sketch Mode, or only Placement Mode? Do they try copy-paste (missing feature)? Do they snap to presets?

**Post-task survey (3 min, 1–7 Likert):**
- Ease of use: "I could learn this in <10 minutes" (1=strongly disagree, 7=strongly agree)
- Clarity: "The tools were clearly labeled and I knew what each button does"
- Perceived control: "I felt in control of the layout and message"
- Confidence: "I would be confident sharing this thumbnail with my audience"
- Speed vs current tool: "This was faster than [Canva/Photoshop/current tool]" (yes/no, why?)

---

#### **Task 2: Twitch Overlay Scene Layout (18 min)**
**Scenario:** "You want to create a 'Starting Soon' screen for your Twitch stream (1920×1080). It needs: your webcam area (front-center), chat alerts on the right, a tip jar counter on the bottom-left, and a background that shows your game/vibe. Sketch it out and arrange it."

**Step-by-step:**
1. Select Twitch Offline Screen preset (1920×1080)
2. Sketch a rough rectangle for webcam area (center, ~400px wide)
3. Place a "chat alert" badge/emote on the right
4. Add a "Tip Counter" text element (custom text) on bottom-left
5. Add background image behind elements
6. Label each area with text so you know what goes where later

**Moderator prompts:**
- "Tell me why you put [element] in that location"
- "Would chat be able to see your face clearly here?" (reality check)
- "What would you change if you had a second monitor to the right?"
- Observe: Do they use Sketch Mode to draw safe zones first, or only place assets? Do they think about overlap/blocking?

**Post-task survey (3 min):**
- Ease of use: Same as Task 1
- Control: "I knew where to place elements so they don't block game/chat"
- Realism: "This layout would actually work for my stream"
- Safe zones: "Would it help to see recommended safe zones for chat/alerts overlaid on the canvas?"
- Flexibility: "Could I reuse this layout for a different game without redoing it?"

---

#### **Task 3: Sketch + Coach Refinement (14 min) — *Simulated Coach & AI Polish***
**Scenario:** "You've sketched a thumbnail (Placement + Sketch Mode). Now you show it to an AI Coach (Gemini Flash) to refine your concept. The coach gives feedback: 'Your text is hard to read on this background; try higher contrast or a text outline.' You'd then click 'Make This Pro' to hand it to Nano Banana AI, which generates a studio-quality version."

**Setup (wizard-of-oz simulation):**
- Moderator plays "Coach" role
- Show 2–3 static mockups of "before/after" AI polish (e.g., sketch thumbnail → polished, blurred background, crisp text)

**Simulated Flow:**
1. Participant finishes Tasks 1 or 2
2. Moderator says: "Now you click 'Discuss with Coach' [point to button]"
3. Moderator (as Coach): "Your text is hard to read. High-contrast colors or add a white stroke around the text. Also, your background has too much detail; it distracts from your face. Want to try a blur or darker overlay?"
4. Participant responds: "OK, I'll add a text outline" (they make edits in Canvas)
5. Moderator: "Good. Ready to hand this to AI to polish?" [Point to "Make This Pro" button]
6. Moderator shows 2 static image options: (a) AI output, or (b) "Let me refine more"
7. Participant reacts: Do they trust the AI output? Want to tweak? Ask for options?

**Key observations:**
- Do they accept coach feedback or resist?
- Do they understand the handoff to AI?
- Do they trust the AI output, or view it as "magic black box"?
- Do they want to iterate with AI, or is one round enough?

**Post-task survey (3 min):**
- Coach helpfulness: "The coach's feedback was actionable and made the design better" (1–7)
- AI trust: "I trust the AI polished version looks professional" (1–7)
- Control: "I could ask for revisions if I didn't like the AI output" (1–7 + open comment)
- Likelihood to use in real workflow: "I'd use this coach + AI polish feature for thumbnails/overlays" (1–7)
- Preference: "I prefer this coach + AI approach vs. prompt-only design tools I've seen" (yes/no/unsure, why?)

---

**Part 3: Feature Evaluation & Feedback (18 min)**

**Feature Ranking Exercises (Wizard-of-Oz Prototypes)**

Moderator presents static mockups or brief video walkthrough of 4–5 potential features. Participant ranks by impact on workflow.

**Candidate Features (test these in order of priority):**

1. **Templates / Starter Scenes**
   - *What:* Pre-made Twitch/YouTube layouts (e.g., "Minimal Gaming," "Anime Streamer," "Professional Coach")
   - *Prototype:* Show 3 example template screenshots; ask if they'd use
   - *Questions:*
     - "Would you start with a template and modify it, or prefer a blank canvas?"
     - "Do templates feel like a shortcut or a limitation?"
   - *Why test:* Determines if templates compete with or enhance canvas-first approach

2. **Safe-Zone Overlays**
   - *What:* Visual guides on canvas showing recommended areas for facecam (center), chat (right), alerts (corners); no blocking critical UI
   - *Prototype:* Show before/after screenshot with semi-transparent safe-zone rectangles overlaid
   - *Questions:*
     - "How helpful is this for designing an overlay?"
     - "Would you always see it, or toggle it off once you learn?"
   - *Why test:* Addresses streamer-specific pain point (blocking game UI)

3. **Smart Snapping to Streamer Layout Standards**
   - *What:* Canvas suggests optimal placements based on game UI maps (e.g., "Valorant HUD at 0–300px top" → snap recommendations)
   - *Prototype:* Show 2–3 game-specific layout mockups with snap guides
   - *Questions:*
     - "For your game, would suggested safe zones help you faster?"
     - "Or would that feel restrictive?"
   - *Why test:* Validates if game-specific guidance is desirable

4. **One-Click Style Packs**
   - *What:* Preset color schemes + font combos (e.g., "Neon Esports," "Minimalist," "Anime," "Retro," "Cute")
   - *Prototype:* Show same thumbnail in 4 style pack variants
   - *Questions:*
     - "Does applying a style pack across your scene save time and look cohesive?"
     - "Would you use this, or manually pick colors?"
   - *Why test:* Addresses consistency pain point (creators struggle with color/font harmony)

5. **Auto-Generated Prompt Summary for Nano Banana**
   - *What:* Canvas auto-reads your layout, text, colors, and sends a rich prompt to Nano Banana (not just "make it pro")
   - *Prototype:* Show example:
     ```
     "YouTube thumbnail, 1280×720.
     Center: Character emote at 200px.
     Top-left: Red logo, 100px.
     Text: 'INSANE CLUTCH' (white, sans-serif, 80px, center).
     Mood: high-energy, contrast-heavy, esports.
     Polish this with professional colors and lighting."
     ```
   - *Questions:*
     - "Does this feel more controllable than just clicking 'Make Pro'?"
     - "Would you edit this prompt before sending to AI?"
   - *Why test:* Determines if explicitness of AI handoff increases trust

**Ranking Exercise (5 min):**
- Moderator presents all 5 features as cards or a visual ranking tool
- Participant sorts: "Most valuable → Least valuable"
- Follow-up: "For your workflow, which 2–3 would you use weekly?"

**Open Feedback (3 min):**
- "What features or changes would make you actually use Canvas Studio instead of your current tools?"
- "What scared you or felt clunky?"
- "Did anything surprise you?"

---

### Post-Session Wrap-Up (5 min)

**Quick Overall Survey (1–7 Likert, open comments):**

1. **Ease of use:** "A 5-year-old version of me could learn this in under 10 minutes" (global ease metric)
2. **Perceived control:** "I felt in control of the layout and message"
3. **Preferred workflow:** "Canvas-first (sketch → place → polish) feels better than prompt-only tools I've tried"
4. **Adoption intent:** "I would use Canvas Studio weekly for [thumbnails/overlays/scenes]"
5. **Comparison:** "Canvas Studio is [much better / better / equal / worse / much worse] than [their current tool]"

**Open-Ended (3 min):**
- "What would make you actually switch from [current tool] to Canvas Studio?"
- "What did you like most? Least?"
- "Any questions for us?"

---

## 4. MEASUREMENT FRAMEWORK & SUCCESS CRITERIA

### Quantitative Success Metrics

| Metric | Success Threshold | Failure Signal | Analysis |
|--------|---|---|---|
| **Task Completion Rate (no moderator rescue)** | ≥80% of non-designers complete Tasks 1–2 unassisted | <65% require step-by-step prompting | Count interventions per task |
| **Ease of Use (5-yr-old test)** | Mean ≥5.5/7 (non-designers); ≥6/7 (designers) | <4.5/7 | Indicates need for onboarding or UI simplification |
| **Perceived Control** | ≥70% agree "I felt in control" (5–7/7 responses) | <50% | Signals AI may feel over-automated or opaque |
| **Coach Feedback Acceptance** | ≥75% say coach feedback "actionable and helpful" (5–7/7) | <60% | Coach tone/relevance needs refinement |
| **AI Trust** | ≥65% agree "I trust AI output" (5–7/7) | <50% | AI output quality or handoff clarity at risk |
| **Preference over Current Tool** | ≥65% say Canvas Studio is "better/much better" than current tool | <45% | Core value prop not resonating |
| **Adoption Intent** | ≥55% say "would use weekly" (5–7/7) | <40% | Fundamental workflow misalignment |
| **Feature Ranking Consensus** | Top 3 features consistent across ≥60% of participants | No clear top 3 | Unclear which additions matter most |
| **Task Time Parity** | Tasks 1–2 ≤20 min (vs. 25–35 min in Canva currently) | >25 min avg | UX friction slowing users down |

### Qualitative Success Signals

**Goal 1: Canvas UX Works**
- ✅ Participants naturally drag-drop and snap without instruction
- ✅ Placement Mode + Sketch Mode are used in complementary ways (not just one)
- ✅ Participants reference visual hierarchy and safe zones unprompted
- ❌ Participants constantly look for missing features (copy-paste, grouping) and get frustrated

**Goal 2: Coach Integration is Intuitive**
- ✅ Participants understand coach feedback and know how to apply it
- ✅ Feedback is perceived as actionable ("resize text" ≠ "make it better")
- ✅ Participants naturally iterate with coach before AI handoff
- ❌ Participants confused about when/why to use coach vs. AI
- ❌ Coach feedback is too vague or misses the mark

**Goal 3: Nano Banana Handoff is Trustworthy**
- ✅ Participants view AI output as professional/polished, not "alien"
- ✅ Participants want to preview before committing; iterate if needed
- ✅ Explicit prompt summary increases perceived control
- ❌ AI output looks generic or doesn't match the creator's intent
- ❌ Participants feel output is "magic" and unpredictable

**Goal 4: Feature Priorities are Clear**
- ✅ Safe zones, style packs, or templates are universally valued by segment
- ✅ No participant says "templates would replace canvas"
- ✅ Feature additions don't distract from core canvas workflow
- ❌ No clear consensus on which additions matter
- ❌ Participants request features that are out of scope

**Goal 5: Canvas-First is Preferred Over Prompt-Only**
- ✅ >65% explicitly say "I prefer sketching/placing to typing prompts"
- ✅ Participants mention visibility and iteration as advantages
- ✅ Participants feel more like "creators" (not "prompt writers")
- ❌ Participants gravitate toward templates and skip canvas
- ❌ Participants say "just give me a prompt tool; canvas is too slow"

---

## 5. RESEARCH SESSION SCRIPTS & INTERVIEW GUIDES

### Pre-Session Screener (Async, 5 min)
```
Welcome to Canvas Studio Research!

We're testing a new design tool for streamers and content creators.
Please answer these 6 questions to help us match you with the right test:

1. What platform do you create on? (Check all that apply)
   ☐ Twitch ☐ YouTube ☐ TikTok ☐ Instagram ☐ Other: ___

2. How often do you design graphics/thumbnails/overlays?
   ☐ Multiple times per week ☐ 1–2x/week ☐ A few times/month ☐ Rarely

3. What tool(s) do you use now? (Check all that apply)
   ☐ Canva ☐ Photoshop ☐ Adobe Express ☐ Figma ☐ OBS presets
   ☐ Paper sketch + manual layout ☐ Other: ___

4. Rate your comfort with design tools (1 = never used, 7 = expert):
   [1] [2] [3] [4] [5] [6] [7]

5. Rate your comfort with AI tools (ChatGPT, Midjourney, Canva Magic) (1 = never, 7 = daily):
   [1] [2] [3] [4] [5] [6] [7]

6. What's one thing you'd change about how you design thumbnails/overlays right now?
   [Open text]

---
```

### Session Opening Script (Moderator)
```
Thanks for being here! My name is [Name], and I'm researching Canvas Studio,
a new design tool for streamers and creators.

Here's what we're doing today (90 minutes):
1. I'll show you the tool and you'll try it hands-on.
2. You'll design a YouTube thumbnail and a Twitch overlay.
3. We'll simulate an AI coach giving you feedback and polishing your design.
4. You'll rank new features and tell me what you think.

Most importantly: **Think out loud.** Tell me what you're doing, why, and if
anything confuses you. There are no right or wrong answers—I want to hear
your honest reactions.

We're recording your screen and audio so I can review later. Everything is
confidential, and you can stop at any time. Okay?

[Wait for consent.]

Before we start, walk me through your current workflow:
- How do you design a thumbnail for your next upload right now?
- What tools do you use?
- What's the most painful part?
[Listen for 2–3 min, note specific pain points.]

Alright, let's dive in. Here's Canvas Studio...
```

### Task 1 Introduction (YouTube Thumbnail)
```
Scenario: You're uploading a Valorant highlights video tomorrow.
You need to design a YouTube thumbnail (1280×720) that has:
- Your character/face (emote or image),
- The Valorant logo,
- A bold headline text (e.g., "INSANE 1v5").

The goal is to make it eye-catching and click-worthy.

Here's a blank canvas. Start by selecting the YouTube Thumbnail preset.
I'll be here if you get stuck, but try to figure things out first.

Let me know what you're thinking as you go.
[Hit play. Observe for 15 min.]
```

### Task 2 Introduction (Twitch Overlay)
```
Scenario: You're setting up a "Starting Soon" screen for your next Twitch stream (1920×1080).
You need to design a layout that includes:
- A webcam area (where your face goes, roughly center),
- Chat alerts (right side),
- A tip jar counter (bottom-left),
- A background image that fits your vibe.

The goal is to make sure nothing important is covered and the layout feels balanced.

Here's a blank 1920×1080 canvas. Use the Placement Mode to place elements,
or the Sketch Mode to draw boxes and label them. Whatever feels natural.

Go ahead.
[Hit play. Observe for 15 min.]
```

### Task 3 Coach & AI Handoff (Simulated Interaction)
```
Great. Now imagine you've finished this thumbnail/overlay.
You click a button called "Discuss with Coach."
An AI coach (powered by Gemini Flash) reviews your design and gives feedback.

Here's the coach's feedback:
"Your text is hard to read against that background.
Try a higher-contrast color or add a white stroke around the text.
Also, your background is too busy; it's distracting from your face.
Consider blurring it or adding a semi-transparent overlay."

What do you do? Do you make changes? Ask the coach for more help?

[Let them respond or iterate.]

Once you're happy, you click "Make This Pro."
This hands your canvas to Nano Banana AI, which polishes it into a studio-quality version.

Here are two examples of what Nano Banana might produce.
[Show before/after mock-up images.]

What do you think? Does this feel like the right level of polish?
Would you use this, or iterate more with the coach?
Can you see yourself doing this in your actual workflow?
```

### Post-Task Debrief Questions (Per Task)
```
**After Task 1 (YouTube Thumbnail):**
- What were you trying to do there?
- Did anything feel confusing or not work as expected?
- Is this easier than [Canva/Photoshop/their tool]? Why or why not?
- How confident are you that this thumbnail would get clicks?

**After Task 2 (Twitch Overlay):**
- Walk me through your layout. Why did you put things there?
- If you were actually streaming, would chat see your face clearly? Would the alerts be visible?
- Could you reuse this layout for a different game?

**After Task 3 (Coach & AI Handoff):**
- Did the coach's feedback make sense? Was it helpful?
- Do you trust the AI output, or would you want more control?
- Would you change anything about this thumbnail/overlay before using it live?
- Compared to prompt-only design tools, does this feel better? Why?
```

### Feature Ranking Exercise Script
```
You've now seen Canvas Studio's core features: placing elements, sketching, and getting AI polish.

I want to show you 5 ideas we're considering adding.
For each one, I'll show you an example or description.
Then I'll ask you to rank them: which would help your workflow the most?

[Show each feature as a static mock-up or short video.]

Feature 1: Templates / Starter Scenes
[Show 3 template examples: minimal, anime, esports style]
"Would you use these as a starting point, or prefer a blank canvas?"

Feature 2: Safe-Zone Overlays
[Show canvas with semi-transparent rectangles marking recommended areas for facecam, chat, alerts]
"How helpful is this when designing an overlay?"

Feature 3: Smart Game-Specific Snapping
[Show Valorant-specific layout with recommended snap zones for HUD elements]
"For your game, would snap recommendations speed you up?"

Feature 4: One-Click Style Packs
[Show same thumbnail in "Neon Esports," "Minimalist," "Anime," "Retro" styles]
"Does this save time? Would you use it?"

Feature 5: Auto-Generated Prompt for Nano Banana
[Show a text summary that Canvas auto-creates, e.g., "YouTube thumbnail, 1280×720. Center: Character at 200px. Text: 'INSANE' (white, 80px). Mood: esports. Polish this..."]
"Does seeing what Canvas sends to AI make you more confident in the output?"

Now, sort these 5 by impact: Which would help you the most? Least?
[Use card sorting or drag-drop ranking.]
Why did you rank them that way?
Which 2–3 would you actually use every week?
```

### Close-Out Questions (5 min)
```
Last few questions:

1. Overall, how easy was this to learn? (1–7)
2. How in-control did you feel? (1–7)
3. Would you actually use Canvas Studio instead of [current tool]? Why or why not?
4. What would make you switch? What's missing?
5. Anything you'd change about the design or workflow?

Thank you for spending 90 minutes with us. Your feedback is incredibly valuable!
```

---

## 6. HYPOTHESES TO VALIDATE OR DISPROVE

### Hypothesis Set 1: Canvas UX
| Hypothesis | How to Test | Success Signal | Failure Signal |
|---|---|---|---|
| H1a: Non-designers can learn Placement Mode in <5 min without instruction | Observation + task completion | Participant drags/snaps asset without asking "how" | Participant clicks randomly or asks moderator for steps |
| H1b: Sketch Mode usage correlates with design comfort; low-comfort users skip it | Segment analysis (design comfort vs. Sketch Mode usage) | Designers and intermediate users use Sketch; beginners use only Placement | All participants ignore Sketch Mode |
| H1c: Keyboard shortcuts (arrow keys) improve speed but aren't discovered unless explicitly taught | Observation + timer | Participants who use arrow keys complete tasks faster | Participants never try arrow keys |
| H1d: "Clear All" button is never used; participants manually delete elements one-by-one | Observation | Participants manually delete or ask moderator how to start over | Participants immediately find and use "Clear All" |
| H1e: Z-index ("Send to Back") is understood intuitively and used correctly | Observation + accuracy check | Participant correctly layers elements (background behind all, foreground on top) | Participant struggles with layering or forgets to order elements |

### Hypothesis Set 2: Coach Integration
| Hypothesis | How to Test | Success Signal | Failure Signal |
|---|---|---|---|
| H2a: Creators prefer coach feedback that is specific + actionable over vague praise | Post-task survey + open feedback | Participants rate specific feedback (e.g., "increase text contrast") 6–7/7; vague feedback 3–4/7 | Specific and vague feedback rated equally |
| H2b: Coach feedback is perceived as more helpful if it references design principles (contrast, hierarchy, safe zones) vs. aesthetics alone | Design of coach prompt + qualitative feedback | Participants explain coach advice using design language ("contrast," "safe zone," "visual weight") | Participants dismiss feedback as subjective ("I don't like it") |
| H2c: Multiple coach iterations desired; one-off feedback feels incomplete | Qualitative observation | Participants want to "ask follow-up questions" or iterate with coach | Participants say one coach feedback round is enough |
| H2d: Participants trust coach more if it references their specific game/platform | A/B test coach feedback: game-agnostic vs. game-specific | Game-specific feedback rated higher (6–7/7) and triggers more edits | No difference in trust or action taken |

### Hypothesis Set 3: Nano Banana Handoff
| Hypothesis | How to Test | Success Signal | Failure Signal |
|---|---|---|---|
| H3a: AI output must be preview-able before commit; "blind handoff" feels risky | Observation + survey ("I'd want to see a preview before using this") | ≥75% want preview option; >80% say it increases trust | <50% care about preview |
| H3b: Explicit prompt summary (vs. button only) increases perceived control | A/B test 2 groups: (1) Button "Make This Pro" (2) Button + visible prompt summary | Group 2 rates AI trust and control higher (5–7/7) | No difference between groups |
| H3c: AI output is trusted more if it's visually similar to the sketch (not wildly different style) | Show 2 AI variants: (1) Polished but same style, (2) Drastically different style | Variant 1 preferred 7:1; participants want "enhancement, not reinvention" | Equal preference for both variants |
| H3d: Creators want 1–2 AI output options (not a blank slate reroll) | Open feedback during Task 3 | >60% ask "can I see other versions?" or "tweak and regenerate" | Participants say one AI output is enough |
| H3e: Trust in AI is correlated with AI familiarity (ChatGPT users = higher trust) | Correlation analysis: AI comfort from screener vs. H3 survey | r > 0.4 (moderate correlation) | r < 0.2 (no correlation; AI experience doesn't predict trust) |

### Hypothesis Set 4: Feature Priorities
| Hypothesis | How to Test | Success Signal | Failure Signal |
|---|---|---|---|
| H4a: Safe zones rank as most valuable for Twitch streamers; templates rank highest for YouTube creators | Feature ranking + segment analysis | Top 1 feature differs by platform (safe zones for Twitch, templates for YouTube) | Same feature ranks #1 across all segments |
| H4b: Templates are valued but don't cannibalize canvas use; creators want to customize templates | Ranking + qualitative feedback ("Would you use templates as starting points?") | >70% say "start with template, then customize in canvas" | >60% say "templates would replace canvas entirely" |
| H4c: Style packs are valued only by volume creators (TikTok/Instagram); Twitch/YouTube streamers skip it | Segment analysis: TikTok/Instagram vs. others | Style packs rank top-3 for TikTok segment, bottom-3 for Twitch | No segment difference |
| H4d: Auto-generated prompts perceived as controlling and educational (not threatening) | Survey + open feedback ("Does seeing the prompt make you more confident?") | >70% agree "yes, I feel more in control"; some want to edit prompt | >50% say "AI should be invisible" or "prompt seems too technical" |
| H4e: Smart snapping (game-specific layout hints) is nice-to-have but not essential | Ranking + usage observation | Snapping ranks middle (3–4 out of 5); <40% say "I'd use this weekly" | Snapping ranks top-2; >70% say essential |

### Hypothesis Set 5: Canvas vs. Prompt-Only Preference
| Hypothesis | How to Test | Success Signal | Failure Signal |
|---|---|---|---|
| H5a: >65% prefer canvas-first over prompt-only after trying both workflow concepts | Post-task survey + open feedback | 65–75% say "canvas-first is better"; cite visibility and iteration | <50% prefer canvas; majority say "prompt is faster" |
| H5b: Creators feel more creative/in-control with canvas; prompt-only feels like "black box" | Qualitative feedback ("When do you want full control vs. AI help?") | Participants cite "seeing my layout," "iterating," "adjusting before AI" as advantages | Participants say "prompting is more creative; canvas is tedious" |
| H5c: Sketch Mode usage is driven by prior design experience; non-designers view it as "nice but optional" | Design comfort (screener Q4) vs. Sketch Mode usage | Designers use Sketch 70%; non-designers use it 30% | All segments use Sketch equally |
| H5d: Canvas-first workflow is preferred for thumbnails/overlays (visual/spatial tasks); prompt might be better for text-heavy or UI mockups | Task-specific preference analysis | Canvas preference strong for Tasks 1–2 (thumbnails, overlays); neutral for other tasks | Canvas universally preferred or universally disliked regardless of task |
| H5e: Adoption intent is high (≥55% would use weekly) if Canvas Studio > current tool AND coach + AI feels intuitive | Correlation: adoption intent vs. (preference score + coach/AI trust) | High correlation (r > 0.5) between liking Canvas UX + coach trust and adoption | Adoption intent independent of these factors |

---

## 7. RESEARCH QUALITY SAFEGUARDS

### Bias Mitigation
- **Moderator Neutrality:** Don't praise/criticize participant actions. Use neutral prompts ("What are you doing?" not "Good idea; why?")
- **Task Phrasing:** Avoid leading language. "Design a thumbnail" not "Design a professional-looking thumbnail"
- **Feature Ranking:** Show features in random order each session; don't anchor on first option
- **Screener Stratification:** Ensure mix of design comfort, AI familiarity, platforms; don't oversample advanced users

### Validity
- **Triangulation:** Combine think-aloud, surveys, and observation. Don't rely solely on post-hoc surveys
- **Task Realism:** Use real scenarios (actual games, actual Twitch/YouTube specs) so feedback applies
- **Simulated Features:** Be transparent: "This is a mockup; the feature isn't built yet." Don't over-promise
- **Reproducibility:** Record all sessions; code qualitative feedback using consistent rubric (see below)

### Coding Scheme for Qualitative Feedback
```
Task Completion:
- Completed unassisted (0 moderator interventions)
- Completed with hints (1–2 clarifications)
- Completed with step-by-step guidance (3+ interventions)
- Abandoned (participant gave up)

Sentiment/Reactions:
- Positive ("That's intuitive"; "I like it")
- Neutral ("OK"; "It works")
- Negative ("Confusing"; "I'd never use this")
- Confused ("I don't understand what this button does")

Feature Feedback:
- Essential ("I'd use this weekly")
- Nice-to-have ("Would help sometimes")
- Distraction ("Unnecessary; adds clutter")
- Out-of-scope ("Cool, but I want X instead")

Workflow Preference:
- Prefers canvas ("I like seeing my layout")
- Prefers templates ("Just give me a starting point")
- Prefers prompt ("I'd rather type and let AI decide")
- Hybrid ("Canvas for mockup, then AI")
```

---

## 8. TIMELINE & LOGISTICS

### Pre-Research (Week 1)
- Finalize Canvas Studio UI and feature set for demo
- Create mockups/videos for coach feedback and AI polish (Tasks 3, features)
- Build screener survey; recruit 32–40 participants
- Prepare Zoom/screen share setup; test recording

### Fieldwork (Weeks 2–3)
- 8–10 sessions/week (4–5 per moderator)
- 90 min per session + 30 min debrief notes
- Asynchronous: Screener surveys submitted 1 day before session

### Analysis (Week 4)
- Transcribe/code all qualitative feedback (see rubric above)
- Aggregate Likert surveys; run basic correlation analysis
- Segment analysis: Do Twitch streamers differ from YouTube creators? Do designers differ from non-designers?
- Synthesis: Which hypotheses validated? Which disproved? Where's the evidence?

### Deliverables (End of Week 4)
- **Research report** (this doc + findings)
- **Metrics summary:** Success thresholds vs. actual results
- **Feature prioritization:** Ranked by impact across segments
- **Persona refinement:** Who loves Canvas Studio most? Why?
- **Spec recommendations:** What to build/fix next

---

## 9. TURNING RESEARCH INSIGHTS INTO PRODUCT SPECS

After data analysis, convert findings into:

### A. Prioritized Feature Roadmap
Based on feature ranking + segment analysis:
- **P0 (Immediate, if not launched):** Features that >65% of participants want weekly
  - e.g., Safe zones, templates, style packs
- **P1 (Next iteration):** Features <65% want but unlock new segments
  - e.g., Game-specific snapping, copy-paste
- **P2 (Future/nice-to-have):** Features for <40% or require heavy lift
  - e.g., Collaboration, animation, 3D assets

### B. UX Refinements (If Canvas UX Fails)
If task completion <80% or ease-of-use <4.5/7:
- Simplify onboarding: interactive tutorial vs. static buttons
- Redesign labeling: field test new button names with next cohort
- Hide advanced features by default (e.g., stroke, opacity) until user asks
- Add contextual help: tooltips or "?" buttons for each tool

### C. Coach + AI Handoff Specifications
Based on Task 3 insights:
- **Coach prompt engineering:** What makes feedback actionable? Test language ("Increase contrast to X:Y ratio" vs. "Your text is hard to read")
- **AI preview options:** User wants 1–2 alternate polishes before committing? Build variant selection
- **Iterative refinement:** Can coach + AI loop multiple times, or is one round intended?
- **Metadata passing:** What canvas data does Nano Banana need? (layers, text, colors, mood) Test auto-generated prompt format
- **Transparency:** Show AI confidence scores? Explain choices? ("High-contrast colors chosen for CTR optimization")

### D. Segment-Specific Experiences
Based on segment analysis:
- **Twitch streamers:** Lead with safe zones, overlay templates, game-specific layouts
- **YouTube creators:** Lead with thumbnail templates, style packs, one-click polish
- **Lifestyle/TikTok creators:** Lead with fast templates, trend-aware style packs, bulk operations
- **Sketch-happy designers:** Expose Sketch Mode prominently; safe complex layer management

### E. Success Metrics for Post-Launch
- **DAU/MAU:** % users returning weekly (target: >40% weekly)
- **Core task time:** Avg thumbnail/overlay time ≤15 min (vs. Canva baseline)
- **Coach + AI adoption:** % using "Discuss with Coach" or "Make This Pro" features (target: >60%)
- **NPS/CSAT:** Overall satisfaction 7+/10 (target: >65%)
- **Retention:** % active after 7, 30, 90 days (target: >50%, >30%, >15%)

---

## APPENDIX: Wizard-of-Oz Implementation Notes

Since Canvas Studio is still in development, we'll simulate missing features:

### Coach Integration (Task 3)
**Setup:**
- Use GPT-4 or Claude to generate realistic coach feedback based on participant's exported canvas
- Coach voice: "You" (friendly, expert, game-aware)
- Feedback format: 2–3 actionable points, reference design principles, cite specific changes

**Example Coach Prompt:**
```
You are an expert Twitch overlay designer and the AI coach for Canvas Studio.
A creator just shared a thumbnail they designed in Canvas Studio.
They used the Twitch Offline preset (1920×1080).
They placed their facecam center, chat alerts right, and a background behind.

Provide 2–3 specific, actionable feedback points.
Reference design principles like safe zones, contrast, or visual hierarchy.
Suggest concrete changes (e.g., "move chat box 20px lower" or "add a 50% opacity overlay on background").
Be encouraging and create urgency to polish.

Creator's canvas:
- Facecam rect (center, 400px wide)
- Chat alert badge (right, overlapping game HUD area)
- Background (busy esports stadium image, hard to read text)
- Text: "LIVE" (gray, small, hard to see)

Feedback:
---
```

### Nano Banana Handoff (Task 3)
**Setup:**
- Use Figma mockups or Photoshop comps showing "before" (canvas sketch) and "after" (AI polish)
- Variants: 2 polish styles (e.g., "bold/contrast-heavy" and "minimal/refined")
- Show realistic examples of Nano Banana's style (crisp, professional, maintains layout)

**Example Mock-Up Brief:**
```
Canvas sketch:
- Simple rectangle facecam area, chat badge, background
- Plain white "LIVE" text
- Muted colors

Nano Banana Polish #1 (High-Contrast Esports):
- Facecam area has bold neon border
- Text has glowing shadow, high contrast
- Background sharpened, color-graded for "esports energy"
- Chat badge has depth/shadow

Nano Banana Polish #2 (Minimal/Professional):
- Subtle border around facecam
- Text refined, better kerning
- Background softly blurred, de-emphasized
- Clean, minimal aesthetic
```

Show both; ask participant which feels right.

---

## SUMMARY: Success Looks Like This

If this research succeeds, we'll have evidence that:

1. **Canvas-first is learnable and preferable.** ≥80% of non-designers can create a thumbnail/overlay without handholding. ≥65% prefer canvas-first to prompt-only tools they've tried. Mean ease-of-use ≥5.5/7.

2. **Coach + AI pipeline is intuitive.** ≥75% understand coach feedback and apply it. ≥65% trust AI output and would use it in real workflow. ≥60% say AI preview + iterative refinement increases confidence.

3. **Clear feature priorities emerge.** Safe zones for Twitch, templates for YouTube, style packs for volume creators. No single "must have" across all segments, but clear Pareto wins.

4. **Adoption is probable.** ≥55% say they'd use Canvas Studio weekly if it existed. This signals enough value to justify building and marketing.

5. **Known gaps are exposed.** Copy-paste, grouping, rotation, video/GIF support, mobile app—these become features to spec next.

**If research fails (red flags):**
- Task completion <65% → UX is too hard; redesign fundamentals
- Ease-of-use <4/7 → Beginner cognitive load too high; simplify or teach better
- Adoption intent <40% → Value prop isn't resonating; may need different positioning or features
- "Just give me templates" is dominant feedback → Prompt-only tools may be more desirable; rethink thesis
- Coach feedback seen as "random" or "unhelpful" → Integration design is off; go back to discovery

---

**This research plan is designed to be executed with real users over 2–3 weeks, using scrappy prototypes and Wizard-of-Oz simulation where needed. The goal is hypothesis validation (not polish) and actionable product insights that inform the next build cycle.**
