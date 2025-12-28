# Community Gallery — Requirements

## Overview

The Community Gallery enables AuraStream users to share their generated assets publicly, discover inspiration from other creators, and engage through likes and comments. This creates a social layer that drives engagement, showcases platform capabilities, and provides prompt inspiration for new users.

**Master Schema Reference:** `.kiro/steering/AURASTREAM_MASTER_SCHEMA.md`
**Phase Duration:** Week 7-8
**Dependencies:** Phase 3 Asset Generation (COMPLETE ✅), Phase 1 Authentication (COMPLETE ✅)

---

## Functional Requirements

### 7.1 Community Posts
- FR-7.1.1: Users can share any owned asset to the community gallery
- FR-7.1.2: Posts include: asset, title, description, prompt used (optional), tags
- FR-7.1.3: Users can edit their own posts (title, description, tags)
- FR-7.1.4: Users can delete their own posts
- FR-7.1.5: Posts display creator avatar, display name, and creation date
- FR-7.1.6: Posts can be marked as "featured" by admins (spotlight section)
- FR-7.1.7: Users can toggle prompt visibility (show/hide prompt used)

### 7.2 Discovery & Feed
- FR-7.2.1: Public gallery feed with infinite scroll pagination
- FR-7.2.2: Sort options: trending, recent, most liked
- FR-7.2.3: Filter by asset type (emote, banner, overlay, thumbnail, etc.)
- FR-7.2.4: Filter by tags (user-defined and system tags)
- FR-7.2.5: Search by title, description, or creator name
- FR-7.2.6: Featured/Spotlight section at top (admin-curated)
- FR-7.2.7: "More Inspiration" masonry grid below spotlight

### 7.3 Engagement - Likes
- FR-7.3.1: Authenticated users can like/unlike posts
- FR-7.3.2: Like count displayed on each post
- FR-7.3.3: Users can view their liked posts
- FR-7.3.4: One like per user per post (idempotent)
- FR-7.3.5: Optimistic UI updates for like/unlike

### 7.4 Engagement - Comments
- FR-7.4.1: Authenticated users can comment on posts
- FR-7.4.2: Comments display author avatar, name, timestamp
- FR-7.4.3: Users can edit their own comments (within 15 minutes)
- FR-7.4.4: Users can delete their own comments
- FR-7.4.5: Post owners can delete any comment on their posts
- FR-7.4.6: Comments support basic text only (no markdown/HTML)
- FR-7.4.7: Comment pagination (load more)
- FR-7.4.8: Comment count displayed on post cards

### 7.5 Creator Profiles
- FR-7.5.1: Public creator profile page showing all their shared posts
- FR-7.5.2: Profile displays: avatar, display name, join date, post count, total likes received
- FR-7.5.3: Users can follow other creators
- FR-7.5.4: Following feed shows posts from followed creators
- FR-7.5.5: Follower/following counts on profile

### 7.6 Remix & Inspiration
- FR-7.6.1: "Use as Inspiration" button copies prompt to generation form
- FR-7.6.2: Track remix lineage (optional: "inspired by" link)
- FR-7.6.3: View count tracking per post

### 7.7 Moderation
- FR-7.7.1: Users can report posts for policy violations
- FR-7.7.2: Admin can hide/unhide posts
- FR-7.7.3: Admin can ban users from community features
- FR-7.7.4: Automated content policy check on post creation
- FR-7.7.5: Admin moderation queue for reported content

---

## Non-Functional Requirements

### Performance
- NFR-7.1: Gallery feed load < 200ms (paginated, 20 posts)
- NFR-7.2: Like/unlike action < 100ms (optimistic)
- NFR-7.3: Comment submission < 150ms
- NFR-7.4: Search results < 300ms

### Scalability
- NFR-7.5: Support 100k+ posts without degradation
- NFR-7.6: Efficient trending calculation (hourly batch + real-time boost)
- NFR-7.7: CDN caching for public gallery pages

### Security
- NFR-7.8: Validate user owns asset before sharing
- NFR-7.9: Validate user owns post before edit/delete
- NFR-7.10: Rate limit: 10 posts/hour, 100 comments/hour, 500 likes/hour
- NFR-7.11: Sanitize all user input (XSS prevention)
- NFR-7.12: Comment length limit: 1000 characters

---

## Canonical Data Models

### CommunityPost Model
```typescript
interface CommunityPost {
  id: string;                    // UUID, primary key
  userId: string;                // FK to users
  assetId: string;               // FK to assets
  title: string;                 // 1-100 chars
  description: string | null;    // 0-500 chars
  promptUsed: string | null;     // Original generation prompt
  showPrompt: boolean;           // Whether to display prompt publicly
  tags: string[];                // User-defined tags (max 5)
  assetType: AssetType;          // Denormalized for filtering
  assetUrl: string;              // Denormalized for display
  likeCount: number;             // Denormalized counter
  commentCount: number;          // Denormalized counter
  viewCount: number;             // View tracking
  isFeatured: boolean;           // Admin spotlight
  isHidden: boolean;             // Moderation flag
  inspiredByPostId: string | null; // Remix lineage
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### CommunityLike Model
```typescript
interface CommunityLike {
  id: string;                    // UUID, primary key
  postId: string;                // FK to community_posts
  userId: string;                // FK to users
  createdAt: string;             // ISO 8601
}
```

### CommunityComment Model
```typescript
interface CommunityComment {
  id: string;                    // UUID, primary key
  postId: string;                // FK to community_posts
  userId: string;                // FK to users
  content: string;               // 1-1000 chars
  isEdited: boolean;             // Edit flag
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### CommunityFollow Model
```typescript
interface CommunityFollow {
  id: string;                    // UUID, primary key
  followerId: string;            // FK to users (who is following)
  followingId: string;           // FK to users (who is being followed)
  createdAt: string;             // ISO 8601
}
```

### CommunityReport Model
```typescript
interface CommunityReport {
  id: string;                    // UUID, primary key
  postId: string;                // FK to community_posts
  reporterId: string;            // FK to users
  reason: ReportReason;          // Enum
  details: string | null;        // Additional context
  status: ReportStatus;          // pending, reviewed, dismissed, actioned
  reviewedBy: string | null;     // Admin user ID
  reviewedAt: string | null;     // ISO 8601
  createdAt: string;             // ISO 8601
}

type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'harassment' | 'other';
type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';
```

---

## API Contracts

### Community Post Endpoints (12 total)
```
# Core CRUD
GET    /api/v1/community/posts              # List posts (paginated, filterable)
POST   /api/v1/community/posts              # Create post (share asset)
GET    /api/v1/community/posts/{id}         # Get single post
PUT    /api/v1/community/posts/{id}         # Update post (owner only)
DELETE /api/v1/community/posts/{id}         # Delete post (owner only)

# Discovery
GET    /api/v1/community/posts/featured     # Get featured posts (spotlight)
GET    /api/v1/community/posts/trending     # Get trending posts
GET    /api/v1/community/posts/search       # Search posts

# User-specific
GET    /api/v1/community/posts/mine         # Get current user's posts
GET    /api/v1/community/posts/liked        # Get posts user has liked
GET    /api/v1/community/posts/following    # Get posts from followed users
GET    /api/v1/community/users/{id}/posts   # Get posts by specific user
```

### Like Endpoints (2 total)
```
POST   /api/v1/community/posts/{id}/like    # Like post (idempotent)
DELETE /api/v1/community/posts/{id}/like    # Unlike post
```

### Comment Endpoints (4 total)
```
GET    /api/v1/community/posts/{id}/comments    # List comments (paginated)
POST   /api/v1/community/posts/{id}/comments    # Add comment
PUT    /api/v1/community/comments/{id}          # Edit comment (owner, 15min window)
DELETE /api/v1/community/comments/{id}          # Delete comment (owner or post owner)
```

### Follow Endpoints (4 total)
```
POST   /api/v1/community/users/{id}/follow      # Follow user
DELETE /api/v1/community/users/{id}/follow      # Unfollow user
GET    /api/v1/community/users/{id}/followers   # Get user's followers
GET    /api/v1/community/users/{id}/following   # Get who user follows
```

### Report Endpoints (3 total)
```
POST   /api/v1/community/posts/{id}/report      # Report post
GET    /api/v1/admin/community/reports          # Admin: list reports
PUT    /api/v1/admin/community/reports/{id}     # Admin: review report
```

### Admin Endpoints (3 total)
```
PUT    /api/v1/admin/community/posts/{id}/feature   # Toggle featured
PUT    /api/v1/admin/community/posts/{id}/hide      # Hide/unhide post
PUT    /api/v1/admin/community/users/{id}/ban       # Ban user from community
```

---

## Query Parameters

### GET /api/v1/community/posts
```typescript
interface PostsQueryParams {
  page?: number;           // Default: 1
  limit?: number;          // Default: 20, max: 50
  sort?: 'trending' | 'recent' | 'most_liked';  // Default: trending
  assetType?: AssetType;   // Filter by asset type
  tags?: string[];         // Filter by tags (OR)
  search?: string;         // Search title/description
  userId?: string;         // Filter by creator
}
```

---

## Validation Rules

### Post Validation
- `title`: 1-100 characters, trimmed
- `description`: 0-500 characters, optional
- `tags`: 0-5 tags, each 1-30 characters, alphanumeric + hyphens
- `assetId`: Must exist and be owned by user

### Comment Validation
- `content`: 1-1000 characters, trimmed
- Edit window: 15 minutes from creation

### Tag Format
- Pattern: `^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$|^[a-z0-9]$`
- Lowercase, alphanumeric, hyphens allowed (not at start/end)
- Examples: `gaming`, `twitch-emote`, `retro-style`

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `COMMUNITY_POST_NOT_FOUND` | 404 | Post does not exist |
| `COMMUNITY_COMMENT_NOT_FOUND` | 404 | Comment does not exist |
| `COMMUNITY_ASSET_NOT_OWNED` | 403 | User doesn't own the asset |
| `COMMUNITY_POST_NOT_OWNED` | 403 | User doesn't own the post |
| `COMMUNITY_COMMENT_NOT_OWNED` | 403 | User doesn't own the comment |
| `COMMUNITY_EDIT_WINDOW_EXPIRED` | 403 | Comment edit window (15min) expired |
| `COMMUNITY_ALREADY_SHARED` | 409 | Asset already shared to community |
| `COMMUNITY_USER_BANNED` | 403 | User banned from community features |
| `COMMUNITY_RATE_LIMITED` | 429 | Rate limit exceeded |
| `COMMUNITY_INVALID_TAG` | 422 | Tag format invalid |
| `COMMUNITY_TOO_MANY_TAGS` | 422 | Maximum 5 tags allowed |
| `COMMUNITY_SELF_FOLLOW` | 422 | Cannot follow yourself |
| `COMMUNITY_ALREADY_REPORTED` | 409 | Already reported this post |

---

## Property Tests Required

### Property 10: Like Idempotency
*For any* user and post, liking multiple times SHALL result in exactly one like record.

```python
@given(
    user_id=st.uuids().map(str),
    post_id=st.uuids().map(str),
    like_count=st.integers(min_value=1, max_value=10)
)
def test_like_idempotency(user_id, post_id, like_count):
    for _ in range(like_count):
        like_post(user_id, post_id)
    likes = get_likes_for_post(post_id)
    user_likes = [l for l in likes if l.user_id == user_id]
    assert len(user_likes) == 1
```

### Property 11: Comment Edit Window
*For any* comment, editing SHALL succeed only within 15 minutes of creation.

```python
@given(
    minutes_elapsed=st.integers(min_value=0, max_value=60)
)
def test_comment_edit_window(minutes_elapsed):
    comment = create_comment(...)
    # Simulate time passage
    can_edit = can_edit_comment(comment, minutes_elapsed)
    if minutes_elapsed <= 15:
        assert can_edit == True
    else:
        assert can_edit == False
```

### Property 12: Tag Normalization
*For any* valid tag input, normalization SHALL produce lowercase alphanumeric with hyphens.

```python
@given(
    tag=st.from_regex(r'[A-Za-z0-9][A-Za-z0-9-]{0,28}[A-Za-z0-9]|[A-Za-z0-9]', fullmatch=True)
)
def test_tag_normalization(tag):
    normalized = normalize_tag(tag)
    assert normalized == tag.lower()
    assert re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$', normalized)
```

### Property 13: Follow Symmetry Prevention
*For any* user pair, following SHALL not create symmetric relationship automatically.

```python
@given(
    user_a=st.uuids().map(str),
    user_b=st.uuids().map(str)
)
def test_follow_not_symmetric(user_a, user_b):
    assume(user_a != user_b)
    follow_user(user_a, user_b)  # A follows B
    assert is_following(user_a, user_b) == True
    assert is_following(user_b, user_a) == False  # B does NOT follow A
```

### Property 14: Denormalized Counter Consistency
*For any* post, like_count SHALL equal actual like records count.

```python
@given(
    post_id=st.uuids().map(str),
    operations=st.lists(st.tuples(st.uuids().map(str), st.booleans()), max_size=50)
)
def test_like_count_consistency(post_id, operations):
    for user_id, should_like in operations:
        if should_like:
            like_post(user_id, post_id)
        else:
            unlike_post(user_id, post_id)
    
    post = get_post(post_id)
    actual_likes = count_likes(post_id)
    assert post.like_count == actual_likes
```

---

## Unit Tests Required

### Post Service Tests
- Create post with valid data
- Create post with asset not owned (expect 403)
- Create post with asset already shared (expect 409)
- Update post (owner)
- Update post (non-owner, expect 403)
- Delete post (owner)
- Delete post (non-owner, expect 403)
- Get post by ID
- List posts with pagination
- List posts with filters (asset type, tags)
- Search posts
- Get featured posts
- Get trending posts

### Like Service Tests
- Like post (first time)
- Like post (already liked - idempotent)
- Unlike post
- Unlike post (not liked - no error)
- Get user's liked posts

### Comment Service Tests
- Create comment
- Edit comment (within window)
- Edit comment (outside window, expect 403)
- Delete comment (owner)
- Delete comment (post owner)
- Delete comment (neither, expect 403)
- List comments with pagination

### Follow Service Tests
- Follow user
- Follow self (expect 422)
- Unfollow user
- Get followers
- Get following
- Get following feed

### Report Service Tests
- Report post
- Report post (already reported, expect 409)
- Admin review report

---

## Integration Tests Required

1. Share asset → View in gallery → Like → Comment → Delete post
2. Follow user → See their posts in following feed
3. Report post → Admin reviews → Post hidden
4. Create post → Edit → Verify updated
5. Trending calculation with multiple likes over time

---

## E2E Tests Required

1. Full gallery browsing flow (filter, sort, paginate)
2. Share asset to community flow
3. Like and comment interaction flow
4. Follow creator and view following feed
5. Report inappropriate content flow

---

## Verification Gate 7 Checklist

### Property Tests
- [ ] Property 10: Like Idempotency — 100+ iterations
- [ ] Property 11: Comment Edit Window — 100+ iterations
- [ ] Property 12: Tag Normalization — 100+ iterations
- [ ] Property 13: Follow Symmetry Prevention — 100+ iterations
- [ ] Property 14: Denormalized Counter Consistency — 100+ iterations

### Unit Tests
- [ ] All post endpoints tested — PASS
- [ ] All like endpoints tested — PASS
- [ ] All comment endpoints tested — PASS
- [ ] All follow endpoints tested — PASS
- [ ] All report endpoints tested — PASS
- [ ] Coverage >= 80% — PASS

### Integration Tests
- [ ] Full post lifecycle — PASS
- [ ] Follow and feed — PASS
- [ ] Moderation flow — PASS

### E2E Tests
- [ ] Gallery browsing — PASS
- [ ] Share flow — PASS
- [ ] Engagement flow — PASS

### Platform Verification
- [ ] TSX web: Community gallery functional
- [ ] TSX mobile: Community gallery functional

### Sign-off
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Ready for production
