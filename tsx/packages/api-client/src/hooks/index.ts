/**
 * API Client Hooks Index
 *
 * Re-exports all TanStack Query hooks for the AuraStream API client.
 *
 * @module hooks
 */

// Brand Kit hooks
export {
  brandKitKeys,
  useBrandKits,
  useBrandKit,
  useActiveBrandKit,
  useCreateBrandKit,
  useUpdateBrandKit,
  useDeleteBrandKit,
  useActivateBrandKit,
} from './useBrandKits';

// Brand Kit Extended hooks
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
} from './useBrandKitExtended';

// Logo hooks
export {
  logoKeys,
  useLogos,
  useLogo,
  useUploadLogo,
  useDeleteLogo,
  useSetDefaultLogo,
} from './useLogos';
export type {
  LogoUploadResponse,
  LogoListResponse,
  LogoUrlResponse,
  LogoDeleteResponse,
} from './useLogos';

// Generation hooks
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
} from './useGeneration';

// Asset hooks
export {
  assetKeys,
  useAssetJobs,
  useAssetJob,
  useAssetJobAssets,
  usePublicAsset,
} from './useAssets';

// Twitch hooks
export {
  twitchKeys,
  useTwitchDimensions,
  useGameMeta,
  usePack,
  useGenerateTwitchAsset,
  useGeneratePack,
} from './useTwitch';

// Subscription hooks
export {
  subscriptionKeys,
  useSubscriptionStatus,
  useCreateCheckout,
  useCreatePortal,
  useCancelSubscription,
} from './useSubscription';

// Auth Extended hooks
export {
  authExtendedKeys,
  useRequestPasswordReset,
  useConfirmPasswordReset,
  useRequestEmailVerification,
  useUpdateProfile,
  useChangePassword,
  useDeleteAccount,
} from './useAuthExtended';

// Optimistic Update hooks
export {
  useOptimisticBrandKitActivation,
} from './useOptimisticBrandKitActivation';
export type {
  UseOptimisticBrandKitActivationOptions,
} from './useOptimisticBrandKitActivation';

export {
  useOptimisticBrandKitDeletion,
} from './useOptimisticBrandKitDeletion';
export type {
  UseOptimisticBrandKitDeletionOptions,
} from './useOptimisticBrandKitDeletion';

export {
  useOptimisticAssetDeletion,
  useOptimisticBulkAssetDeletion,
} from './useOptimisticAssetDeletion';
export type {
  UseOptimisticAssetDeletionOptions,
  UseOptimisticBulkAssetDeletionOptions,
} from './useOptimisticAssetDeletion';

// Community Gallery hooks
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
} from './useCommunity';

// Creator Media Library hooks
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
} from './useCreatorMedia';

// Canvas Snapshot hooks
export {
  useUploadCanvasSnapshot,
  blobToBase64,
  dataUrlToBase64,
} from './useCanvasSnapshot';
export type {
  CanvasSnapshotUploadRequest,
  CanvasSnapshotUploadResponse,
} from './useCanvasSnapshot';
