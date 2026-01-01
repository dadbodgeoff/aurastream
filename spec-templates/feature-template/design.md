# Design Document: [Feature Name]

## Overview

[1-2 paragraphs summarizing the technical approach. What are we building and how does it fit into the existing system?]

Example:
> This design document outlines the technical architecture for implementing a real-time notification system. The implementation uses WebSocket connections for real-time delivery, with a fallback to polling for unsupported browsers. The system integrates with the existing authentication layer and follows the established patterns for API routes and React hooks.

## Architecture

### System Architecture

Use ASCII diagrams to show how components interact. This gives AI clear context about the system structure.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ NotificationBell│  │NotificationPanel│  │ NotificationItem│ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │          │
│           └────────────────────┼────────────────────┘          │
│                                │                               │
│  ┌─────────────────────────────┴─────────────────────────────┐ │
│  │              useNotifications Hook                         │ │
│  │  - Manages WebSocket connection                            │ │
│  │  - Provides notification state                             │ │
│  │  - Handles mark as read                                    │ │
│  └─────────────────────────────┬─────────────────────────────┘ │
└────────────────────────────────┼───────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  WebSocket: /ws/notifications                                   │
│  REST: GET /api/v1/notifications                                │
│  REST: POST /api/v1/notifications/{id}/read                     │
│  REST: POST /api/v1/notifications/read-all                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  notification_service.py                                        │
│  - create_notification()                                        │
│  - get_user_notifications()                                     │
│  - mark_as_read()                                               │
│  - broadcast_to_user()                                          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL: notifications table                                │
│  Redis: active WebSocket connections, unread counts             │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Graph

Show how components depend on each other:

```
useAuth (existing)
    │
    └──► useNotifications
             │
             ├──► NotificationBell
             │
             └──► NotificationPanel
                      │
                      └──► NotificationItem
```

## Components

### 1. ComponentName

Describe the component's purpose and interface.

```typescript
interface ComponentNameProps {
  /** Description of prop */
  propName: PropType;
  /** Description of prop */
  anotherProp?: OptionalType;
  /** Callback description */
  onAction: (param: ParamType) => void;
}
```

**Behavior:**
- Bullet points describing key behaviors
- Include state transitions
- Note any side effects

### 2. AnotherComponent

```typescript
interface AnotherComponentProps {
  // ...
}
```

**Behavior:**
- ...

## Hooks

### 1. useHookName

Describe what the hook does and its return type.

```typescript
interface HookNameState {
  /** Description */
  property: Type;
  /** Description */
  anotherProperty: Type;
}

interface UseHookNameOptions {
  /** Description */
  option?: Type;
}

function useHookName(options?: UseHookNameOptions): HookNameState;
```

**Implementation Notes:**
- Key implementation details
- Edge cases to handle
- Performance considerations

## Data Models

### Database Schema

```sql
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  field_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_user ON table_name(user_id);
```

### TypeScript Types

```typescript
// Backend (snake_case)
interface BackendModel {
  id: string;
  user_id: string;
  field_name: string;
  created_at: string;
}

// Frontend (camelCase)
interface FrontendModel {
  id: string;
  userId: string;
  fieldName: string;
  createdAt: string;
}
```

## API Endpoints

### GET /api/v1/resource

**Request:**
```
Headers:
  Authorization: Bearer {token}

Query Parameters:
  limit: number (default: 20, max: 100)
  offset: number (default: 0)
```

**Response:**
```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

### POST /api/v1/resource

**Request:**
```json
{
  "field_name": "value"
}
```

**Response:**
```json
{
  "id": "uuid",
  "field_name": "value",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Correctness Properties

Define invariants that must always hold true. These become test assertions.

### P1: Property Name
- Description of what must always be true
- Example: "Unread count MUST equal the number of notifications where read_at IS NULL"

### P2: Property Name
- Description of what must always be true

### P3: Property Name
- Description of what must always be true

## Error Handling

| Error Code | HTTP Status | Description | User Message |
|------------|-------------|-------------|--------------|
| RESOURCE_NOT_FOUND | 404 | Resource doesn't exist | "Item not found" |
| UNAUTHORIZED | 401 | Not authenticated | "Please log in" |
| RATE_LIMITED | 429 | Too many requests | "Please wait before trying again" |

## File Structure

```
backend/
├── api/
│   ├── routes/feature_name.py
│   └── schemas/feature_name.py
├── services/
│   └── feature_name_service.py
└── database/
    └── migrations/XXX_feature_name.sql

tsx/
├── packages/
│   └── api-client/
│       └── src/
│           ├── hooks/useFeatureName.ts
│           └── types/featureName.ts
└── apps/
    └── web/
        └── src/
            └── components/
                └── feature-name/
                    ├── ComponentOne.tsx
                    └── ComponentTwo.tsx
```

## Testing Strategy

### Unit Tests
- What to test at the unit level
- Mock strategies

### Integration Tests
- What flows to test end-to-end
- Test data setup

### Property Tests (Hypothesis)
- What properties to verify with property-based testing

---

## Tips for Writing Good Design Docs

1. **Show the architecture visually** - ASCII diagrams are AI-friendly
2. **Define interfaces explicitly** - TypeScript interfaces are unambiguous
3. **Include both backend and frontend** - full stack context prevents drift
4. **Specify file locations** - AI knows exactly where to create files
5. **Define correctness properties** - these become your test assertions
