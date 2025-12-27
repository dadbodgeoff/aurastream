/**
 * Preferences Types
 * Type definitions for the smart defaults/preferences system
 *
 * @module types/preferences
 */

/**
 * Logo position options for asset generation
 */
export type LogoPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Logo size options for asset generation
 */
export type LogoSize = 'small' | 'medium' | 'large' | 'extra-large';

/**
 * Form field values stored in history
 */
export type FormValues = Record<string, string>;

/**
 * Form history keyed by form ID
 */
export type FormHistory = Record<string, FormValues>;

/**
 * Preferences state interface
 * Stores user preferences and smart defaults for the application
 */
export interface PreferencesState {
  // Last used values
  /** Last selected brand kit ID */
  lastBrandKitId: string | null;
  /** Last selected asset type */
  lastAssetType: string | null;
  /** Last selected logo position */
  lastLogoPosition: string | null;
  /** Last selected logo size */
  lastLogoSize: string | null;

  // Form history (keyed by form ID)
  /** Stored form values keyed by form identifier */
  formHistory: FormHistory;

  // Feature preferences
  /** Whether sound effects are enabled */
  soundEnabled: boolean;
  /** Whether to use reduced/minimal celebrations */
  reducedCelebrations: boolean;

  // Actions
  /** Set the last used brand kit ID */
  setLastBrandKit: (id: string) => void;
  /** Set the last used asset type */
  setLastAssetType: (type: string) => void;
  /** Set the last used logo position */
  setLastLogoPosition: (position: string) => void;
  /** Set the last used logo size */
  setLastLogoSize: (size: string) => void;
  /** Save form values for a specific form */
  saveFormValues: (formId: string, values: FormValues) => void;
  /** Get saved form defaults for a specific form */
  getFormDefaults: (formId: string) => FormValues;
  /** Enable or disable sound effects */
  setSoundEnabled: (enabled: boolean) => void;
  /** Enable or disable reduced celebrations */
  setReducedCelebrations: (reduced: boolean) => void;
  /** Clear all history and reset to defaults */
  clearHistory: () => void;
}

/**
 * Persisted preferences data (without actions)
 * Used for localStorage serialization
 */
export interface PersistedPreferences {
  lastBrandKitId: string | null;
  lastAssetType: string | null;
  lastLogoPosition: string | null;
  lastLogoSize: string | null;
  formHistory: FormHistory;
  soundEnabled: boolean;
  reducedCelebrations: boolean;
}

/**
 * Smart defaults hook return type
 */
export interface SmartDefaultsResult {
  /** Get default value for a specific field */
  getDefault: (fieldName: string, fallback?: string) => string | undefined;
  /** Get all defaults for a form */
  getFormDefaults: () => FormValues;
  /** Save current form values */
  saveValues: (values: FormValues) => void;
  /** Last used brand kit ID */
  lastBrandKitId: string | null;
  /** Last used asset type */
  lastAssetType: string | null;
  /** Last used logo position */
  lastLogoPosition: string | null;
  /** Last used logo size */
  lastLogoSize: string | null;
}

/**
 * Options for the useSmartDefaults hook
 */
export interface UseSmartDefaultsOptions {
  /** Unique identifier for the form */
  formId: string;
  /** Whether to auto-save on value changes */
  autoSave?: boolean;
}
