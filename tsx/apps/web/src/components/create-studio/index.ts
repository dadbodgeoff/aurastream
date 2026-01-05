/**
 * Create Studio - Unified Asset Creation Experience
 * 
 * A beautiful 3-panel interface that seamlessly integrates:
 * - Quick Templates (50% of users) - Pre-built templates with vibes
 * - Build Your Own (1% of users) - Custom prompt creation
 * - AI Coach (49% of users) - Guided prompt refinement
 * - Canvas Studio - Visual scene design with AI polish
 * 
 * @module create-studio
 */

// Main component
export { CreateStudio } from './CreateStudio';
export type { CreateStudioProps, CreationMode } from './CreateStudio';

// Mode selector
export { ModeSelector } from './ModeSelector';

// Panel components
export { TemplatePanel } from './TemplatePanel';
export { CustomPanel } from './CustomPanel';
export { CoachPanel } from './CoachPanel';
export { CanvasPanel } from './CanvasPanel';
export { PreviewPanel } from './PreviewPanel';

// State management
export { useCreateStudio } from './useCreateStudio';
export type { CreateStudioState, CreateStudioActions } from './useCreateStudio';

// Types
export type {
  ModeConfig,
  ModeSelectorProps,
  TemplatePanelProps,
  CustomPanelProps,
  CoachPanelProps,
  PreviewPanelProps,
  LogoConfig,
  GenerationParams,
} from './types';
