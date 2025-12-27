'use client';

/**
 * PromptCard Component
 * 
 * Displays refined prompts with copy/edit/use actions.
 * Shows quality score with visual progress bar.
 * 
 * @module coach/cards/PromptCard
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';
import { CardBase } from './CardBase';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PromptCardProps {
  /** The refined prompt/description to display */
  prompt: string;
  /** Quality score from 0-100 */
  qualityScore: number;
  /** Whether the prompt can be edited inline */
  isEditable?: boolean;
  /** Callback when copy button is clicked */
  onCopy: () => void;
  /** Callback when prompt is edited (only if isEditable) */
  onEdit?: (newPrompt: string) => void;
  /** Callback when "Use This Prompt" is clicked */
  onUse: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface QualityScoreBarProps {
  score: number;
  animate: boolean;
}

/**
 * Visual progress bar for quality score
 */
const QualityScoreBar = memo(function QualityScoreBar({ score, animate }: QualityScoreBarProps) {
  // Determine color based on score thresholds
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary">Quality:</span>
      <span className={cn('text-xs font-medium', getScoreTextColor(score))}>
        {score}%
      </span>
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            getScoreColor(score),
            animate && 'transition-all duration-500 ease-out'
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Quality score: ${score}%`}
        />
      </div>
    </div>
  );
});

QualityScoreBar.displayName = 'QualityScoreBar';

// ============================================================================
// Main Component
// ============================================================================

/**
 * PromptCard displays a refined prompt with actions and quality score.
 * 
 * Features:
 * - Copy button copies prompt to clipboard
 * - Edit button toggles inline editing mode (textarea)
 * - Quality score progress bar (green 80+, yellow 60-79, red <60)
 * - "Use This Prompt" button for generation
 * - Keyboard accessible
 * - Reduced motion support
 * 
 * @example
 * ```tsx
 * <PromptCard
 *   prompt="A vibrant gaming emote showing excitement"
 *   qualityScore={85}
 *   isEditable
 *   onCopy={() => navigator.clipboard.writeText(prompt)}
 *   onEdit={(newPrompt) => setPrompt(newPrompt)}
 *   onUse={() => startGeneration()}
 * />
 * ```
 */
export const PromptCard = memo(function PromptCard({
  prompt,
  qualityScore,
  isEditable = false,
  onCopy,
  onEdit,
  onUse,
  className,
  testId = 'prompt-card',
}: PromptCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update edited prompt when prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditedPrompt(prompt);
    }
  }, [prompt, isEditing]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleCopy = useCallback(() => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopy]);

  const handleEditToggle = useCallback(() => {
    if (isEditing && editedPrompt !== prompt && onEdit) {
      onEdit(editedPrompt);
    }
    setIsEditing(!isEditing);
  }, [isEditing, editedPrompt, prompt, onEdit]);

  const handleEditCancel = useCallback(() => {
    setEditedPrompt(prompt);
    setIsEditing(false);
  }, [prompt]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleEditCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleEditToggle();
    }
  }, [handleEditCancel, handleEditToggle]);

  return (
    <CardBase
      title="Refined Prompt"
      icon={<SparklesIcon className="w-5 h-5" />}
      className={className}
      testId={testId}
    >
      {/* Prompt Content */}
      <div className="space-y-4">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full min-h-[100px] p-3 rounded-lg',
              'bg-background-elevated border border-border-default',
              'text-sm text-text-primary leading-relaxed',
              'resize-y',
              'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              'placeholder:text-text-tertiary'
            )}
            aria-label="Edit prompt"
            placeholder="Enter your prompt..."
          />
        ) : (
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {prompt}
          </p>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-xs font-medium',
                'bg-white/5 hover:bg-white/10',
                'text-text-secondary hover:text-text-primary',
                'border border-border-subtle',
                'transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'
              )}
              aria-label={copied ? 'Copied!' : 'Copy prompt'}
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 text-green-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {isEditable && (
              <button
                type="button"
                onClick={handleEditToggle}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                  'text-xs font-medium',
                  'bg-white/5 hover:bg-white/10',
                  isEditing ? 'text-accent-400' : 'text-text-secondary hover:text-text-primary',
                  'border border-border-subtle',
                  'transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'
                )}
                aria-label={isEditing ? 'Save changes' : 'Edit prompt'}
                aria-pressed={isEditing}
              >
                <EditIcon className="w-4 h-4" />
                <span>{isEditing ? 'Save' : 'Edit'}</span>
              </button>
            )}

            {isEditing && (
              <button
                type="button"
                onClick={handleEditCancel}
                className={cn(
                  'px-3 py-1.5 rounded-lg',
                  'text-xs font-medium',
                  'text-text-tertiary hover:text-text-secondary',
                  'transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'
                )}
                aria-label="Cancel editing"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Quality Score */}
          <QualityScoreBar score={qualityScore} animate={shouldAnimate} />
        </div>

        {/* Use Button */}
        <button
          type="button"
          onClick={onUse}
          className={cn(
            'w-full py-2.5 rounded-lg',
            'text-sm font-medium',
            'bg-accent-600 hover:bg-accent-500',
            'text-white',
            'transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-surface'
          )}
        >
          Use This Prompt
        </button>
      </div>
    </CardBase>
  );
});

PromptCard.displayName = 'PromptCard';

export default PromptCard;
