/**
 * Coach AI Assistant Cards
 * 
 * Components for displaying AI-generated content in the coach chat.
 * Includes prompt cards, validation results, and suggestion options.
 * 
 * @module coach/cards
 */

// CardBase - Shared card styling
export { CardBase } from './CardBase';
export type { CardBaseProps } from './CardBase';

// PromptCard - Displays refined prompts with actions
export { PromptCard } from './PromptCard';
export type { PromptCardProps } from './PromptCard';

// ValidationCard - Shows validation results with issues
export { ValidationCard } from './ValidationCard';
export type {
  ValidationCardProps,
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
} from './ValidationCard';

// SuggestionCard - Clickable suggestion options
export { SuggestionCard } from './SuggestionCard';
export type { SuggestionCardProps, SuggestionOption } from './SuggestionCard';
