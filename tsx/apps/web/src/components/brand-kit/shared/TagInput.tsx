'use client';

import { useState } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  maxTags?: number;
  maxLength?: number;
}

export function TagInput({ tags, onChange, placeholder, maxTags = 10, maxLength = 50 }: TagInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim() && tags.length < maxTags) {
      e.preventDefault();
      onChange([...tags, input.trim().slice(0, maxLength)]);
      setInput('');
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-background-base border border-border-subtle rounded-xl focus-within:border-interactive-600 transition-colors min-h-[48px]">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-interactive-600/10 text-interactive-600 rounded-lg text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="hover:text-interactive-400"
          >
            ×
          </button>
        </span>
      ))}
      {tags.length < maxTags && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-text-primary text-sm placeholder-text-muted focus:outline-none"
        />
      )}
    </div>
  );
}
