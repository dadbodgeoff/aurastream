'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, CheckIcon } from '../icons';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  className?: string;
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  multiple = false,
  className,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedLabels = options
    .filter(opt => selectedValues.includes(opt.value))
    .map(opt => opt.label);

  const displayText = selectedLabels.length > 0
    ? selectedLabels.length > 2
      ? `${selectedLabels.length} selected`
      : selectedLabels.join(', ')
    : label;

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 min-h-[44px]',
          'bg-background-surface border rounded-lg text-sm transition-all',
          'focus:outline-none focus:ring-2 focus:ring-interactive-500/50',
          'active:scale-[0.98]',
          selectedValues.length > 0
            ? 'border-interactive-600 text-text-primary'
            : 'border-border-subtle text-text-secondary hover:border-border-default'
        )}
      >
        <span className="truncate max-w-[150px]">{displayText}</span>
        <ChevronDownIcon size="sm" className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-background-surface border border-border-subtle rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 min-h-[44px] text-sm text-left transition-colors',
                  'focus:outline-none focus:bg-background-elevated',
                  isSelected
                    ? 'bg-interactive-600/10 text-interactive-600'
                    : 'text-text-primary hover:bg-background-elevated'
                )}
              >
                <span>{option.label}</span>
                {isSelected && <CheckIcon size="sm" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
