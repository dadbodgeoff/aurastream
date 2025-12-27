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
