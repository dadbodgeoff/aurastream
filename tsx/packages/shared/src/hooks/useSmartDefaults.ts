/**
 * Smart Defaults Hook
 * Provides easy access to form defaults and auto-save functionality
 *
 * Features:
 * - Retrieves saved form values from preferences store
 * - Auto-saves form values on change (optional)
 * - Provides suggested values based on history
 * - Integrates with last used brand kit, asset type, etc.
 *
 * @module hooks/useSmartDefaults
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePreferencesStore } from '../stores/preferencesStore';
import type {
  FormValues,
  SmartDefaultsResult,
  UseSmartDefaultsOptions,
} from '../types/preferences';

/**
 * Debounce delay for auto-save (in milliseconds)
 */
const AUTO_SAVE_DEBOUNCE_MS = 500;

/**
 * Hook for managing smart defaults and form history
 *
 * Provides intelligent defaults for forms based on user history,
 * with optional auto-save functionality.
 *
 * @param options - Configuration options
 * @param options.formId - Unique identifier for the form
 * @param options.autoSave - Whether to auto-save on value changes (default: false)
 * @returns Smart defaults utilities and values
 *
 * @example
 * ```typescript
 * import { useSmartDefaults } from '@aurastream/shared';
 *
 * function GenerateForm() {
 *   const {
 *     getDefault,
 *     getFormDefaults,
 *     saveValues,
 *     lastBrandKitId,
 *     lastAssetType,
 *   } = useSmartDefaults({ formId: 'generate-form' });
 *
 *   // Get a specific default with fallback
 *   const defaultPrompt = getDefault('prompt', 'Create an awesome emote');
 *
 *   // Get all form defaults
 *   const defaults = getFormDefaults();
 *
 *   // Save current form values
 *   const handleSubmit = (values: FormValues) => {
 *     saveValues(values);
 *     // ... submit logic
 *   };
 *
 *   return (
 *     <form>
 *       <input defaultValue={defaultPrompt} />
 *       <select defaultValue={lastBrandKitId ?? undefined}>
 *         {/* brand kit options *\/}
 *       </select>
 *     </form>
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With auto-save enabled
 * function AutoSaveForm() {
 *   const { getFormDefaults, saveValues } = useSmartDefaults({
 *     formId: 'auto-save-form',
 *     autoSave: true,
 *   });
 *
 *   const [values, setValues] = useState(getFormDefaults());
 *
 *   // Values are automatically saved when they change
 *   useEffect(() => {
 *     saveValues(values);
 *   }, [values, saveValues]);
 *
 *   return <form>{/* form fields *\/}</form>;
 * }
 * ```
 */
export function useSmartDefaults(options: UseSmartDefaultsOptions): SmartDefaultsResult {
  const { formId, autoSave = false } = options;

  // Get store values and actions
  const lastBrandKitId = usePreferencesStore((state) => state.lastBrandKitId);
  const lastAssetType = usePreferencesStore((state) => state.lastAssetType);
  const lastLogoPosition = usePreferencesStore((state) => state.lastLogoPosition);
  const lastLogoSize = usePreferencesStore((state) => state.lastLogoSize);
  const formHistory = usePreferencesStore((state) => state.formHistory);
  const saveFormValues = usePreferencesStore((state) => state.saveFormValues);

  // Debounce timer ref for auto-save
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Get default value for a specific field
   */
  const getDefault = useCallback(
    (fieldName: string, fallback?: string): string | undefined => {
      const formDefaults = formHistory[formId];
      if (formDefaults && fieldName in formDefaults) {
        return formDefaults[fieldName];
      }
      return fallback;
    },
    [formHistory, formId]
  );

  /**
   * Get all defaults for the form
   */
  const getFormDefaults = useCallback((): FormValues => {
    return formHistory[formId] ?? {};
  }, [formHistory, formId]);

  /**
   * Save form values (with optional debouncing for auto-save)
   */
  const saveValues = useCallback(
    (values: FormValues) => {
      if (autoSave) {
        // Debounce auto-save to prevent excessive writes
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          saveFormValues(formId, values);
        }, AUTO_SAVE_DEBOUNCE_MS);
      } else {
        // Immediate save when not auto-saving
        saveFormValues(formId, values);
      }
    },
    [autoSave, formId, saveFormValues]
  );

  return {
    getDefault,
    getFormDefaults,
    saveValues,
    lastBrandKitId,
    lastAssetType,
    lastLogoPosition,
    lastLogoSize,
  };
}

/**
 * Hook for tracking and saving the last used brand kit
 *
 * @returns Tuple of [lastBrandKitId, setLastBrandKit]
 *
 * @example
 * ```typescript
 * import { useLastBrandKit } from '@aurastream/shared';
 *
 * function BrandKitSelector() {
 *   const [lastBrandKitId, setLastBrandKit] = useLastBrandKit();
 *
 *   return (
 *     <select
 *       defaultValue={lastBrandKitId ?? undefined}
 *       onChange={(e) => setLastBrandKit(e.target.value)}
 *     >
 *       {/* options *\/}
 *     </select>
 *   );
 * }
 * ```
 */
export function useLastBrandKit(): [string | null, (id: string) => void] {
  const lastBrandKitId = usePreferencesStore((state) => state.lastBrandKitId);
  const setLastBrandKit = usePreferencesStore((state) => state.setLastBrandKit);
  return [lastBrandKitId, setLastBrandKit];
}

/**
 * Hook for tracking and saving the last used asset type
 *
 * @returns Tuple of [lastAssetType, setLastAssetType]
 *
 * @example
 * ```typescript
 * import { useLastAssetType } from '@aurastream/shared';
 *
 * function AssetTypeSelector() {
 *   const [lastAssetType, setLastAssetType] = useLastAssetType();
 *
 *   return (
 *     <select
 *       defaultValue={lastAssetType ?? undefined}
 *       onChange={(e) => setLastAssetType(e.target.value)}
 *     >
 *       {/* options *\/}
 *     </select>
 *   );
 * }
 * ```
 */
export function useLastAssetType(): [string | null, (type: string) => void] {
  const lastAssetType = usePreferencesStore((state) => state.lastAssetType);
  const setLastAssetType = usePreferencesStore((state) => state.setLastAssetType);
  return [lastAssetType, setLastAssetType];
}

/**
 * Hook for accessing feature preferences (sound, celebrations)
 *
 * @returns Feature preferences and setters
 *
 * @example
 * ```typescript
 * import { useFeaturePreferences } from '@aurastream/shared';
 *
 * function SettingsPanel() {
 *   const {
 *     soundEnabled,
 *     reducedCelebrations,
 *     setSoundEnabled,
 *     setReducedCelebrations,
 *   } = useFeaturePreferences();
 *
 *   return (
 *     <div>
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={soundEnabled}
 *           onChange={(e) => setSoundEnabled(e.target.checked)}
 *         />
 *         Enable sounds
 *       </label>
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={reducedCelebrations}
 *           onChange={(e) => setReducedCelebrations(e.target.checked)}
 *         />
 *         Reduced celebrations
 *       </label>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFeaturePreferences() {
  const soundEnabled = usePreferencesStore((state) => state.soundEnabled);
  const reducedCelebrations = usePreferencesStore((state) => state.reducedCelebrations);
  const setSoundEnabled = usePreferencesStore((state) => state.setSoundEnabled);
  const setReducedCelebrations = usePreferencesStore((state) => state.setReducedCelebrations);

  return {
    soundEnabled,
    reducedCelebrations,
    setSoundEnabled,
    setReducedCelebrations,
  };
}
