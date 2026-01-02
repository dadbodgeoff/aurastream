/**
 * Inline Generation Preview Components
 * 
 * Components for displaying generation progress and results
 * inline within the Prompt Coach chat interface.
 * 
 * @module coach/generation
 */

// Hooks
export { useInlineGeneration } from './useInlineGeneration';
export type {
  Asset,
  GenerateOptions,
  GenerationStatus,
  UseInlineGenerationOptions,
  UseInlineGenerationResult,
} from './useInlineGeneration';

export { useRefinement } from './useRefinement';
export type {
  RefinementState,
  UseRefinementOptions,
  UseRefinementResult,
} from './useRefinement';

// Components
export { GenerationProgress } from './GenerationProgress';
export type { GenerationProgressProps } from './GenerationProgress';

export { GenerationResult } from './GenerationResult';
export type { GenerationResultProps } from './GenerationResult';

export { InlineGenerationCard } from './InlineGenerationCard';
export type { InlineGenerationCardProps } from './InlineGenerationCard';

export { RefinementChoice } from './RefinementChoice';
export type { RefinementChoiceProps } from './RefinementChoice';

export { RefineInput } from './RefineInput';
export type { RefineInputProps } from './RefineInput';

export { GenerationResultWithRefinement } from './GenerationResultWithRefinement';
export type { GenerationResultWithRefinementProps } from './GenerationResultWithRefinement';
