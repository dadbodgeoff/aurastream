/**
 * Prompt input textarea component.
 * @module create/PromptInput
 */

'use client';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

export function PromptInput({ 
  value, 
  onChange, 
  maxLength = 500,
  placeholder = "Describe what you want to create..."
}: PromptInputProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-24 px-4 py-3 bg-background-surface border border-border-subtle rounded-xl text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-interactive-600 transition-colors"
        maxLength={maxLength}
      />
      <div className="flex justify-end mt-1">
        <span className="text-xs text-text-muted">{value.length}/{maxLength}</span>
      </div>
    </div>
  );
}
