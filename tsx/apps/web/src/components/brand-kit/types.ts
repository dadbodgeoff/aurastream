/**
 * Brand Kit Suite - Type Definitions
 * Enterprise-grade type system for the unified brand kit management
 */

import type {
  BrandKitTone,
  ColorPaletteInput,
  TypographyInput,
  BrandVoiceInput,
  BrandGuidelinesInput,
  LogoType,
} from '@aurastream/api-client';

// ============================================================================
// Panel Configuration
// ============================================================================

export type PanelId = 
  | 'overview'
  | 'identity'
  | 'logos'
  | 'colors'
  | 'typography'
  | 'voice'
  | 'guidelines';

export interface PanelConfig {
  id: PanelId;
  label: string;
  icon: string;
  description: string;
  isOptional: boolean;
}

export const PANEL_CONFIG: PanelConfig[] = [
  { id: 'overview', label: 'Overview', icon: '🏠', description: 'Brand kit summary and quick actions', isOptional: false },
  { id: 'identity', label: 'Identity', icon: '✨', description: 'Name, colors, and basic settings', isOptional: true },
  { id: 'logos', label: 'Logos', icon: '🖼️', description: 'Upload and manage brand logos', isOptional: true },
  { id: 'colors', label: 'Colors', icon: '🎨', description: 'Extended color palette and gradients', isOptional: true },
  { id: 'typography', label: 'Typography', icon: '📝', description: 'Font hierarchy and styles', isOptional: true },
  { id: 'voice', label: 'Voice', icon: '🎤', description: 'Brand tone and personality', isOptional: true },
  { id: 'guidelines', label: 'Guidelines', icon: '📋', description: 'Usage rules and restrictions', isOptional: true },
];

// ============================================================================
// Brand Kit State
// ============================================================================

export interface BrandKitIdentity {
  name: string;
  primaryColors: string[];
  accentColors: string[];
  headlineFont: string;
  bodyFont: string;
  tone: BrandKitTone;
  styleReference: string;
}

export interface BrandKitState {
  id: string | null;
  identity: BrandKitIdentity;
  colors: ColorPaletteInput;
  typography: TypographyInput;
  voice: BrandVoiceInput;
  guidelines: BrandGuidelinesInput;
  logos: Record<LogoType, string | null>;
  isActive: boolean;
  isDirty: boolean;
}

// ============================================================================
// Panel Props Interface
// ============================================================================

export interface BasePanelProps {
  brandKitId: string | null;
  isNew: boolean;
  onNavigate: (panel: PanelId) => void;
}

export interface IdentityPanelProps extends BasePanelProps {
  identity: BrandKitIdentity;
  onChange: (identity: BrandKitIdentity) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export interface LogosPanelProps extends BasePanelProps {
  logos: Record<LogoType, string | null>;
}

export interface ColorsPanelProps extends BasePanelProps {
  colors: ColorPaletteInput;
  onChange: (colors: ColorPaletteInput) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export interface TypographyPanelProps extends BasePanelProps {
  typography: TypographyInput;
  onChange: (typography: TypographyInput) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export interface VoicePanelProps extends BasePanelProps {
  voice: BrandVoiceInput;
  onChange: (voice: BrandVoiceInput) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export interface GuidelinesPanelProps extends BasePanelProps {
  guidelines: BrandGuidelinesInput;
  onChange: (guidelines: BrandGuidelinesInput) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

// ============================================================================
// Completion Status
// ============================================================================

export interface PanelCompletionStatus {
  panel: PanelId;
  isConfigured: boolean;
  itemCount: number;
  maxItems?: number;
}

export function calculateCompletionStatus(state: BrandKitState): PanelCompletionStatus[] {
  return [
    {
      panel: 'identity',
      isConfigured: !!state.identity.name,
      itemCount: state.identity.name ? 1 : 0,
    },
    {
      panel: 'logos',
      isConfigured: Object.values(state.logos).some(Boolean),
      itemCount: Object.values(state.logos).filter(Boolean).length,
      maxItems: 5,
    },
    {
      panel: 'colors',
      isConfigured: state.colors.primary.length > 0,
      itemCount: state.colors.primary.length + state.colors.secondary.length + 
                 state.colors.accent.length + state.colors.neutral.length + 
                 state.colors.gradients.length,
    },
    {
      panel: 'typography',
      isConfigured: Object.values(state.typography).some(Boolean),
      itemCount: Object.values(state.typography).filter(Boolean).length,
      maxItems: 6,
    },
    {
      panel: 'voice',
      isConfigured: state.voice.personalityTraits.length > 0 || !!state.voice.tagline,
      itemCount: (state.voice.personalityTraits.length > 0 ? 1 : 0) +
                 (state.voice.tagline ? 1 : 0) +
                 (state.voice.catchphrases.length > 0 ? 1 : 0) +
                 (state.voice.contentThemes.length > 0 ? 1 : 0),
      maxItems: 4,
    },
    {
      panel: 'guidelines',
      isConfigured: state.guidelines.prohibitedModifications.length > 0 || 
                    !!state.guidelines.styleDo || !!state.guidelines.styleDont,
      itemCount: (state.guidelines.prohibitedModifications.length > 0 ? 1 : 0) +
                 (state.guidelines.styleDo ? 1 : 0) +
                 (state.guidelines.styleDont ? 1 : 0),
      maxItems: 3,
    },
  ];
}
