/**
 * Coach Input Components
 * 
 * Contextual input methods for the coach chat interface.
 * Includes suggestion chips, enhanced input area, and context-aware suggestions.
 * 
 * @module coach/input
 */

// useSuggestionContext - Hook for context-aware suggestions
export { useSuggestionContext, default as useSuggestionContextDefault } from './useSuggestionContext';
export type {
  ConversationStage,
  Suggestion,
  UseSuggestionContextOptions,
  UseSuggestionContextResult,
} from './useSuggestionContext';

// SuggestionChips - Horizontal scrollable chip buttons
export { SuggestionChips } from './SuggestionChips';
export type { SuggestionChipsProps } from './SuggestionChips';

// CoachInput - Enhanced input area with suggestions
export { CoachInput } from './CoachInput';
export type { CoachInputProps } from './CoachInput';
