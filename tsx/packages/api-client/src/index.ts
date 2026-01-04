// Aurastream API Client
// Typed client for backend API

// Client exports
export { APIClient, APIClientError, apiClient } from './client';
export type { APIClientConfig } from './client';

// Query Key Factory exports
export {
  queryKeys,
  createQueryKey,
  matchesQueryKey,
} from './queryKeys';
export type {
  QueryKeys,
  QueryKeyOf,
  DomainQueryKeys,
  BrandKitFilters as QueryBrandKitFilters,
  JobFilters as QueryJobFilters,
  AssetFilters as QueryAssetFilters,
  CoachSessionFilters as QueryCoachSessionFilters,
} from './queryKeys';

// Type exports
export type {
  // User types
  User,
  
  // Auth request types
  SignupRequest,
  LoginRequest,
  RefreshRequest,
  OAuthCallbackRequest,
  
  // Auth response types
  SignupResponse,
  LoginResponse,
  RefreshResponse,
  LogoutResponse,
  OAuthInitiateResponse,
  PasswordStrengthResponse,
  
  // Error types
  APIError,
  APIErrorDetail,
  ResponseMeta,
  APIResponse,
  
  // Feature types
  GenerationJob,
  Asset,
  
  // Utility types
  SubscriptionTier,
  SubscriptionStatus,
  JobStatus,
} from './types';

// Brand Kit type exports
export type {
  BrandKit,
  BrandKitFonts,
  BrandKitTone,
  BrandKitCreate,
  BrandKitUpdate,
  BrandKitListResponse,
  BrandKitExtraction,
} from './types/brandKit';

export { SUPPORTED_FONTS, VALID_TONES } from './types/brandKit';

// Brand Kit hooks exports
export {
  brandKitKeys,
  useBrandKits,
  useBrandKit,
  useActiveBrandKit,
  useCreateBrandKit,
  useUpdateBrandKit,
  useDeleteBrandKit,
  useActivateBrandKit,
} from './hooks/useBrandKits';

// Logo hooks exports
export {
  logoKeys,
  useLogos,
  useLogo,
  useUploadLogo,
  useDeleteLogo,
  useSetDefaultLogo,
} from './hooks/useLogos';
export type {
  LogoUploadResponse,
  LogoListResponse,
  LogoUrlResponse,
  LogoDeleteResponse,
} from './hooks/useLogos';
// Note: LogoType is exported from './types/brand-kit-enhanced'

// Generation type exports
export type {
  AssetType,
  GenerateRequest,
  JobResponse,
  JobListResponse,
  AssetResponse,
  AssetListResponse,
  JobFilters,
  AssetFilters,
} from './types/generation';

export { ASSET_DIMENSIONS, ASSET_TYPE_LABELS } from './types/generation';

// Generation hooks exports
export {
  generationKeys,
  useGenerateAsset,
  useJob,
  useJobs,
  useJobAssets,
  useAssets,
  useAsset,
  useDeleteAsset,
  useUpdateAssetVisibility,
  classifyGenerationError,
} from './hooks/useGeneration';

export type {
  GenerationErrorCode,
  ClassifiedError,
  UseGenerateAssetOptions,
} from './hooks/useGeneration';

// Brand Kit Enhanced type exports
export type {
  // Extended Color System
  ExtendedColor,
  GradientStop,
  Gradient,
  ColorPalette,
  
  // Typography System
  FontConfig,
  Typography,
  
  // Brand Voice
  ExtendedTone,
  BrandVoice,
  
  // Streamer Assets
  OverlayType,
  AlertType,
  EmoteTier,
  FacecamPosition,
  OverlayAsset,
  AlertAsset,
  PanelAsset,
  EmoteAsset,
  BadgeAsset,
  FacecamFrame,
  Stinger,
  StreamerAssets,
  
  // Brand Guidelines
  BrandGuidelines,
  
  // Social Profiles
  SocialProfile,
  SocialProfiles,
  
  // Brand Customization
  LogoPosition,
  LogoSize,
  BrandIntensity,
  TypographyLevel,
  LogoType,
  ColorSelection,
  TypographySelection,
  VoiceSelection,
  BrandCustomization,
  
  // API Response Types
  ColorPaletteResponse,
  TypographyResponse,
  VoiceResponse,
  GuidelinesResponse,
} from './types/brand-kit-enhanced';

// Coach type exports
export type {
  CoachAssetType,
  CoachMood,
  CoachColorInfo,
  CoachFontInfo,
  CoachBrandContext,
  CoachReferenceAsset,
  StartCoachRequest,
  ContinueChatRequest,
  CoachValidationIssue,
  CoachValidationResult,
  CoachStreamChunkType,
  CoachStreamChunk,
  CoachAccessResponse,
  CoachPromptTip,
  CoachTipsResponse,
  CoachSessionStateResponse,
  CoachEndSessionResponse,
  // Refinement types (multi-turn image editing)
  RefineImageRequest,
  RefineImageResponse,
  RefinementUsageStatus,
} from './types/coach';

// Twitch type exports
export type {
  TwitchAssetType,
  PackType,
  PackStatus,
  TwitchGenerateRequest,
  PackGenerateRequest,
  TwitchAssetResponse,
  TwitchJobResponse,
  PackAssetResponse,
  PackResponse,
  DimensionSpecResponse,
  GameMetaResponse,
} from './types/twitch';

export {
  TWITCH_ASSET_DIMENSIONS,
  TWITCH_ASSET_TYPE_LABELS,
  PACK_TYPE_LABELS,
  PACK_CONTENTS,
} from './types/twitch';

// Twitch hooks exports
export {
  twitchKeys,
  useTwitchDimensions,
  useGameMeta,
  usePack,
  useGenerateTwitchAsset,
  useGeneratePack,
} from './hooks/useTwitch';

// Subscription type exports
export type {
  SubscriptionTier as SubscriptionTierType,
  SubscriptionStatus as SubscriptionStatusType,
  PlanType,
  CheckoutRequest,
  CheckoutResponse,
  PortalRequest,
  PortalResponse,
  SubscriptionStatusResponse,
  CancelResponse,
} from './types/subscription';

// Subscription hooks exports
export {
  subscriptionKeys,
  useSubscriptionStatus,
  useCreateCheckout,
  useCreatePortal,
  useCancelSubscription,
} from './hooks/useSubscription';

// Assets type exports (Module 1: Assets Management)
// Note: Job, Asset, JobListResponse, JobFilters, JobStatus, AssetType are already exported
// from './types/generation' with compatible interfaces. The types in './types/assets' 
// provide the same interface for direct API usage with snake_case transformation.
export type {
  Job as AssetManagementJob,
  Asset as AssetManagementAsset,
  JobListResponse as AssetManagementJobListResponse,
  JobFilters as AssetManagementJobFilters,
} from './types/assets';

// Assets hooks exports (Module 1: Assets Management)
export {
  assetKeys,
  useAssetJobs,
  useAssetJob,
  useAssetJobAssets,
} from './hooks/useAssets';

// Brand Kit Extended type exports (Module 3: Brand Kit Extended Fields)
export type {
  ExtendedColorInput,
  GradientStopInput,
  GradientInput,
  ColorPaletteInput,
  ColorPaletteResponseData,
  FontConfigInput,
  TypographyInput,
  TypographyResponseData,
  BrandVoiceInput,
  VoiceResponseData,
  BrandGuidelinesInput,
  GuidelinesResponseData,
  SupportedFont,
  FontWeight,
  ExtendedToneType,
} from './types/brandKitExtended';

export {
  SUPPORTED_FONTS as EXTENDED_SUPPORTED_FONTS,
  FONT_WEIGHTS as EXTENDED_FONT_WEIGHTS,
  EXTENDED_TONES,
  DEFAULT_COLOR_PALETTE,
  DEFAULT_TYPOGRAPHY,
  DEFAULT_BRAND_VOICE,
  DEFAULT_BRAND_GUIDELINES,
  LIMITS as BRAND_KIT_LIMITS,
} from './types/brandKitExtended';

// Brand Kit Extended hooks exports (Module 3: Brand Kit Extended Fields)
export {
  brandKitExtendedKeys,
  useExtendedColors,
  useUpdateExtendedColors,
  useTypography,
  useUpdateTypography,
  useBrandVoice,
  useUpdateBrandVoice,
  useBrandGuidelines,
  useUpdateBrandGuidelines,
} from './hooks/useBrandKitExtended';

// Auth Extended type exports (Module 5: Auth Extended)
export type {
  PasswordResetRequest,
  PasswordResetConfirm,
  ProfileUpdate,
  PasswordChange,
  AccountDelete,
  MessageResponse,
} from './types/auth';

// Auth Extended hooks exports (Module 5: Auth Extended)
export {
  authExtendedKeys,
  useRequestPasswordReset,
  useConfirmPasswordReset,
  useRequestEmailVerification,
  useUpdateProfile,
  useChangePassword,
  useDeleteAccount,
} from './hooks/useAuthExtended';

// Optimistic Update hooks exports
export {
  useOptimisticBrandKitActivation,
} from './hooks/useOptimisticBrandKitActivation';
export type {
  UseOptimisticBrandKitActivationOptions,
} from './hooks/useOptimisticBrandKitActivation';

export {
  useOptimisticBrandKitDeletion,
} from './hooks/useOptimisticBrandKitDeletion';
export type {
  UseOptimisticBrandKitDeletionOptions,
} from './hooks/useOptimisticBrandKitDeletion';

export {
  useOptimisticAssetDeletion,
  useOptimisticBulkAssetDeletion,
} from './hooks/useOptimisticAssetDeletion';
export type {
  UseOptimisticAssetDeletionOptions,
  UseOptimisticBulkAssetDeletionOptions,
} from './hooks/useOptimisticAssetDeletion';

// Dimension utilities for auto-injection
export {
  DIMENSION_SPECS,
  getDimensionInfo,
  getDimensionLabel,
  getOrientation,
} from './utils/dimensions';
export type { DimensionSpec } from './utils/dimensions';

// Usage type exports
export type {
  UsageStats,
  SubscriptionTier as UsageTier,
  TIER_DISPLAY,
} from './types/usage';

// Community Gallery type exports
export type {
  ReportReason,
  ReportStatus,
  PostSortOption,
  UserSummary,
  CommunityPost,
  CommunityPostWithAuthor,
  CommunityComment,
  CommentWithAuthor,
  CommunityUserStats,
  CreatorProfile,
  PaginatedResponse,
  PaginatedPosts,
  PaginatedComments,
  PaginatedUsers,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  ReportPostRequest,
  PostFilters,
  CommentFilters,
  Report,
  ReviewReportRequest,
  PaginatedReports,
} from './types/community';

// Community Gallery hooks exports
export {
  communityKeys,
  transformUserSummary,
  transformPost,
  transformComment,
  transformProfile,
  useCommunityPosts,
  useCommunityPost,
  useFeaturedPosts,
  useTrendingPosts,
  useSearchPosts,
  useMyPosts,
  useLikedPosts,
  useFollowingFeed,
  useComments,
  useCreatorProfile,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useLikePost,
  useUnlikePost,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useFollowUser,
  useUnfollowUser,
  useReportPost,
  useSpotlightCreators,
} from './hooks/useCommunity';

export type { SpotlightCreator } from './hooks/useCommunity';

// Promo Board type exports
export type {
  PromoPaymentStatus,
  PromoCheckoutRequest,
  PromoCheckoutResponse,
  UserBadges,
  PromoMessageAuthor,
  LinkPreview,
  PromoMessage,
  PromoMessagesListResponse,
  LeaderboardEntry,
  LeaderboardResponse,
} from './types/promo';

// Promo Board hooks exports
export {
  promoKeys,
  usePromoMessages,
  usePinnedMessage,
  useLeaderboard,
  usePromoCheckout,
  useDeletePromoMessage,
} from './hooks/usePromo';

// Aura Lab type exports
export type {
  RarityType,
  RarityScores,
  SetSubjectResponse,
  FuseRequest,
  FuseResponse,
  FusionItem,
  InventoryResponse,
  InventoryFilters,
  UsageResponse as AuraLabUsageResponse,
  Element as AuraLabElement,
  ElementsResponse,
  SuccessResponse as AuraLabSuccessResponse,
} from './types/auraLab';

// Aura Lab hooks exports
export {
  auraLabKeys,
  useSetSubject,
  useFuse,
  useKeepFusion,
  useTrashFusion,
  useAuraLabInventory,
  useAuraLabUsage,
  useAuraLabElements,
} from './hooks/useAuraLab';

// Vibe Branding type exports
export type {
  LightingMood,
  BrandTone,
  Fonts as VibeBrandingFonts,
  VibeAnalysis,
  AnalyzeResponse as VibeBrandingAnalyzeResponse,
  AnalyzeUrlRequest,
  AnalyzeUploadOptions,
  UsageResponse as VibeBrandingUsageResponse,
} from './types/vibeBranding';

// Vibe Branding hooks exports
export {
  vibeBrandingKeys,
  useAnalyzeImage,
  useAnalyzeUrl,
  useVibeBrandingUsage,
} from './hooks/useVibeBranding';

// Usage Limits type exports
export type {
  SubscriptionTier as UsageLimitsTier,
  FeatureUsage,
  UsageStatus,
  UsageCheckResponse,
  FeatureType,
} from './types/usageLimits';

export {
  TIER_LIMITS,
  FEATURE_CONFIG,
} from './types/usageLimits';

// Usage Limits hooks exports
export {
  usageLimitsKeys,
  useUsageStatus,
  useUsageCheck,
  useInvalidateUsage,
  useUsageLimits,
} from './hooks/useUsageLimits';

// Templates type exports
export type {
  FieldOption,
  TemplateField,
  VibeOption as TemplateVibeOption,
  TemplateMeta,
} from './hooks/useTemplates';

// Templates hooks exports
export {
  useTemplates,
  useTemplate,
} from './hooks/useTemplates';

// Profile Creator type exports
export type {
  CreationType,
  StylePreset,
  StreamChunk,
  StartProfileCreatorRequest,
  GenerateFromSessionRequest,
  ProfileCreatorAccessResponse,
  SessionStateResponse,
  GenerationResultResponse,
  GalleryResponse,
  GalleryItem,
  BrandContext as ProfileCreatorBrandContext,
  ColorInfo as ProfileCreatorColorInfo,
} from './types/profileCreator';

export { STYLE_PRESETS } from './types/profileCreator';

// Profile Creator hooks exports
export {
  profileCreatorKeys,
  useProfileCreatorAccess,
  useProfileCreatorSession,
  useProfileCreatorGallery,
  useGenerateFromSession,
  getStartSessionUrl,
  getContinueSessionUrl,
  transformStartRequest,
} from './hooks/useProfileCreator';


// Social (Friends & Messages) type exports
export type {
  Friend,
  FriendRequest,
  FriendsListResponse,
  UserSearchResult,
  UserSearchResponse,
  FriendActionResponse,
  Message,
  LastMessage,
  Conversation,
  ConversationListResponse,
  MessageHistoryResponse,
  BlockedUser,
  BlockedUsersListResponse,
  SendFriendRequest,
  SendMessageRequest,
} from './types/social';

// Friends hooks exports
export {
  friendsKeys,
  useFriendsList,
  useUserSearch,
  useBlockedUsers,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useBlockUser,
  useUnblockUser,
} from './hooks/useFriends';

// Messages hooks exports
export {
  messagesKeys,
  useConversations,
  useMessageHistory,
  useUnreadCount,
  useSendMessage,
  useMarkAsRead,
  useLoadOlderMessages,
} from './hooks/useMessages';


// Analytics Dashboard type exports
export type {
  DashboardSummary,
  TrendDataPoint,
  TopPage,
  RecentSignup,
  AssetTypeStats,
  GenerationStats,
} from './hooks/useAnalyticsDashboard';

// Analytics Dashboard hooks exports
export {
  useAnalyticsSummary,
  useAnalyticsTrend,
  useTopPages,
  useRecentSignups,
  useGenerationStats,
  useAnalyticsDashboard,
} from './hooks/useAnalyticsDashboard';


// Clip Radar type exports
export type {
  ViralClip,
  FreshClip,
  ViralClipsResponse,
  FreshClipsResponse,
  RadarStatus,
  TrackedCategory,
  RecapClip,
  DailyRecap,
  CategorySummary,
  CategoryRecap,
  HourlyActivity,
  RecapListResponse,
  PollResult,
  CategoryPollResult,
} from './types/clipRadar';

// Clip Radar hooks exports
export {
  clipRadarKeys,
  useViralClips,
  useFreshClips,
  useRadarStatus,
  useTrackedCategories,
  useRecentRecaps,
  useDailyRecap,
  useCategoryRecap,
  useTriggerPoll,
  useCreateRecap,
} from './hooks/useClipRadar';


// Intel type exports
export type {
  UserIntelPreferences,
  UpdatePreferencesRequest,
  AvailableCategory,
  CategorySubscription,
  SubscribeCategoryRequest,
  SubscribeCategoryResponse,
  UnsubscribeCategoryResponse,
  TodaysMission,
  IntelDashboardData,
  TrackActivityRequest,
  PanelType,
  PanelConfig,
  PanelSize,
  // NEW: Intel redesign header badge types
  MarketOpportunityData as IntelMarketOpportunityData,
  DailyAssetsData as IntelDailyAssetsData,
  EnhancedDailyBrief,
} from './types/intel';

// Intel hooks exports
export {
  intelKeys,
  useIntelPreferences,
  useAvailableCategories,
  useIntelMission,
  useActivitySummary,
  useUpdateIntelPreferences,
  useSubscribeCategory,
  useUnsubscribeCategory,
  useTrackActivity,
  useMissionActed,
  // Title Intelligence hooks
  useTitleIntel,
  useTagIntel,
  useAllTitlesIntel,
  useVideoIdeas,
  useDailyInsight,
} from './hooks/useIntel';

// Re-export video ideas types (renamed to avoid collision with playbook VideoIdea)
export type {
  VideoIdea as SynthesizedVideoIdea,
  VideoIdeasResponse as SynthesizedVideoIdeasResponse,
  DailyInsight,
} from './hooks/useIntel';

export type { 
  ActivitySummary,
  // Title Intelligence types
  TitlePattern,
  TitleKeyword,
  TitleFormula as IntelTitleFormula,
  GameTitleIntel,
  TagIntel,
  GameTagIntel,
  AllGamesIntelSummary,
} from './hooks/useIntel';

// Creator Media Library type exports
export type {
  MediaAssetType,
  MediaAsset,
  MediaSummary,
  MediaForPrompt,
  UploadMediaRequest,
  UpdateMediaRequest,
  ListMediaParams,
  UploadMediaResponse,
  ListMediaResponse,
  MediaLibrarySummaryResponse,
  DeleteMediaResponse,
  BulkDeleteMediaResponse,
  AssetTypesResponse,
  SelectedMediaForGeneration,
  LogoMetadata,
  FaceMetadata,
  CharacterMetadata,
  GameSkinMetadata,
  ObjectMetadata,
  BackgroundMetadata,
  ReferenceMetadata,
  MediaAccessResponse,
} from './types/creatorMedia';

export {
  MEDIA_ASSET_TYPES,
  ASSET_TYPE_LABELS as MEDIA_ASSET_TYPE_LABELS,
  ASSET_TYPE_DESCRIPTIONS as MEDIA_ASSET_TYPE_DESCRIPTIONS,
  TOTAL_ASSET_LIMIT,
  MAX_PROMPT_INJECTION_ASSETS,
  ALLOWED_TIERS as MEDIA_ALLOWED_TIERS,
  BG_REMOVAL_DEFAULT_TYPES,
  BG_REMOVAL_EXCLUDED_TYPES,
  shouldRemoveBackgroundByDefault,
  canRemoveBackground,
  serializePlacements,
} from './types/creatorMedia';

// Asset Placement type exports
export type {
  PositionAnchor,
  SizeUnit,
  AssetPosition,
  AssetSize,
  AssetPlacement,
  SerializedPlacement,
} from './types/creatorMedia';

// Creator Media Library hooks exports
export {
  creatorMediaKeys,
  useMediaAccess,
  useMediaLibrary,
  useInfiniteMediaLibrary,
  useMediaAsset,
  useMediaSummary,
  useAssetTypes,
  usePrimaryAsset,
  useUploadMedia,
  useUpdateMedia,
  useDeleteMedia,
  useBulkDeleteMedia,
  useToggleFavorite,
  useSetPrimary,
  useMediaForPrompt,
  useGetMediaForPrompt,
} from './hooks/useCreatorMedia';

// Canvas Snapshot hooks exports
export {
  useUploadCanvasSnapshot,
  blobToBase64,
  dataUrlToBase64,
} from './hooks/useCanvasSnapshot';
export type {
  CanvasSnapshotUploadRequest,
  CanvasSnapshotUploadResponse,
} from './hooks/useCanvasSnapshot';

// Trends type exports
export type {
  DailyBrief,
  ThumbnailOfDay,
  YouTubeHighlight,
  TwitchHighlight,
  TwitchClip,
  HotGame,
  Insight,
  ThumbnailAnalysis as TrendThumbnailAnalysis,
  VelocityAlert,
  TimingRecommendation,
  TitlePatterns,
  ThumbnailPatterns,
  TrendHistoryResponse,
  TrendCategory,
  TrendingKeyword,
  TrendingKeywordsResponse,
  YouTubeGameTrendingRequest,
  YouTubeGameTrendingResponse,
  AvailableGame,
  AvailableGamesResponse,
  // NEW: Intel redesign header badge types
  MarketOpportunityData,
  DailyAssetsData,
} from './types/trends';

// Trends hooks exports
export {
  trendsKeys,
  useDailyBrief,
  useYouTubeTrending,
  useTwitchLive,
  useTwitchGames,
  useTwitchClips,
  useTrendingKeywords,
  useThumbnailAnalysis,
  useVelocityAlerts,
  useTiming,
  useTrendHistory,
  useAvailableGames,
  useYouTubeGameTrending,
  useYouTubeSearch,
  useCrossPlatformTrends,
  // NEW: Transform functions for Intel redesign
  transformMarketOpportunity,
  transformDailyAssets,
  transformDailyBrief,
} from './hooks/useTrends';

export type { CrossPlatformData, RisingCreator } from './hooks/useTrends';

// Thumbnail Intel type exports
export type {
  ThumbnailAnalysis,
  CategoryInsight,
  ThumbnailIntelOverview,
  CategoryListItem,
} from './types/thumbnailIntel';

// Thumbnail Intel hooks exports
export {
  thumbnailIntelKeys,
  useThumbnailCategories,
  useThumbnailIntelOverview,
  useCategoryInsight,
  useAnalyzeThumbnail,
} from './hooks/useThumbnailIntel';

export type { AnalyzeThumbnailResult } from './hooks/useThumbnailIntel';

// Thumbnail Recreation type exports
export type {
  RecreateRequest,
  RecreateResponse,
  RecreationStatus,
  RecreationHistoryItem,
  RecreationHistory,
  FaceAsset,
  FaceAssetsResponse,
  UploadFaceRequest,
  UploadFaceResponse,
} from './types/thumbnailRecreate';

// Thumbnail Recreation hooks exports
export {
  thumbnailRecreateKeys,
  useRecreateThumbnail,
  useRecreationStatus,
  useRecreationHistory,
  useFaceAssets,
  useUploadFace,
  useDeleteFace,
} from './hooks/useThumbnailRecreate';

// Playbook type exports
export type {
  StrategyPriority,
  ContentType,
  DifficultyLevel,
  ImpactLevel,
  PlaybookMood,
  TimeSensitivity,
  HookType,
  CardType,
  CardColorTheme,
  CompetitionLevel,
  ViewerAvailability,
  GrowthPotential,
  GoldenHourWindow,
  WeeklyTimeSlot,
  WeeklySchedule,
  NicheOpportunity,
  ViralHook,
  TitleFormula,
  ThumbnailRecipe,
  ContentStrategy,
  VideoIdea,
  InsightCard,
  TodaysPlaybook,
  PlaybookReportSummary,
} from './types/playbook';

// Playbook hooks exports
export {
  playbookKeys,
  useLatestPlaybook,
  usePlaybookReports,
  usePlaybookReport,
  useUnviewedPlaybookCount,
} from './hooks/usePlaybook';

// Profile Creator additional exports (OUTPUT_SIZES, etc.)
export { OUTPUT_SIZES } from './types/profileCreator';
export type {
  OutputSize,
  OutputFormat,
  BackgroundType,
} from './types/profileCreator';

// Trends additional type exports
export type {
  GameFilter,
  SortBy,
  SortOrder,
} from './types/trends';


// Intel V2 type exports (Creator Intel V2 - Enterprise Analytics)
export type {
  // Common types
  IntelConfidence,
  
  // Content Format types
  DurationBucket,
  FormatComparison,
  ContentFormatIntel,
  
  // Description types
  HashtagAnalysis,
  TimestampPattern,
  SponsorPattern,
  DescriptionIntel,
  
  // Semantic types
  TopicCluster,
  TagCluster as SemanticTagCluster,
  SemanticIntel,
  
  // Regional types
  LanguageMetrics,
  RegionalIntel,
  
  // Live Stream types
  PremiereAnalysis,
  ScheduleTimeSlot,
  DurationComparison,
  LiveStreamIntel,
  
  // Combined types
  CombinedIntel,
  
  // Health types
  ComponentHealth,
  IntelHealth,
  
  // Orchestrator types
  TaskStatus,
  QuotaStatus,
  OrchestratorMetrics,
  OrchestratorStatus,
  IntelCategory,
} from './hooks/useIntelV2';

// Intel V2 hooks exports (Creator Intel V2 - Enterprise Analytics)
export {
  intelV2Keys,
  useContentFormatIntel,
  useDescriptionIntel,
  useSemanticIntel,
  useRegionalIntel,
  useLiveStreamIntel,
  useCombinedIntel,
  useIntelHealth,
  useOrchestratorStatus,
  useIntelCategories,
} from './hooks/useIntelV2';


// SSE (Server-Sent Events) exports
export {
  ResilientEventSource,
  useResilientSSE,
} from './sse';
export type {
  SSEEvent,
  ResilientSSEOptions,
  ResilientSSEState,
  UseResilientSSEOptions,
  UseResilientSSEResult,
} from './sse';
