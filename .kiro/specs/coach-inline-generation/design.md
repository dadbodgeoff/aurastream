# Coach Inline Generation - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     COACH CHAT UI                               │
│  - Messages (user + coach)                                      │
│  - "Generate Now" button → triggers inline generation           │
│  - Asset message with download                                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              POST /api/v1/coach/sessions/{id}/generate          │
│  - Validates session ownership                                  │
│  - Creates generation job with session's refined prompt         │
│  - Returns job_id for polling                                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GENERATION WORKER                            │
│  - Processes job via Nano Banana API                            │
│  - Uploads to storage                                           │
│  - Creates asset record                                         │
│  - Links asset to coach session                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Table: coach_sessions
```sql
CREATE TABLE coach_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_kit_id UUID REFERENCES brand_kits(id) ON DELETE SET NULL,
    asset_type TEXT NOT NULL,
    mood TEXT,
    game_context TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
    turns_used INTEGER DEFAULT 0,
    current_prompt TEXT,
    messages JSONB DEFAULT '[]',
    generated_asset_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX idx_coach_sessions_user_id ON coach_sessions(user_id);
CREATE INDEX idx_coach_sessions_status ON coach_sessions(status);
```

### Update assets table
```sql
ALTER TABLE assets ADD COLUMN coach_session_id UUID REFERENCES coach_sessions(id) ON DELETE SET NULL;
CREATE INDEX idx_assets_coach_session ON assets(coach_session_id);
```

## API Design

### POST /api/v1/coach/sessions/{session_id}/generate

**Request:**
```json
{
  "brand_kit_id": "uuid | null",
  "include_logo": false,
  "logo_type": "primary",
  "logo_position": "bottom-right"
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "message": "Generation started"
}
```

### GET /api/v1/coach/sessions/{session_id}/assets

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "url": "https://...",
      "asset_type": "twitch_emote",
      "width": 112,
      "height": 112,
      "created_at": "2025-12-27T..."
    }
  ]
}
```

### GET /api/v1/coach/sessions (List user's sessions)

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "asset_type": "twitch_emote",
      "mood": "hype",
      "status": "ended",
      "turns_used": 4,
      "current_prompt": "Victory celebration...",
      "has_assets": true,
      "created_at": "2025-12-27T...",
      "ended_at": "2025-12-27T..."
    }
  ],
  "total": 10
}
```

## Frontend Components

### Updated CoachChat Flow
```typescript
// useCoachChat hook additions
interface UseCoachChatReturn {
  // ... existing
  generateAsset: (options?: GenerateOptions) => Promise<void>;
  generationStatus: 'idle' | 'generating' | 'completed' | 'failed';
  generatedAsset: Asset | null;
}

// New message type
interface CoachAssetMessage {
  id: string;
  type: 'asset';
  asset: {
    id: string;
    url: string;
    width: number;
    height: number;
  };
  timestamp: number;
}
```

### CoachAssetMessage Component
```tsx
function CoachAssetMessage({ asset }: { asset: Asset }) {
  return (
    <div className="coach-asset-message">
      <img src={asset.url} alt="Generated asset" />
      <div className="actions">
        <button onClick={() => downloadAsset(asset)}>
          Download
        </button>
        <Link href={`/dashboard/assets/${asset.id}`}>
          View in Library
        </Link>
      </div>
    </div>
  );
}
```

## Implementation Plan

### Phase 1: Backend (Priority)
1. Create migration for coach_sessions table
2. Update session manager to persist to PostgreSQL
3. Add generate endpoint to coach routes
4. Link assets to coach sessions

### Phase 2: Frontend
1. Update useCoachChat hook with generation
2. Add CoachAssetMessage component
3. Update CoachChat to handle asset messages
4. Add generation progress UI

### Phase 3: Session History
1. Add sessions list endpoint
2. Create session history UI
3. Allow recalling past sessions
