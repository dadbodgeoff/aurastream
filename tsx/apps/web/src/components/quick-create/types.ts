/**
 * Quick Create - Type Definitions
 */

export type TemplateCategory = 'all' | 'stream' | 'social' | 'twitch';
export type WizardStep = 'select' | 'customize' | 'review';

/** Vibe preset identifiers - maps to backend YAML vibes */
export type VibePreset = string;

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'time' | 'dynamic_select' | 'color';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  maxLength?: number;
  /** Helper text shown below the field */
  hint?: string;
  /** Description shown as tooltip or secondary text */
  description?: string;
  /** Default value for the field */
  default?: string;
  /** For dynamic_select: which field this depends on */
  dependsOn?: string;
  /** For dynamic_select: map of parent value -> options */
  optionsMap?: Record<string, { value: string; label: string }[]>;
  /** Only show this field when one of these vibes is selected */
  showForVibes?: string[];
}

/** Vibe option shown to user (no prompt exposed) */
export interface VibeOption {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  gradient: string;
}

export interface QuickTemplate {
  id: string;
  name: string;
  tagline: string;
  category: 'stream' | 'social' | 'twitch';
  assetType: string;
  dimensions: string;
  emoji: string;
  fields: TemplateField[];
  /** User-facing style description (no prompt details) */
  previewStyle: string;
  /** Available vibe presets for this template */
  vibes: VibeOption[];
}

export interface QuickCreateState {
  step: WizardStep;
  selectedCategory: TemplateCategory;
  selectedTemplate: QuickTemplate | null;
  selectedVibe: string;
  formValues: Record<string, string>;
  brandKitId: string;
  includeLogo: boolean;
  logoPosition: string;
  logoSize: string;
}
