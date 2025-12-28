"""
Community Gallery Pydantic Schemas

Request/response models for community posts, likes, comments, follows, and reports.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
import re

# Constants
TAG_PATTERN = re.compile(r'^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$|^[a-z0-9]$')
REPORT_REASONS = Literal['spam', 'inappropriate', 'copyright', 'harassment', 'other']
REPORT_STATUSES = Literal['pending', 'reviewed', 'dismissed', 'actioned']
POST_SORT_OPTIONS = Literal['trending', 'recent', 'most_liked']


# =============================================================================
# User Summary (for embedding in responses)
# =============================================================================

class UserSummary(BaseModel):
    """Minimal user info for display."""
    id: str
    display_name: str
    avatar_url: Optional[str] = None


# =============================================================================
# Post Schemas
# =============================================================================

class CreatePostRequest(BaseModel):
    """Request body for sharing an asset to community."""
    asset_id: str = Field(..., description="UUID of asset to share")
    title: str = Field(..., min_length=1, max_length=100, description="Post title")
    description: Optional[str] = Field(None, max_length=500, description="Post description")
    tags: List[str] = Field(default_factory=list, description="Tags (max 5)")
    show_prompt: bool = Field(default=True, description="Show generation prompt publicly")
    inspired_by_post_id: Optional[str] = Field(None, description="Post that inspired this creation")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        if len(v) > 5:
            raise ValueError('Maximum 5 tags allowed')
        validated = []
        for tag in v:
            tag = tag.lower().strip()
            if not tag:
                continue
            if not TAG_PATTERN.match(tag):
                raise ValueError(f'Invalid tag format: {tag}. Use lowercase alphanumeric with hyphens.')
            validated.append(tag)
        return validated


class UpdatePostRequest(BaseModel):
    """Request body for updating a post."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = Field(None, description="Tags (max 5)")
    show_prompt: Optional[bool] = None
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        if len(v) > 5:
            raise ValueError('Maximum 5 tags allowed')
        validated = []
        for tag in v:
            tag = tag.lower().strip()
            if not tag:
                continue
            if not TAG_PATTERN.match(tag):
                raise ValueError(f'Invalid tag format: {tag}')
            validated.append(tag)
        return validated


class CommunityPostResponse(BaseModel):
    """Community post in API responses."""
    id: str
    user_id: str
    asset_id: str
    title: str
    description: Optional[str] = None
    prompt_used: Optional[str] = None
    show_prompt: bool
    tags: List[str]
    asset_type: str
    asset_url: str
    like_count: int
    comment_count: int
    view_count: int
    is_featured: bool
    inspired_by_post_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CommunityPostWithAuthorResponse(CommunityPostResponse):
    """Post with author info for display."""
    author: UserSummary
    is_liked: bool = False


class PaginatedPostsResponse(BaseModel):
    """Paginated posts response."""
    items: List[CommunityPostWithAuthorResponse]
    total: int
    page: int
    limit: int
    has_more: bool


# =============================================================================
# Comment Schemas
# =============================================================================

class CreateCommentRequest(BaseModel):
    """Request body for adding a comment."""
    content: str = Field(..., min_length=1, max_length=1000)
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        return v.strip()


class UpdateCommentRequest(BaseModel):
    """Request body for editing a comment."""
    content: str = Field(..., min_length=1, max_length=1000)
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        return v.strip()


class CommentResponse(BaseModel):
    """Comment in API responses."""
    id: str
    post_id: str
    user_id: str
    content: str
    is_edited: bool
    created_at: datetime
    updated_at: datetime


class CommentWithAuthorResponse(CommentResponse):
    """Comment with author info."""
    author: UserSummary
    can_edit: bool = False
    can_delete: bool = False


class PaginatedCommentsResponse(BaseModel):
    """Paginated comments response."""
    items: List[CommentWithAuthorResponse]
    total: int
    page: int
    limit: int
    has_more: bool


# =============================================================================
# Follow Schemas
# =============================================================================

class CommunityUserStatsResponse(BaseModel):
    """User's community statistics."""
    user_id: str
    post_count: int
    total_likes_received: int
    follower_count: int
    following_count: int


class CreatorProfileResponse(BaseModel):
    """Public creator profile."""
    user: UserSummary
    stats: CommunityUserStatsResponse
    is_following: bool = False
    joined_at: datetime


class PaginatedUsersResponse(BaseModel):
    """Paginated users response."""
    items: List[UserSummary]
    total: int
    page: int
    limit: int
    has_more: bool


# =============================================================================
# Report Schemas
# =============================================================================

class ReportPostRequest(BaseModel):
    """Request body for reporting a post."""
    reason: REPORT_REASONS
    details: Optional[str] = Field(None, max_length=500)


class ReviewReportRequest(BaseModel):
    """Admin request for reviewing a report."""
    status: Literal['reviewed', 'dismissed', 'actioned']
    hide_post: bool = Field(default=False, description="Hide the reported post")


class ReportResponse(BaseModel):
    """Report in API responses."""
    id: str
    post_id: str
    reporter_id: str
    reason: str
    details: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class PaginatedReportsResponse(BaseModel):
    """Paginated reports response."""
    items: List[ReportResponse]
    total: int
    page: int
    limit: int
    has_more: bool


# =============================================================================
# Query Parameters
# =============================================================================

class PostsQueryParams(BaseModel):
    """Query parameters for listing posts."""
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=50)
    sort: POST_SORT_OPTIONS = 'trending'
    asset_type: Optional[str] = None
    tags: Optional[List[str]] = None
    search: Optional[str] = None
    user_id: Optional[str] = None
