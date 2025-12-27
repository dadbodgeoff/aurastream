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
