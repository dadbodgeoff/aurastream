/**
 * Coach Components - Prompt Coach Chat UX 2025
 * 
 * Comprehensive component library for the AI-powered Prompt Coach chat interface.
 * Integrates streaming UX, AI assistant cards, contextual input, inline generation,
 * and session context display.
 * 
 * @module coach
 * 
 * @example Basic usage
 * ```tsx
 * import { CoachChatIntegrated } from '@/components/coach';
 * 
 * function CreatePage() {
 *   return (
 *     <CoachChatIntegrated
 *       assetType="twitch_emote"
 *       brandKitId="kit-123"
 *       brandKitName="My Brand Kit"
 *       onGenerateComplete={(asset) => console.log('Generated:', asset)}
 *       onEndSession={() => console.log('Session ended')}
 *     />
 *   );
 * }
 * ```
 */

// ============================================================================
// Main Integrated Component (Task 7)
// ============================================================================

export { CoachChatIntegrated, COACH_UX_2025_ENABLED } from './CoachChatIntegrated';
export type { CoachChatIntegratedProps } from './CoachChatIntegrated';

// ============================================================================
// Legacy Components
// ============================================================================

export { CoachChat } from './CoachChat';
export type { CoachChatProps } from './CoachChat';

export { CoachMessage } from './CoachMessage';
export type { CoachMessageProps } from './CoachMessage';

export { CoachContextForm } from './CoachContextForm';
export { CoachSlideOver } from './CoachSlideOver';
export { CoachTips } from './CoachTips';

// ============================================================================
// Extracted Page Content (UX Consolidation 2025)
// ============================================================================

export { CoachPageContent } from './CoachPageContent';
export type { CoachPageContentProps } from './CoachPageContent';

// ============================================================================
// Streaming Components (Task 2)
// ============================================================================

export {
  ThinkingIndicator,
  StreamingSkeleton,
  ChainOfThought,
} from './streaming';

export type {
  ThinkingIndicatorProps,
  ThinkingStage,
  StreamingSkeletonProps,
  SkeletonContentType,
  ChainOfThoughtProps,
} from './streaming';

// ============================================================================
// AI Assistant Cards (Task 3)
// ============================================================================

export {
  CardBase,
  PromptCard,
  ValidationCard,
  SuggestionCard,
} from './cards';

export type {
  CardBaseProps,
  PromptCardProps,
  ValidationCardProps,
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
  SuggestionCardProps,
  SuggestionOption,
} from './cards';

// ============================================================================
// Contextual Input Methods (Task 4)
// ============================================================================

export {
  CoachInput,
  SuggestionChips,
  useSuggestionContext,
} from './input';

export type {
  CoachInputProps,
  SuggestionChipsProps,
  ConversationStage,
  Suggestion,
  UseSuggestionContextOptions,
  UseSuggestionContextResult,
} from './input';

// ============================================================================
// Inline Generation Preview (Task 5)
// ============================================================================

export {
  InlineGenerationCard,
  GenerationProgress,
  GenerationResult,
  useInlineGeneration,
} from './generation';

export type {
  InlineGenerationCardProps,
  GenerationProgressProps,
  GenerationResultProps,
  Asset,
  GenerateOptions,
  GenerationStatus,
  UseInlineGenerationOptions,
  UseInlineGenerationResult,
} from './generation';

// ============================================================================
// Session Context Display (Task 6)
// ============================================================================

export {
  SessionContextBar,
  SessionBadge,
  TurnsIndicator,
  useSessionContext,
  getAssetTypeLabel,
  ASSET_TYPE_LABELS,
} from './context';

export type {
  SessionContextBarProps,
  SessionBadgeProps,
  TurnsIndicatorProps,
  UseSessionContextOptions,
  UseSessionContextResult,
} from './context';

// ============================================================================
// Hook Re-exports
// ============================================================================

// Re-export from hooks for convenience
export type {
  ChatMessage,
  StreamChunkType,
  IntentStatus,
  StreamingStage,
  UseCoachChatState,
  UseCoachChatReturn,
} from '../../hooks/useCoachChat';

export type { StartCoachRequest } from '../../hooks/useCoachContext';
