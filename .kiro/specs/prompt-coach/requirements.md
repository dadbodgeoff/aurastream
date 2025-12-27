# Prompt Coach - Requirements Document

## Introduction

A **hybrid context-first chat** that helps Premium users craft effective prompts for asset generation. Users first select their context (brand kit, asset type, game, mood) through a structured UI, then chat with the AI which already has full context pre-loaded. This minimizes API calls while enabling natural conversation for refinement.

**Key Principle:** Pre-load all context client-side → Send rich first message → Chat for refinement.

Free and Pro users receive static tips and best practices instead of the full conversational coach.

## Glossary

- **Prompt_Coach**: The conversational AI service that helps users refine their generation prompts (Premium only)
- **Coach_Session**: A single conversation session with pre-loaded context (max 10 turns)
- **Pre_Loaded_Context**: Brand kit, asset type, game, mood captured client-side before first API call
- **Grounding_Service**: Web search service for fetching real-time context (LLM-triggered)
- **Static_Tips**: Curated prompt tips for Free/Pro users
- **Output_Validator**: Service that validates prompts before generation
- **Refinement_History**: Tracked prompt versions for iterative refinement

## Architecture Principles

1. **Context-First**: Capture all context client-side before any API call
2. **Single Rich Request**: First API call includes full context + user description
3. **Premium Only**: Full coach is Premium; Free/Pro get static tips
4. **LLM Self-Assessment**: AI decides if it needs web search (prevents hallucination)
5. **Streaming Responses**: Token-by-token delivery for better UX
6. **Validation Built-In**: Every prompt suggestion is validated before display

## Requirements

### Requirement 1: Context-First Session Start

**User Story:** As a user, I want to select my brand kit, asset type, game, and mood before chatting, so that the AI already knows my context and can give relevant suggestions immediately.

#### Acceptance Criteria

1. THE client SHALL capture all context before the first API call: brand_kit, asset_type, game, mood, description
2. THE first API call SHALL include the complete Pre_Loaded_Context in a single request
3. THE System SHALL NOT require separate "start session" and "send message" calls
4. THE brand kit context SHALL be sent FROM the client (already loaded), not fetched by backend
5. THE System SHALL build the AI system prompt with all context pre-injected
6. THE first response SHALL include a prompt suggestion based on the full context
7. THE context capture UI SHALL include: brand kit selector, asset type buttons, game selector, mood selector, description textarea

### Requirement 2: Iterative Refinement

**User Story:** As a user, I want to refine prompts by saying things like "make it brighter" or "more dynamic", so that I can iterate without starting over.

#### Acceptance Criteria

1. THE System SHALL track all prompt suggestions in Refinement_History with version numbers
2. WHEN user sends a refinement request, THE AI SHALL modify the PREVIOUS suggestion
3. THE AI SHALL explain what changed from the previous version
4. THE System SHALL detect refinement keywords: "make it", "more", "less", "brighter", "darker", "bolder"
5. THE Refinement_History SHALL be included in the AI system prompt for context
6. THE System SHALL support reverting to previous prompt versions

### Requirement 3: Output Validation

**User Story:** As a user, I want to know if my prompt will work before I try to generate, so that I don't waste generation credits on broken prompts.

#### Acceptance Criteria

1. THE Output_Validator SHALL validate every prompt suggestion before display
2. THE validation SHALL check for: missing required elements, conflicting terms, brand alignment
3. THE validation SHALL return: is_valid, is_generation_ready, quality_score (0-1), issues list
4. EACH issue SHALL include: severity (error/warning/info), code, message, suggestion
5. THE quality_score SHALL be calculated as: 1.0 - (errors * 0.3) - (warnings * 0.1)
6. THE validation result SHALL be included in the streaming response after the prompt

### Requirement 4: Intelligent Grounding (LLM Self-Assessment)

**User Story:** As a user, I want the Prompt Coach to know about current game seasons and events when needed, without unnecessary searches that slow down responses.

#### Acceptance Criteria

1. THE Grounding_Service SHALL use LLM self-assessment to decide if web search is needed
2. THE LLM SHALL assess: "Can I answer this confidently, or might I hallucinate?"
3. IF confidence is LOW or knowledge_cutoff_issue is TRUE, THEN THE System SHALL trigger web search
4. IF confidence is HIGH, THE System SHALL answer directly without search
5. THE System SHALL skip assessment for obvious cases (refinements, confirmations)
6. THE Grounding_Service SHALL cache search results with 24-hour TTL
7. THE Grounding_Service SHALL only search pre-approved domains (game wikis, official sites)
8. Grounding SHALL be available only to Premium users

### Requirement 5: Premium Access Control

**User Story:** As a platform owner, I want the full Prompt Coach to be Premium-only, so that it drives subscription upgrades while Free/Pro users still get value from static tips.

#### Acceptance Criteria

1. THE full Prompt_Coach (conversational AI) SHALL be available only to Premium tier users
2. Free and Pro users SHALL receive Static_Tips instead of conversational coach
3. WHEN a non-Premium user accesses coach endpoints, THE System SHALL return upgrade_required error
4. THE Static_Tips SHALL be curated best practices for each asset type
5. THE Static_Tips response SHALL include an upgrade CTA with feature highlights
6. THE System SHALL check tier on every coach API call

### Requirement 6: Conversation Flow

**User Story:** As a user, I want a natural conversation flow that helps me refine my prompt iteratively, so that I can articulate what I want without being a prompt expert.

#### Acceptance Criteria

1. WHEN a session starts, THE Prompt_Coach SHALL greet the user and ask about their asset goal
2. THE Prompt_Coach SHALL ask clarifying questions to understand: subject, style, mood, context
3. THE Prompt_Coach SHALL incorporate the user's Brand Kit data into suggestions
4. WHEN the user is satisfied, THE Prompt_Coach SHALL output a final engineered prompt
5. THE Prompt_Coach SHALL offer to refine the prompt if the user wants changes
6. THE Prompt_Coach SHALL summarize the final prompt before session end
7. THE conversation SHALL follow a guided flow: Goal → Context → Style → Refinement → Output

### Requirement 7: Brand Kit Integration

**User Story:** As a user, I want the Prompt Coach to know my brand identity, so that suggested prompts align with my established style.

#### Acceptance Criteria

1. WHEN a session starts with a brand_kit_id, THE Prompt_Coach SHALL load the brand kit data
2. THE Prompt_Coach SHALL reference brand colors, fonts, and tone in suggestions
3. THE Prompt_Coach SHALL suggest prompts that align with the brand's voice settings
4. IF no brand kit is provided, THE Prompt_Coach SHALL ask about preferred style/colors
5. THE Prompt_Coach SHALL NOT require a brand kit to function (graceful degradation)

### Requirement 8: Prompt Output Format

**User Story:** As a pipeline developer, I want the Prompt Coach to output prompts in a standard format, so that any pipeline can consume them consistently.

#### Acceptance Criteria

1. THE Prompt_Output SHALL include: final_prompt (string), confidence_score (0-1), metadata (dict)
2. THE Prompt_Output metadata SHALL include: session_id, turns_used, grounding_used, tokens_consumed
3. THE Prompt_Output SHALL be serializable to JSON
4. THE Prompt_Output SHALL include suggested asset_type if not specified by user
5. THE Prompt_Output SHALL include extracted keywords for the generation pipeline
6. THE Prompt_Output SHALL be validated against a schema before return

### Requirement 9: Session Management

**User Story:** As a user, I want my conversation to persist within a session, so that I can refine my prompt across multiple messages.

#### Acceptance Criteria

1. THE System SHALL create a unique session_id for each coach conversation
2. THE System SHALL store session state in a fast cache (Redis) with TTL
3. THE session TTL SHALL be 30 minutes of inactivity
4. WHEN a session expires, THE System SHALL return a session_expired error
5. THE System SHALL allow users to explicitly end a session and get the final prompt
6. THE System SHALL support resuming a session by session_id within TTL

### Requirement 10: Analytics and Observability

**User Story:** As a platform owner, I want to track Prompt Coach usage and effectiveness, so that I can optimize the feature and understand costs.

#### Acceptance Criteria

1. THE System SHALL log: session_id, user_id, pipeline_id, turns, tokens_in, tokens_out, grounding_calls
2. THE System SHALL track: sessions_started, sessions_completed, sessions_abandoned
3. THE System SHALL track: prompts_generated, prompts_used_for_generation
4. THE System SHALL calculate: avg_turns_to_completion, avg_tokens_per_session
5. THE System SHALL expose metrics via a standard endpoint for monitoring
6. THE System SHALL NOT log the actual prompt content (privacy)

### Requirement 11: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and what to do next.

#### Acceptance Criteria

1. WHEN the AI service is unavailable, THE System SHALL return a service_unavailable error with retry guidance
2. WHEN rate limit is exceeded, THE System SHALL return rate_limit_exceeded with reset_at timestamp
3. WHEN session expires, THE System SHALL return session_expired with option to start new session
4. WHEN content is blocked, THE System SHALL return content_blocked with generic reason
5. WHEN grounding fails, THE System SHALL continue without grounding and note it in response
6. ALL errors SHALL include: error_code, message, details, suggested_action

### Requirement 12: Security and Privacy

**User Story:** As a platform owner, I want the Prompt Coach to be secure and respect user privacy, so that we maintain trust and compliance.

#### Acceptance Criteria

1. THE System SHALL require authentication for all coach endpoints
2. THE System SHALL validate user owns the brand_kit_id if provided
3. THE System SHALL sanitize all user input before sending to AI
4. THE System SHALL NOT store conversation content after session ends
5. THE System SHALL NOT use conversation data for AI training
6. THE System SHALL enforce HTTPS for all communications
7. THE System SHALL implement request signing for internal service calls

