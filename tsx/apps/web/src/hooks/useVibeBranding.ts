/**
 * Re-export Vibe Branding hooks from api-client package.
 * 
 * @deprecated Import directly from '@aurastream/api-client' instead.
 */
export {
  useAnalyzeImage,
  useAnalyzeUrl,
  useVibeBrandingUsage,
} from '@aurastream/api-client';

// Re-export types for backwards compatibility
export type {
  VibeAnalysis,
  AnalyzeResponse,
  UsageResponse,
} from '@/components/vibe-branding/types';
