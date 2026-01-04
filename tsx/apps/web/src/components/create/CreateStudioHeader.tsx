/**
 * CreateStudioHeader Component
 * 
 * Header section for Create Studio page with title and description.
 * 
 * @module create/CreateStudioHeader
 */

'use client';

import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface CreateStudioHeaderProps {
  /** Additional className */
  className?: string;
  /** Test ID for e2e testing */
  testId?: string;
}

// =============================================================================
// Icons
// =============================================================================

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function CreateStudioHeader({
  className,
  testId = 'create-studio-header',
}: CreateStudioHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)} data-testid={testId}>
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-interactive-600/20 flex items-center justify-center">
        <SparklesIcon className="w-4 h-4 text-interactive-400" />
      </div>

      {/* Text */}
      <div>
        <h1 className="text-sm font-semibold text-text-primary">
          Create Studio
        </h1>
        <p className="text-xs text-text-secondary">
          Generate AI-powered assets for your streams
        </p>
      </div>
    </div>
  );
}

export default CreateStudioHeader;
