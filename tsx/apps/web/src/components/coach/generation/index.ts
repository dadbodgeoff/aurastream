/**
 * Inline Generation Preview Components
 * 
 * Components for displaying generation progress and results
 * inline within the Prompt Coach chat interface.
 * 
 * @module coach/generation
 */

// Hook
export { useInlineGeneration } from './useInlineGeneration';
export type {
  Asset,
  GenerateOptions,
  GenerationStatus,
  UseInlineGenerationOptions,
  UseInlineGenerationResult,
} from './useInlineGeneration';

// Components
export { GenerationProgress } from './GenerationProgress';
export type { GenerationProgressProps } from './GenerationProgress';

export { GenerationResult } from './GenerationResult';
export type { GenerationResultProps } from './GenerationResult';

export { InlineGenerationCard } from './InlineGenerationCard';
export type { InlineGenerationCardProps } from './InlineGenerationCard';
