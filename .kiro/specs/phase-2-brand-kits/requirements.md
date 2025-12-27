# Phase 2: Brand Kit Management — Requirements

## Overview

Phase 2 implements the Brand Kit system for Streamer Studio, enabling creators to define, manage, and apply consistent branding across all generated assets. This phase builds upon the authentication foundation from Phase 1.

**Master Schema Reference:** `.kiro/specs/streamer-studio-master-schema/`
**Phase Duration:** Week 3
**Dependencies:** Phase 1 Authentication (COMPLETE ✅)

---

## Requirement 2: Brand Kit Management

**User Story:** As a creator, I want to create and manage my brand kit, so that all generated assets maintain consistent branding.

### Acceptance Criteria

1. WHEN a user uploads 3-5 stream clips or images, THE Brand_Analyzer SHALL extract dominant colors (5-7), typography styles, and design tone
2. WHEN brand analysis completes, THE Brand_Kit_Builder SHALL generate a structured brand kit JSON with colors, fonts, logo_url, and tone
3. WHEN a user manually edits brand kit values, THE Brand_Kit_System SHALL persist changes and apply to future generations
4. THE Brand_Kit SHALL contain: primary_colors (array), accent_colors (array), fonts (headline, body), logo_url (string), tone (enum), style_reference (string)
5. WHEN generating assets, THE Generation_System SHALL auto-apply the user's active brand kit unless overridden
6. WHEN a user has no brand kit, THE System SHALL use default templates until one is created
7. FOR ALL brand kit operations, THE System SHALL validate color values as valid hex codes
8. FOR ALL brand kit operations, THE System SHALL validate font names against supported font list

---

## Canonical Data Model

### BrandKit Model (from Master Schema)
```typescript
interface BrandKit {
  id: string;                    // UUID, primary key
  user_id: string;               // FK to User
  name: string;                  // 1-100 chars
  is_active: boolean;            // Only one active per user
  primary_colors: string[];      // 1-5 hex codes, e.g., ["#FF0000", "#1E90FF"]
  accent_colors: string[];       // 0-3 hex codes
  fonts: {
    headline: string;            // Font family name
    body: string;                // Font family name
  };
  logo_url: string | null;       // CDN URL
  tone: 'competitive' | 'casual' | 'educational' | 'comedic' | 'professional';
  style_reference: string;       // Free text description
  extracted_from: string | null; // Source clips/images used for extraction
  created_at: string;
  updated_at: string;
}
```

---

## API Contracts (from Master Schema)

### Brand Kit Endpoints
```
GET    /api/v1/brand-kits           # List user's brand kits
POST   /api/v1/brand-kits           # Create brand kit
GET    /api/v1/brand-kits/{id}      # Get brand kit
PUT    /api/v1/brand-kits/{id}      # Update brand kit
DELETE /api/v1/brand-kits/{id}      # Delete brand kit
POST   /api/v1/brand-kits/{id}/activate  # Set as active
POST   /api/v1/brand-kits/analyze   # Extract brand kit from uploads
```

### Response Envelope
```typescript
interface ApiResponse<T> {
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
  };
}
```

---

## Validation Rules

### Hex Color Validation
- Pattern: `^#[0-9A-Fa-f]{6}$`
- Must include `#` prefix
- Case-insensitive (normalize to uppercase)

### Color Array Bounds
- `primary_colors`: 1-5 elements (required)
- `accent_colors`: 0-3 elements (optional)

### Supported Fonts
```python
SUPPORTED_FONTS = [
    'Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Poppins',
    'Lato', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
    'Merriweather', 'Source Sans Pro', 'Ubuntu', 'Rubik', 'Work Sans',
    'Fira Sans', 'Barlow', 'Quicksand', 'Karla', 'Mulish'
]
```

### Tone Values
```python
VALID_TONES = ['competitive', 'casual', 'educational', 'comedic', 'professional']
```

### Name Constraints
- Minimum: 1 character
- Maximum: 100 characters
- Trimmed of leading/trailing whitespace

### Style Reference
- Maximum: 500 characters
- Optional field

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_HEX_COLOR` | 422 | Invalid hex color format |
| `VALIDATION_FONT_UNSUPPORTED` | 422 | Font not in supported list |
| `VALIDATION_COLOR_ARRAY_BOUNDS` | 422 | Color array outside valid bounds |
| `VALIDATION_FAILED` | 422 | General validation failure |
| `RESOURCE_NOT_FOUND` | 404 | Brand kit not found |
| `AUTHZ_RESOURCE_FORBIDDEN` | 403 | User doesn't own this brand kit |
| `BRAND_KIT_LIMIT_EXCEEDED` | 403 | Maximum brand kits reached (10 per user) |

---

## Property Tests Required

### Property 4: Hex Color Validation
*For any* string, the hex color validator SHALL return True only for valid 6-digit hex codes (with #).

### Property 5: Brand Kit Serialization Round-Trip
*For any* valid BrandKit object, serializing to JSON then deserializing SHALL produce an equivalent object.

### Property 6: Brand Kit Color Array Bounds
*For any* valid BrandKit, primary_colors SHALL have 1-5 elements and accent_colors SHALL have 0-3 elements.

---

## Unit Tests Required

### Brand Kit Service Tests
- Create brand kit with valid data
- Create brand kit with invalid hex colors (expect 422)
- Create brand kit with unsupported fonts (expect 422)
- Create brand kit with too many primary colors (expect 422)
- Update brand kit
- Delete brand kit
- Get brand kit by ID
- List brand kits for user
- Activate brand kit (deactivates others)
- Brand kit not found (expect 404)
- Unauthorized access (expect 403)

### Brand Kit Extraction Tests
- Extract colors from valid images
- Extract with insufficient images (expect 422)
- Extract with invalid file types (expect 422)

---

## Integration Tests Required

1. Upload images → Extract colors → Create brand kit
2. Create brand kit → Activate → Verify is_active state
3. Create multiple brand kits → Activate one → Verify only one active
4. Full CRUD cycle: Create → Read → Update → Delete

---

## E2E Tests Required

1. Create brand kit → Set active → Verify in generation context (Phase 3)
2. Manual brand kit creation flow (web)
3. Brand kit extraction flow (web)

---

## Platform Implementation Requirements

### Backend (FastAPI)
- Brand kit service with CRUD operations
- Brand kit validation (Pydantic schemas)
- Brand kit extraction service (Vision AI integration)
- Database operations (Supabase)

### TSX (Next.js + React Native)
- Brand kit list view
- Brand kit editor component
- Color picker integration
- Font selector
- Logo upload
- Brand kit hooks (TanStack Query)

### Swift (iOS)
- Brand kit list view
- Brand kit editor view
- Color picker
- Font selector
- Brand kit view model

---

## Verification Gate 2 Checklist

### Property Tests
- [ ] Property 4: Hex Color Validation — PASS
- [ ] Property 5: Brand Kit Serialization Round-Trip — PASS
- [ ] Property 6: Brand Kit Color Array Bounds — PASS
- [ ] All properties run 100+ iterations — PASS

### Unit Tests
- [ ] All brand kit endpoints tested — PASS
- [ ] All service functions tested — PASS
- [ ] Coverage >= 80% — PASS

### Integration Tests
- [ ] Upload → Extract → Create brand kit — PASS
- [ ] Create → Activate → Verify state — PASS

### E2E Tests
- [ ] Create brand kit → Set active → Verify in generation context — PASS

### Platform Verification
- [ ] TSX web: Brand kit UI functional
- [ ] TSX mobile: Brand kit UI functional
- [ ] Swift: Brand kit UI functional

### Sign-off
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Ready to proceed to Phase 3
