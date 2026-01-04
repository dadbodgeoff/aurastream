/**
 * CreateStudio Component
 * 
 * Unified 3-panel asset creation experience that seamlessly integrates:
 * - Quick Templates (50% of users) - Pre-built templates with vibes
 * - Build Your Own (1% of users) - Custom prompt creation
 * - AI Coach (49% of users) - Guided prompt refinement
 * 
 * @module create-studio/CreateStudio
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useUser } from '@aurastream/shared';
import { cn } from '@/lib/utils';
import { ModeSelector } from './ModeSelector';
import { TemplatePanel } from './TemplatePanel';
import { CustomPanel } from './CustomPanel';
import { CoachPanel } from './CoachPanel';
import { CanvasPanel } from './CanvasPanel';
import { useCreateStudio } from './useCreateStudio';
import type { CreateStudioProps, CreationMode } from './types';

// =============================================================================
// Icons
// =============================================================================

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

// =============================================================================
// CreateStudio Component
// =============================================================================

/**
 * CreateStudio - Unified asset creation experience.
 * 
 * Features:
 * - Beautiful 3-tab interface with smooth animations
 * - Lazy-loaded panels for performance
 * - URL sync for deep linking (?tab=templates|custom|coach)
 * - Keyboard navigation support
 * - Responsive design (mobile-first)
 * - Tier-aware premium features
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <CreateStudio />
 * 
 * // With initial mode
 * <CreateStudio initialMode="coach" />
 * 
 * // With mode change callback
 * <CreateStudio onModeChange={(mode) => analytics.track('mode_change', { mode })} />
 * ```
 */
export function CreateStudio({
  initialMode,
  initialTab,
  onModeChange,
  className,
  testId = 'create-studio',
}: CreateStudioProps) {
  const user = useUser();
  const { state, actions } = useCreateStudio({ 
    initialMode: initialMode ?? (initialTab as CreationMode) ?? 'templates',
    syncToUrl: true,
  });

  // Check if user has premium access
  const isPremium = useMemo(() => {
    return user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio' || user?.subscriptionTier === 'unlimited';
  }, [user?.subscriptionTier]);

  // Handle mode selection
  const handleModeSelect = useCallback((mode: CreationMode) => {
    actions.setMode(mode);
    onModeChange?.(mode);
  }, [actions, onModeChange]);

  // Handle switching to coach from other panels
  const handleSwitchToCoach = useCallback(() => {
    if (isPremium) {
      handleModeSelect('coach');
    }
  }, [isPremium, handleModeSelect]);

  // Handle generation start
  const handleGenerationStart = useCallback((jobId: string) => {
    actions.startGeneration(jobId);
  }, [actions]);

  // Handle generation complete
  const handleGenerationComplete = useCallback((assetId: string) => {
    actions.completeGeneration();
  }, [actions]);

  return (
    <div 
      className={cn('flex flex-col h-full', className)}
      data-testid={testId}
    >
      {/* Header + Mode Selector - Compact layout */}
      <header className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl',
              'bg-interactive-600',
              'flex items-center justify-center',
              'shadow-lg shadow-interactive-600/30',
              'ring-1 ring-white/10'
            )}>
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary tracking-tight">Create Studio</h1>
              <p className="text-xs text-text-secondary">
                Generate AI-powered assets for your streams
              </p>
            </div>
          </div>
        </div>
        
        {/* Mode Selector - Inline */}
        <ModeSelector
          activeMode={state.activeMode}
          onModeSelect={handleModeSelect}
          isPremium={isPremium}
        />
      </header>

      {/* Panel Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full">
          {/* Templates Panel */}
          {state.activeMode === 'templates' && (
            <TemplatePanel
              onGenerationStart={handleGenerationStart}
              onSwitchToCoach={handleSwitchToCoach}
              className="h-full overflow-y-auto"
            />
          )}

          {/* Custom Panel */}
          {state.activeMode === 'custom' && (
            <CustomPanel
              onGenerationStart={handleGenerationStart}
              onSwitchToCoach={handleSwitchToCoach}
              className="h-full"
            />
          )}

          {/* Coach Panel */}
          {state.activeMode === 'coach' && (
            <CoachPanel
              onGenerationComplete={handleGenerationComplete}
              className="h-full overflow-y-auto"
            />
          )}

          {/* Canvas Panel */}
          {state.activeMode === 'canvas' && (
            <CanvasPanel
              onGenerationStart={handleGenerationStart}
              onGenerationComplete={handleGenerationComplete}
              className="h-full overflow-y-auto"
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default CreateStudio;

// =============================================================================
// Exports
// =============================================================================

export type { CreateStudioProps, CreationMode };
