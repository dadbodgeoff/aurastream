"""
Service Dependencies for FastAPI Dependency Injection.

This module provides FastAPI-compatible dependency functions for all services,
enabling proper dependency injection, easier testing, and cleaner mocking.

MIGRATION GUIDE:
================

Before (Direct singleton call):
    from backend.services.auth_service import get_auth_service
    
    @router.post("/login")
    async def login(data: LoginRequest):
        auth_service = get_auth_service()  # ← Direct call
        ...

After (Dependency injection):
    from backend.api.service_dependencies import AuthServiceDep
    
    @router.post("/login")
    async def login(
        data: LoginRequest,
        auth_service: AuthServiceDep,  # ← Injected via Depends()
    ):
        ...

TESTING:
========

    from backend.api.service_dependencies import get_auth_service_dep
    
    @pytest.fixture
    def client_with_mocks(mock_auth_service):
        app = create_app()
        app.dependency_overrides[get_auth_service_dep] = lambda: mock_auth_service
        with TestClient(app) as client:
            yield client
        app.dependency_overrides.clear()
"""

from typing import Annotated, TYPE_CHECKING
from fastapi import Depends

# =============================================================================
# Core Services
# =============================================================================

def get_auth_service_dep():
    """
    Dependency for AuthService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.auth_service import get_auth_service
    return get_auth_service()


def get_brand_kit_service_dep():
    """
    Dependency for BrandKitService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.brand_kit_service import get_brand_kit_service
    return get_brand_kit_service()


def get_generation_service_dep():
    """
    Dependency for GenerationService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.generation_service import get_generation_service
    return get_generation_service()


def get_logo_service_dep():
    """
    Dependency for LogoService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.logo_service import get_logo_service
    return get_logo_service()


def get_storage_service_dep():
    """
    Dependency for StorageService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.storage_service import get_storage_service
    return get_storage_service()


def get_analytics_service_dep():
    """
    Dependency for AnalyticsService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.analytics_service import get_analytics_service
    return get_analytics_service()


def get_audit_service_dep():
    """
    Dependency for AuditService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.audit_service import get_audit_service
    return get_audit_service()


def get_auth_token_service_dep():
    """
    Dependency for AuthTokenService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.auth_token_service import get_auth_token_service
    return get_auth_token_service()


def get_usage_limit_service_dep():
    """
    Dependency for UsageLimitService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.usage_limit_service import get_usage_limit_service
    return get_usage_limit_service()


def get_rate_limit_service_dep():
    """
    Dependency for RateLimitService (unified rate limiting).
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.rate_limit import get_rate_limit_service
    return get_rate_limit_service()


def get_subscription_service_dep():
    """
    Dependency for SubscriptionService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.subscription_service import get_subscription_service
    return get_subscription_service()


def get_stripe_service_dep():
    """
    Dependency for StripeService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.stripe_service import get_stripe_service
    return get_stripe_service()


def get_oauth_service_dep():
    """
    Dependency for OAuthService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.oauth_service import get_oauth_service
    return get_oauth_service()


def get_avatar_service_dep():
    """
    Dependency for AvatarService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.avatar_service import get_avatar_service
    return get_avatar_service()


def get_prompt_engine_dep():
    """
    Dependency for PromptEngine.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.prompt_engine import get_prompt_engine
    return get_prompt_engine()


def get_quick_create_service_dep():
    """
    Dependency for QuickCreateService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.quick_create_service import get_quick_create_service
    return get_quick_create_service()


# =============================================================================
# Coach Module Services
# =============================================================================

def get_coach_service_dep():
    """
    Dependency for CoachService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.coach import get_coach_service
    return get_coach_service()


def get_session_manager_dep():
    """
    Dependency for SessionManager.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.coach import get_session_manager
    return get_session_manager()


def get_tips_service_dep():
    """
    Dependency for TipsService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.coach import get_tips_service
    return get_tips_service()


def get_coach_analytics_service_dep():
    """
    Dependency for CoachAnalyticsService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.coach import get_analytics_service
    return get_analytics_service()


# =============================================================================
# Twitch Module Services
# =============================================================================

def get_context_engine_dep():
    """
    Dependency for TwitchContextEngine.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.twitch.context_engine import get_context_engine
    return get_context_engine()


def get_pack_service_dep():
    """
    Dependency for PackService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.twitch.pack_service import get_pack_service
    return get_pack_service()


def get_game_meta_service_dep():
    """
    Dependency for GameMetaService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.twitch.game_meta import get_game_meta_service
    return get_game_meta_service()


# =============================================================================
# Trends Module Services
# =============================================================================

def get_trend_service_dep():
    """
    Dependency for TrendService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.trends import get_trend_service
    return get_trend_service()


def get_youtube_collector_dep():
    """
    Dependency for YouTubeCollector.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.trends import get_youtube_collector
    return get_youtube_collector()


def get_twitch_collector_dep():
    """
    Dependency for TwitchCollector.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.trends import get_twitch_collector
    return get_twitch_collector()


# =============================================================================
# Creator Media Module Services
# =============================================================================

def get_creator_media_service_dep():
    """
    Dependency for CreatorMediaService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.creator_media.service import get_creator_media_service
    return get_creator_media_service()


# =============================================================================
# Intel Module Services
# =============================================================================

def get_daily_insight_generator_dep():
    """
    Dependency for DailyInsightGenerator.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.intel.daily_insight_generator import DailyInsightGenerator
    return DailyInsightGenerator()


def get_mission_generator_dep():
    """
    Dependency for MissionGenerator.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.intel.mission_generator import MissionGenerator
    return MissionGenerator()


def get_video_idea_generator_dep():
    """
    Dependency for VideoIdeaGenerator.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.intel.video_idea_generator import VideoIdeaGenerator
    return VideoIdeaGenerator()


# =============================================================================
# Clip Radar Services
# =============================================================================

def get_clip_radar_service_dep():
    """
    Dependency for ClipRadarService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.clip_radar.service import get_clip_radar_service
    return get_clip_radar_service()


def get_recap_service_dep():
    """
    Dependency for RecapService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.clip_radar.recap_service import get_recap_service
    return get_recap_service()


# =============================================================================
# Playbook Services
# =============================================================================

def get_playbook_service_dep():
    """
    Dependency for PlaybookService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.playbook import get_playbook_service
    return get_playbook_service()


# =============================================================================
# Thumbnail Intel Services
# =============================================================================

def get_thumbnail_intel_service_dep():
    """
    Dependency for ThumbnailIntelService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.thumbnail_intel import get_thumbnail_intel_service
    return get_thumbnail_intel_service()


# =============================================================================
# Community Services
# =============================================================================

def get_community_post_service_dep():
    """
    Dependency for CommunityPostService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.community_post_service import get_community_post_service
    return get_community_post_service()


def get_community_engagement_service_dep():
    """
    Dependency for CommunityEngagementService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.community_engagement_service import get_community_engagement_service
    return get_community_engagement_service()


def get_community_admin_service_dep():
    """
    Dependency for CommunityAdminService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.community_admin_service import get_community_admin_service
    return get_community_admin_service()


def get_community_feed_service_dep():
    """
    Dependency for CommunityFeedService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.community_feed_service import get_community_feed_service
    return get_community_feed_service()


# =============================================================================
# Other Services
# =============================================================================

def get_vibe_branding_service_dep():
    """
    Dependency for VibeBrandingService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.vibe_branding_service import get_vibe_branding_service
    return get_vibe_branding_service()


def get_profile_creator_service_dep():
    """
    Dependency for ProfileCreatorService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.profile_creator_service import get_profile_creator_service
    return get_profile_creator_service()


def get_thumbnail_recreate_service_dep():
    """
    Dependency for ThumbnailRecreateService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.thumbnail_recreate_service import get_thumbnail_recreate_service
    return get_thumbnail_recreate_service()


def get_nano_banana_client_dep():
    """
    Dependency for NanoBananaClient.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.nano_banana_client import get_nano_banana_client
    return get_nano_banana_client()


def get_gemini_vision_client_dep():
    """
    Dependency for GeminiVisionClient.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.gemini_vision_client import get_gemini_vision_client
    return get_gemini_vision_client()


# =============================================================================
# Social & Messaging Services
# =============================================================================

def get_social_service_dep():
    """
    Dependency for SocialService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.social_service import get_social_service
    return get_social_service()


def get_message_service_dep():
    """
    Dependency for MessageService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.message_service import get_message_service
    return get_message_service()


def get_promo_service_dep():
    """
    Dependency for PromoService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.promo_service import get_promo_service
    return get_promo_service()


# =============================================================================
# Analytics Services
# =============================================================================

def get_enterprise_analytics_service_dep():
    """
    Dependency for EnterpriseAnalyticsService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.enterprise_analytics_service import get_enterprise_analytics_service
    return get_enterprise_analytics_service()


def get_simple_analytics_service_dep():
    """
    Dependency for SimpleAnalyticsService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.simple_analytics_service import get_simple_analytics_service
    return get_simple_analytics_service()


def get_site_analytics_service_dep():
    """
    Dependency for SiteAnalyticsService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.site_analytics_service import get_site_analytics_service
    return get_site_analytics_service()


# =============================================================================
# Asset & Generation Services
# =============================================================================

def get_streamer_asset_service_dep():
    """
    Dependency for StreamerAssetService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.streamer_asset_service import get_streamer_asset_service
    return get_streamer_asset_service()


def get_logo_generation_service_dep():
    """
    Dependency for LogoGenerationService.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.logo_generation_service import get_logo_generation_service
    return get_logo_generation_service()


# =============================================================================
# Intel Services
# =============================================================================

def get_intel_preferences_repository_dep():
    """
    Dependency for IntelPreferencesRepository.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.intel.preferences_repository import get_intel_preferences_repository
    return get_intel_preferences_repository()


def get_activity_tracker_dep():
    """
    Dependency for ActivityTracker.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.intel.activity_tracker import get_activity_tracker
    return get_activity_tracker()


def get_title_intel_analyzer_dep():
    """
    Dependency for TitleIntelAnalyzer.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.title_intel import get_title_intel_analyzer
    return get_title_intel_analyzer()


# =============================================================================
# Webhook Services
# =============================================================================

def get_webhook_queue_dep():
    """
    Dependency for WebhookQueue.
    
    Enables FastAPI dependency injection and clean test mocking.
    """
    from backend.services.webhook_queue import get_webhook_queue
    return get_webhook_queue()



# =============================================================================
# Type Aliases for Clean Dependency Injection
# =============================================================================
# 
# These type aliases enable clean, type-safe dependency injection in routes.
# Import these instead of the raw service classes for better IDE support.
#
# Example:
#     from backend.api.service_dependencies import AuthServiceDep, BrandKitServiceDep
#     
#     @router.post("/example")
#     async def example(
#         auth_service: AuthServiceDep,
#         brand_kit_service: BrandKitServiceDep,
#     ):
#         # Full type hints and autocomplete work here
#         user = await auth_service.get_user(user_id)
#         brand_kit = await brand_kit_service.get(brand_kit_id)

# Import service types for type aliases
# Using TYPE_CHECKING to avoid circular imports at runtime
if TYPE_CHECKING:
    from backend.services.auth_service import AuthService
    from backend.services.brand_kit_service import BrandKitService
    from backend.services.generation_service import GenerationService
    from backend.services.logo_service import LogoService
    from backend.services.storage_service import StorageService
    from backend.services.analytics_service import AnalyticsService
    from backend.services.audit_service import AuditService
    from backend.services.auth_token_service import AuthTokenService
    from backend.services.usage_limit_service import UsageLimitService
    from backend.services.rate_limit import RateLimitService
    from backend.services.subscription_service import SubscriptionService
    from backend.services.stripe_service import StripeService
    from backend.services.oauth_service import OAuthService
    from backend.services.avatar_service import AvatarService
    from backend.services.prompt_engine import PromptEngine
    from backend.services.quick_create_service import QuickCreateService
    from backend.services.coach import CoachService, SessionManager, StaticTipsService as TipsService, CoachAnalyticsService
    from backend.services.twitch.context_engine import TwitchContextEngine
    from backend.services.twitch.pack_service import PackService
    from backend.services.twitch.game_meta import GameMetaService
    from backend.services.trends import YouTubeCollector, TwitchCollector
    from backend.services.creator_media.service import CreatorMediaService
    from backend.services.clip_radar.service import ClipRadarService
    from backend.services.clip_radar.recap_service import RecapService
    from backend.services.community_post_service import CommunityPostService
    from backend.services.community_engagement_service import CommunityEngagementService
    from backend.services.community_admin_service import CommunityAdminService
    from backend.services.community_feed_service import CommunityFeedService
    from backend.services.vibe_branding_service import VibeBrandingService
    from backend.services.profile_creator_service import ProfileCreatorService
    from backend.services.thumbnail_recreate_service import ThumbnailRecreateService
    from backend.services.nano_banana_client import NanoBananaClient
    from backend.services.gemini_vision_client import GeminiVisionClient
    from backend.services.playbook import PlaybookService
    from backend.services.thumbnail_intel import ThumbnailIntelService
    from backend.services.social_service import SocialService
    from backend.services.message_service import MessageService
    from backend.services.promo_service import PromoService
    from backend.services.enterprise_analytics_service import EnterpriseAnalyticsService
    from backend.services.simple_analytics_service import SimpleAnalyticsService
    from backend.services.site_analytics_service import SiteAnalyticsService
    from backend.services.streamer_asset_service import StreamerAssetService
    from backend.services.logo_generation_service import LogoGenerationService
    from backend.services.intel.preferences_repository import IntelPreferencesRepository
    from backend.services.intel.activity_tracker import ActivityTracker
    from backend.services.title_intel import TitleIntelAnalyzer
    from backend.services.webhook_queue import WebhookQueue

# Core Services
AuthServiceDep = Annotated["AuthService", Depends(get_auth_service_dep)]
BrandKitServiceDep = Annotated["BrandKitService", Depends(get_brand_kit_service_dep)]
GenerationServiceDep = Annotated["GenerationService", Depends(get_generation_service_dep)]
LogoServiceDep = Annotated["LogoService", Depends(get_logo_service_dep)]
StorageServiceDep = Annotated["StorageService", Depends(get_storage_service_dep)]
AnalyticsServiceDep = Annotated["AnalyticsService", Depends(get_analytics_service_dep)]
AuditServiceDep = Annotated["AuditService", Depends(get_audit_service_dep)]
AuthTokenServiceDep = Annotated["AuthTokenService", Depends(get_auth_token_service_dep)]
UsageLimitServiceDep = Annotated["UsageLimitService", Depends(get_usage_limit_service_dep)]
RateLimitServiceDep = Annotated["RateLimitService", Depends(get_rate_limit_service_dep)]
SubscriptionServiceDep = Annotated["SubscriptionService", Depends(get_subscription_service_dep)]
StripeServiceDep = Annotated["StripeService", Depends(get_stripe_service_dep)]
OAuthServiceDep = Annotated["OAuthService", Depends(get_oauth_service_dep)]
AvatarServiceDep = Annotated["AvatarService", Depends(get_avatar_service_dep)]
PromptEngineDep = Annotated["PromptEngine", Depends(get_prompt_engine_dep)]
QuickCreateServiceDep = Annotated["QuickCreateService", Depends(get_quick_create_service_dep)]

# Coach Module
CoachServiceDep = Annotated["CoachService", Depends(get_coach_service_dep)]
SessionManagerDep = Annotated["SessionManager", Depends(get_session_manager_dep)]
TipsServiceDep = Annotated["TipsService", Depends(get_tips_service_dep)]
CoachAnalyticsServiceDep = Annotated["CoachAnalyticsService", Depends(get_coach_analytics_service_dep)]

# Twitch Module
ContextEngineDep = Annotated["TwitchContextEngine", Depends(get_context_engine_dep)]
PackServiceDep = Annotated["PackService", Depends(get_pack_service_dep)]
GameMetaServiceDep = Annotated["GameMetaService", Depends(get_game_meta_service_dep)]

# Trends Module
YouTubeCollectorDep = Annotated["YouTubeCollector", Depends(get_youtube_collector_dep)]
TwitchCollectorDep = Annotated["TwitchCollector", Depends(get_twitch_collector_dep)]

# Creator Media Module
CreatorMediaServiceDep = Annotated["CreatorMediaService", Depends(get_creator_media_service_dep)]

# Clip Radar
ClipRadarServiceDep = Annotated["ClipRadarService", Depends(get_clip_radar_service_dep)]
RecapServiceDep = Annotated["RecapService", Depends(get_recap_service_dep)]

# Community
CommunityPostServiceDep = Annotated["CommunityPostService", Depends(get_community_post_service_dep)]
CommunityEngagementServiceDep = Annotated["CommunityEngagementService", Depends(get_community_engagement_service_dep)]
CommunityAdminServiceDep = Annotated["CommunityAdminService", Depends(get_community_admin_service_dep)]
CommunityFeedServiceDep = Annotated["CommunityFeedService", Depends(get_community_feed_service_dep)]

# Other Services
VibeBrandingServiceDep = Annotated["VibeBrandingService", Depends(get_vibe_branding_service_dep)]
ProfileCreatorServiceDep = Annotated["ProfileCreatorService", Depends(get_profile_creator_service_dep)]
ThumbnailRecreateServiceDep = Annotated["ThumbnailRecreateService", Depends(get_thumbnail_recreate_service_dep)]
NanoBananaClientDep = Annotated["NanoBananaClient", Depends(get_nano_banana_client_dep)]
GeminiVisionClientDep = Annotated["GeminiVisionClient", Depends(get_gemini_vision_client_dep)]
PlaybookServiceDep = Annotated["PlaybookService", Depends(get_playbook_service_dep)]
ThumbnailIntelServiceDep = Annotated["ThumbnailIntelService", Depends(get_thumbnail_intel_service_dep)]

# Social & Messaging
SocialServiceDep = Annotated["SocialService", Depends(get_social_service_dep)]
MessageServiceDep = Annotated["MessageService", Depends(get_message_service_dep)]
PromoServiceDep = Annotated["PromoService", Depends(get_promo_service_dep)]

# Analytics
EnterpriseAnalyticsServiceDep = Annotated["EnterpriseAnalyticsService", Depends(get_enterprise_analytics_service_dep)]
SimpleAnalyticsServiceDep = Annotated["SimpleAnalyticsService", Depends(get_simple_analytics_service_dep)]
SiteAnalyticsServiceDep = Annotated["SiteAnalyticsService", Depends(get_site_analytics_service_dep)]

# Asset & Generation
StreamerAssetServiceDep = Annotated["StreamerAssetService", Depends(get_streamer_asset_service_dep)]
LogoGenerationServiceDep = Annotated["LogoGenerationService", Depends(get_logo_generation_service_dep)]

# Intel
IntelPreferencesRepositoryDep = Annotated["IntelPreferencesRepository", Depends(get_intel_preferences_repository_dep)]
ActivityTrackerDep = Annotated["ActivityTracker", Depends(get_activity_tracker_dep)]
TitleIntelAnalyzerDep = Annotated["TitleIntelAnalyzer", Depends(get_title_intel_analyzer_dep)]

# Webhooks
WebhookQueueDep = Annotated["WebhookQueue", Depends(get_webhook_queue_dep)]


# =============================================================================
# Utility: Reset All Singletons (For Testing)
# =============================================================================

def reset_all_service_singletons():
    """
    Reset all service singletons to None.
    
    This is useful for testing to ensure clean state between tests.
    Should only be used in test fixtures, never in production code.
    
    Example:
        @pytest.fixture(autouse=True)
        def reset_singletons():
            yield
            reset_all_service_singletons()
    """
    # Core services
    try:
        import backend.services.auth_service as auth_mod
        auth_mod._auth_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.brand_kit_service as bk_mod
        bk_mod._brand_kit_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.generation_service as gen_mod
        gen_mod._generation_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.logo_service as logo_mod
        logo_mod._logo_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.storage_service as storage_mod
        storage_mod._storage_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.analytics_service as analytics_mod
        analytics_mod._analytics_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.audit_service as audit_mod
        audit_mod._audit_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.usage_limit_service as usage_mod
        usage_mod._usage_limit_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.avatar_service as avatar_mod
        avatar_mod._avatar_service = None
    except (ImportError, AttributeError):
        pass
    
    # Coach services (new modular structure)
    try:
        import backend.services.coach.service as coach_mod
        coach_mod._coach_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.coach.session.manager as session_mod
        session_mod._session_manager = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.coach.tips.service as tips_mod
        tips_mod._tips_service = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.coach.analytics.service as analytics_mod
        analytics_mod._analytics_service = None
    except (ImportError, AttributeError):
        pass
    
    # Twitch services
    try:
        import backend.services.twitch.context_engine as context_mod
        context_mod._context_engine = None
    except (ImportError, AttributeError):
        pass
    
    try:
        import backend.services.twitch.pack_service as pack_mod
        pack_mod._pack_service = None
    except (ImportError, AttributeError):
        pass
    
    # Add more as needed...
