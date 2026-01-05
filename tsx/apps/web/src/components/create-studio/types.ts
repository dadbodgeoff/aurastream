/**
 * Create Studio - Type Definitions
 * 
 * Comprehensive types for the unified 3-panel asset creation experience.
 * 
 * @module create-studio/types
 */

import type { LogoPosition, LogoSize } from '@aurastream/api-client';

// =============================================================================
// Creation Modes
// =============================================================================

/**
 * Available creation modes in Create Studio.
 * - templates: Quick Templates with pre-built vibes (50% usage)
 * - custom: Build Your Own prompt (1% usage)
 * - coach: AI-guided prompt refinement (49% usage)
 * - canvas: Full visual canvas layout → AI polish
 */
export type CreationMode = 'templates' | 'custom' | 'coach' | 'canvas';

/**
 * Mode metadata for UI display.
 */
export interface ModeConfig {
  id: CreationMode;
  label: string;
  description: string;
  icon: string;
  badge?: string;
  isPremium?: boolean;
  /** If true, mode is hidden from the UI but code is preserved */
  hidden?: boolean;
}

// =============================================================================
// State Management
// =============================================================================

/**
 * Canvas context for passing between Canvas and Coach panels.
 */
export interface CanvasContext {
  /** URL of the uploaded canvas snapshot */
  snapshotUrl: string;
  /** Description of canvas contents for AI context */
  description: string;
  /** Asset type from the canvas */
  assetType: string;
  /** Dimensions of the canvas */
  width: number;
  height: number;
}

/**
 * Complete state for Create Studio.
 */
export interface CreateStudioState {
  /** Current active mode */
  activeMode: CreationMode;
  /** Whether preview panel is visible */
  showPreview: boolean;
  /** Current asset type being created */
  assetType: string | null;
  /** Selected brand kit ID */
  brandKitId: string | null;
  /** Current prompt (from any mode) */
  currentPrompt: string | null;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Current job ID if generating */
  jobId: string | null;
  /** Error message if any */
  error: string | null;
  /** Canvas context from Canvas panel (for Coach integration) */
  canvasContext: CanvasContext | null;
}

/**
 * Actions for Create Studio state management.
 */
export interface CreateStudioActions {
  /** Switch to a different creation mode */
  setMode: (mode: CreationMode) => void;
  /** Toggle preview panel visibility */
  togglePreview: () => void;
  /** Update asset type */
  setAssetType: (type: string) => void;
  /** Update brand kit selection */
  setBrandKitId: (id: string | null) => void;
  /** Update current prompt */
  setPrompt: (prompt: string) => void;
  /** Start generation */
  startGeneration: (jobId: string) => void;
  /** Complete generation */
  completeGeneration: () => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Reset to initial state */
  reset: () => void;
  /** Set canvas context (from Canvas panel for Coach) */
  setCanvasContext: (context: CanvasContext | null) => void;
  /** Switch to coach with canvas context */
  switchToCoachWithCanvas: (context: CanvasContext) => void;
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for the main CreateStudio component.
 */
export interface CreateStudioProps {
  /** Initial mode to display */
  initialMode?: CreationMode;
  /** Initial tab from URL (for deep linking) */
  initialTab?: string;
  /** Callback when mode changes */
  onModeChange?: (mode: CreationMode) => void;
  /** Additional className */
  className?: string;
  /** Test ID for e2e testing */
  testId?: string;
}

/**
 * Props for ModeSelector component.
 */
export interface ModeSelectorProps {
  /** Currently active mode */
  activeMode: CreationMode;
  /** Callback when mode is selected */
  onModeSelect: (mode: CreationMode) => void;
  /** Whether user has premium access */
  isPremium?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Props for TemplatePanel component.
 */
export interface TemplatePanelProps {
  /** Callback when generation starts */
  onGenerationStart?: (jobId: string) => void;
  /** Callback to switch to coach mode */
  onSwitchToCoach?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Props for CustomPanel component.
 */
export interface CustomPanelProps {
  /** Callback when generation starts */
  onGenerationStart?: (jobId: string) => void;
  /** Callback to switch to coach mode */
  onSwitchToCoach?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Props for CoachPanel component.
 */
export interface CoachPanelProps {
  /** Callback when generation completes */
  onGenerationComplete?: (assetId: string) => void;
  /** Canvas context from Canvas panel (for canvas → coach flow) */
  canvasContext?: CanvasContext | null;
  /** Callback to clear canvas context after use */
  onClearCanvasContext?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Props for CanvasPanel component.
 */
export interface CanvasPanelProps {
  /** Callback when generation starts */
  onGenerationStart?: (jobId: string) => void;
  /** Callback when generation completes */
  onGenerationComplete?: (assetId: string) => void;
  /** Callback to switch to coach with canvas context */
  onSwitchToCoach?: (context: CanvasContext) => void;
  /** Additional className */
  className?: string;
}

/**
 * Props for PreviewPanel component.
 */
export interface PreviewPanelProps {
  /** Current asset type */
  assetType: string | null;
  /** Current prompt */
  prompt: string | null;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Current job ID */
  jobId: string | null;
  /** Callback to close preview */
  onClose?: () => void;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Shared Types
// =============================================================================

/**
 * Logo configuration for generation.
 */
export interface LogoConfig {
  includeLogo: boolean;
  logoPosition: LogoPosition;
  logoSize: LogoSize;
}

/**
 * Generation parameters shared across modes.
 */
export interface GenerationParams {
  assetType: string;
  brandKitId?: string | null;
  customPrompt?: string | null;
  logoConfig?: LogoConfig;
}
