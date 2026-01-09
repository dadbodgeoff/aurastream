/**
 * Stream Packs Module
 * 
 * Template-first stream package creation system.
 * Users browse pre-made visual packages, customize variables,
 * and AI regenerates the package with their customizations.
 */

export { StreamPacksGallery } from './StreamPacksGallery';
export { PackCard } from './PackCard';
export { PackCustomizer } from './PackCustomizer';

export type {
  StreamPack,
  PackCategory,
  PackAssetType,
  PackAsset,
  PackCustomization,
  PackGenerationRequest,
  PackGenerationJob,
  SocialPlatform,
  SocialPlatformInfo,
  ColorScheme,
  StreamPacksGalleryProps,
  PackCardProps,
  PackCustomizerProps,
  PackPreviewProps,
} from './types';

export { SOCIAL_PLATFORMS, DEFAULT_COLOR_SCHEMES } from './types';
export { SAMPLE_PACKS } from './data/samplePacks';
