'use client';

/**
 * CoachInput Component
 * 
 * Enhanced input area for the coach chat with suggestion chips,
 * auto-expanding textarea, and "Generate Now" button.
 * 
 * @module coach/input/CoachInput
 */

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';
import { SuggestionChips } from './SuggestionChips';
import type { Suggestion } from './useSuggestionContext';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CoachInputProps {
  /** Current input value */
  value: string;
  /** Callback when input value changes */
  onChange: (value: string) => void;
  /** Callback when user sends a message */
  onSend: () => void;
  /** Callback when a suggestion chip is selected */
  onSuggestionSelect: (action: string) => void;
  /** Array of suggestions to display */
  suggestions: Suggestion[];
  /** Whether the coach is currently streaming a response */
  isStreaming: boolean;
  /** Whether the prompt is ready for generation */
  isGenerationReady: boolean;
  /** Callback when "Generate Now" is clicked */
  onGenerateNow?: () => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Maximum character count (optional) */
  maxLength?: number;
  /** Whether to show character count */
  showCharacterCount?: boolean;
  /** Whether the session is locked (after generation) */
  isSessionLocked?: boolean;
  /** Callback to start a new chat session */
  onStartNewChat?: () => void;
  /** Callback when reference image is uploaded */
  onImageUpload?: (file: File) => void;
  /** Currently uploaded reference image (for preview) */
  referenceImage?: { file: File; preview: string } | null;
  /** Callback to remove reference image */
  onRemoveImage?: () => void;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const SendIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    width="20" 
    height="20" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
    />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    width="20" 
    height="20" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg 
    className={cn('animate-spin', className)} 
    width="20" 
    height="20" 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    width="20" 
    height="20" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21,15 16,10 5,21" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    width="16" 
    height="16" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    width="20" 
    height="20" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface GenerateNowButtonProps {
  onClick: () => void;
  disabled: boolean;
  animate: boolean;
}

/**
 * Generate Now button with sparkle icon
 */
const GenerateNowButton = memo(function GenerateNowButton({
  onClick,
  disabled,
  animate,
}: GenerateNowButtonProps) {
  const handleClick = () => {
    console.log('[GenerateNowButton] Button clicked!');
    onClick();
  };
  
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-center gap-2',
        'px-4 py-3 rounded-lg',
        'bg-accent-600 hover:bg-accent-500',
        'text-white font-medium',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
        animate && 'transition-colors duration-200'
      )}
      aria-label="Generate asset now"
      data-testid="generate-now-button"
    >
      <SparklesIcon className="w-5 h-5" />
      Generate Now ✨
    </button>
  );
});

GenerateNowButton.displayName = 'GenerateNowButton';

interface CharacterCountProps {
  current: number;
  max?: number;
}

/**
 * Character count indicator
 */
const CharacterCount = memo(function CharacterCount({
  current,
  max,
}: CharacterCountProps) {
  const isNearLimit = max && current > max * 0.9;
  const isOverLimit = max && current > max;

  return (
    <span
      className={cn(
        'text-xs',
        isOverLimit
          ? 'text-red-400'
          : isNearLimit
          ? 'text-yellow-400'
          : 'text-text-tertiary'
      )}
      aria-live="polite"
    >
      {current}
      {max && `/${max}`}
    </span>
  );
});

CharacterCount.displayName = 'CharacterCount';

/**
 * Session locked state - shown after generation completes
 */
interface SessionLockedStateProps {
  onStartNewChat: () => void;
  animate: boolean;
}

const SessionLockedState = memo(function SessionLockedState({
  onStartNewChat,
  animate,
}: SessionLockedStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center gap-2 text-text-secondary text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Session complete! Your asset has been saved.</span>
      </div>
      <button
        type="button"
        onClick={onStartNewChat}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg',
          'bg-accent-600 hover:bg-accent-500',
          'text-white font-medium text-sm',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
          animate && 'transition-colors duration-200'
        )}
      >
        <PlusIcon className="w-4 h-4" />
        Start New Chat
      </button>
    </div>
  );
});

SessionLockedState.displayName = 'SessionLockedState';

/**
 * Reference image preview
 */
interface ReferenceImagePreviewProps {
  preview: string;
  onRemove: () => void;
}

const ReferenceImagePreview = memo(function ReferenceImagePreview({
  preview,
  onRemove,
}: ReferenceImagePreviewProps) {
  return (
    <div className="relative inline-block">
      <img
        src={preview}
        alt="Reference"
        className="w-16 h-16 object-cover rounded-lg border border-border-default"
      />
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'absolute -top-2 -right-2 p-1 rounded-full',
          'bg-red-500 hover:bg-red-400 text-white',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500'
        )}
        aria-label="Remove reference image"
      >
        <XIcon className="w-3 h-3" />
      </button>
    </div>
  );
});

ReferenceImagePreview.displayName = 'ReferenceImagePreview';

// ============================================================================
// Main Component
// ============================================================================

/**
 * CoachInput provides an enhanced input area for the coach chat.
 * 
 * Features:
 * - Suggestion chips above input
 * - "Generate Now" button when ready
 * - Auto-expanding textarea
 * - Send button with loading state
 * - Enter to send (Shift+Enter for newline)
 * - Disabled state during streaming
 * - Character count indicator (optional)
 * - Reduced motion support
 * 
 * Layout:
 * ```
 * ┌─────────────────────────────────────┐
 * │ [Chip] [Chip] [Chip] [Chip]    →    │ (scrollable)
 * ├─────────────────────────────────────┤
 * │ [Generate Now ✨]                   │ (if ready)
 * ├─────────────────────────────────────┤
 * │ [Input textarea...          ] [→]  │
 * │ Press Enter to send                 │
 * └─────────────────────────────────────┘
 * ```
 * 
 * @example
 * ```tsx
 * <CoachInput
 *   value={inputValue}
 *   onChange={setInputValue}
 *   onSend={handleSend}
 *   onSuggestionSelect={handleSuggestion}
 *   suggestions={suggestions}
 *   isStreaming={isStreaming}
 *   isGenerationReady={isReady}
 *   onGenerateNow={handleGenerate}
 * />
 * ```
 */
export const CoachInput = memo(function CoachInput({
  value,
  onChange,
  onSend,
  onSuggestionSelect,
  suggestions,
  isStreaming,
  isGenerationReady,
  onGenerateNow,
  placeholder = 'Type your message...',
  className,
  maxLength,
  showCharacterCount = false,
  isSessionLocked = false,
  onStartNewChat,
  onImageUpload,
  referenceImage,
  onRemoveImage,
  testId = 'coach-input',
}: CoachInputProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, capped at max height
      const maxHeight = 120; // 120px max height
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      // Respect maxLength if set
      if (maxLength && newValue.length > maxLength) {
        return;
      }
      onChange(newValue);
    },
    [onChange, maxLength]
  );

  // Handle key press (Enter to send, Shift+Enter for newline)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !isStreaming && !isSessionLocked) {
          onSend();
        }
      }
    },
    [value, isStreaming, isSessionLocked, onSend]
  );

  // Handle send button click
  const handleSendClick = useCallback(() => {
    if (value.trim() && !isStreaming && !isSessionLocked) {
      onSend();
    }
  }, [value, isStreaming, isSessionLocked, onSend]);

  // Handle generate now click
  const handleGenerateNow = useCallback(() => {
    if (onGenerateNow && isGenerationReady && !isStreaming) {
      onGenerateNow();
    }
  }, [onGenerateNow, isGenerationReady, isStreaming]);

  // Handle file upload
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImageUpload) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          return;
        }
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          return;
        }
        onImageUpload(file);
      }
      // Reset input so same file can be selected again
      if (e.target) {
        e.target.value = '';
      }
    },
    [onImageUpload]
  );

  // Handle image button click
  const handleImageButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Determine if send button should be disabled
  const isSendDisabled = !value.trim() || isStreaming || isSessionLocked;

  // If session is locked, show the locked state
  if (isSessionLocked && onStartNewChat) {
    return (
      <div
        data-testid={testId}
        className={cn(
          'border-t border-border-default',
          'bg-background-base',
          className
        )}
      >
        <SessionLockedState
          onStartNewChat={onStartNewChat}
          animate={shouldAnimate}
        />
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col gap-3',
        'p-4',
        'border-t border-border-default',
        'bg-background-base',
        className
      )}
    >
      {/* Reference Image Preview */}
      {referenceImage && onRemoveImage && (
        <div className="flex items-start gap-2">
          <ReferenceImagePreview
            preview={referenceImage.preview}
            onRemove={onRemoveImage}
          />
          <span className="text-xs text-text-tertiary mt-1">
            Reference image attached
          </span>
        </div>
      )}

      {/* Suggestion Chips */}
      {suggestions.length > 0 && (
        <SuggestionChips
          suggestions={suggestions}
          onSelect={onSuggestionSelect}
          disabled={isStreaming}
          testId={`${testId}-chips`}
        />
      )}

      {/* Generate Now Button */}
      {isGenerationReady && onGenerateNow && !isStreaming && (
        <GenerateNowButton
          onClick={handleGenerateNow}
          disabled={isStreaming}
          animate={shouldAnimate}
        />
      )}

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        {/* Image Upload Button */}
        {onImageUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload reference image"
            />
            <button
              type="button"
              onClick={handleImageButtonClick}
              disabled={isStreaming}
              className={cn(
                'flex-shrink-0 p-3 rounded-full',
                'bg-background-elevated border border-border-default',
                'text-text-secondary hover:text-text-primary hover:bg-background-surface',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/50',
                shouldAnimate && 'transition-colors duration-200'
              )}
              aria-label="Upload reference image"
              data-testid={`${testId}-image-button`}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Textarea Container */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Waiting for response...' : placeholder}
            disabled={isStreaming}
            rows={1}
            maxLength={maxLength}
            className={cn(
              'w-full px-4 py-3 rounded-xl resize-none',
              'bg-background-elevated border border-border-default',
              'text-text-primary placeholder-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-accent-600/50 focus:border-accent-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              shouldAnimate && 'transition-colors duration-200'
            )}
            style={{
              minHeight: '48px',
              maxHeight: '120px',
            }}
            aria-label="Message input"
            data-testid={`${testId}-textarea`}
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSendClick}
          disabled={isSendDisabled}
          className={cn(
            'flex-shrink-0 p-3 rounded-full',
            'bg-accent-600 text-white',
            'hover:bg-accent-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/50',
            shouldAnimate && 'transition-colors duration-200'
          )}
          aria-label={isStreaming ? 'Sending...' : 'Send message'}
          data-testid={`${testId}-send-button`}
        >
          {isStreaming ? (
            <LoadingSpinner className="w-5 h-5" />
          ) : (
            <SendIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Helper Text and Character Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          Press Enter to send, Shift+Enter for new line
        </p>
        {showCharacterCount && (
          <CharacterCount current={value.length} max={maxLength} />
        )}
      </div>
    </div>
  );
});

CoachInput.displayName = 'CoachInput';

export default CoachInput;
