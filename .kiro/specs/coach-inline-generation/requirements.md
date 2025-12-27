# Coach Inline Generation Requirements

## Overview
Enable asset generation directly within the Prompt Coach chat window, allowing users to see their generated assets inline without leaving the coach experience.

## User Story
As a Studio tier user, when I finish refining my prompt with the coach and click "Generate Now", I want the asset to be generated and displayed directly in the chat window so I can download it immediately and continue the conversation if needed.

## Functional Requirements

### FR-1: Inline Generation Trigger
- When user clicks "Generate Now" in coach chat, trigger generation API call
- Do NOT redirect to assets page
- Show generation progress in the chat window

### FR-2: Asset Display in Chat
- Display generated asset as a chat message from the coach
- Include download button on the asset
- Show asset thumbnail with full-size preview on click

### FR-3: Asset Library Integration
- Generated assets are automatically saved to user's asset library
- Asset is linked to the coach session for reference

### FR-4: Session Persistence
- Coach sessions are persisted to database (not just Redis)
- Users can recall previous coach conversations
- Session includes: messages, generated assets, brand context

### FR-5: Generation Status
- Show real-time progress: "Generating your asset..." with spinner
- Handle errors gracefully with retry option
- Show success state with the generated image

## Technical Requirements

### Backend Changes
1. New endpoint: `POST /api/v1/coach/sessions/{id}/generate`
   - Triggers generation using session's refined prompt
   - Returns job_id for polling
   - Links generated asset to session

2. New table: `coach_sessions` (PostgreSQL)
   - Persist sessions beyond Redis TTL
   - Store messages, assets, brand context

3. Update coach service to save sessions to DB

### Frontend Changes
1. Update `CoachChat` component:
   - Replace redirect with inline generation
   - Add asset message type
   - Add generation progress UI

2. New `CoachAssetMessage` component:
   - Display generated asset in chat
   - Download button
   - Link to full asset page

3. Update `useCoachChat` hook:
   - Add `generateAsset()` function
   - Poll for job completion
   - Handle asset display

## Out of Scope
- Multiple asset generation in single session
- Asset editing within coach
- Sharing coach sessions
