export { useMediaQuery } from './useMediaQuery';
export { useIsMobile } from './useIsMobile';
export { useTouchDevice } from './useTouchDevice';
export { useScrollLock } from './useScrollLock';
export { useFocusTrap } from './useFocusTrap';
export { useSoundEffects } from './useSoundEffects';
export type { SoundEffect, UseSoundEffectsReturn } from './useSoundEffects';
export { useGenerationCelebration } from './useGenerationCelebration';
export type { CelebrationAsset, UseGenerationCelebrationReturn } from './useGenerationCelebration';
export { useUndo } from './useUndo';
export type { UseUndoReturn } from './useUndo';
export { useFormValidation, validationRules } from './useFormValidation';
export type {
  ValidationRule,
  FieldState,
  UseFormValidationOptions,
  UseFormValidationReturn,
} from './useFormValidation';
export { useViewTransition, ViewTransitionLink } from './useViewTransition';
export type { ViewTransitionLinkProps } from './useViewTransition';
export { useMicroInteraction } from './useMicroInteraction';
export type { MicroInteractionType } from './useMicroInteraction';
export { useCoachAccess } from './useCoachAccess';
export type { UseCoachAccessReturn } from './useCoachAccess';
export { useDownload } from './useDownload';
export type { UseDownloadOptions, DownloadState } from './useDownload';
export { 
  useRedirectToast, 
  clearAllRedirectToasts, 
  clearRedirectToast, 
  isRedirectToastShown,
  REDIRECT_MESSAGES,
} from './useRedirectToast';
export type { 
  RedirectKey, 
  UseRedirectToastOptions, 
  UseRedirectToastReturn,
} from './useRedirectToast';
export { useCreateDraft } from './useCreateDraft';
export type { UseCreateDraftOptions, UseCreateDraftReturn } from './useCreateDraft';

// Aura Lab hooks - re-exported from api-client for convenience
export {
  useSetSubject,
  useFuse,
  useKeepFusion,
  useTrashFusion,
  useAuraLabInventory,
  useAuraLabUsage,
  useAuraLabElements,
} from '@aurastream/api-client';
