'use client';

/**
 * Topic Dropdown
 * 
 * Dropdown selector for switching between subscribed game categories.
 * Used in the Game Intelligence section of the Intel page.
 * 
 * Features:
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Click outside to close
 * - Accessible with ARIA attributes
 * - Responsive design
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorySubscription {
  key: string;
  name: string;
  twitchId?: string;
  youtubeQuery?: string;
  platform: 'twitch' | 'youtube' | 'both';
}

interface TopicDropdownProps {
  categories: CategorySubscription[];
  selectedKey: string;
  onSelect: (key: string) => void;
  className?: string;
}

export function TopicDropdown({ 
  categories, 
  selectedKey, 
  onSelect,
  className 
}: TopicDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedCategory = categories.find(c => c.key === selectedKey);
  const selectedIndex = categories.findIndex(c => c.key === selectedKey);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) {
      // Open dropdown on arrow down or enter when closed
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < categories.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : categories.length - 1
        );
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < categories.length) {
          onSelect(categories[focusedIndex].key);
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
        }
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(categories.length - 1);
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  }, [isOpen, focusedIndex, categories, selectedIndex, onSelect]);

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, focusedIndex]);

  if (categories.length === 0) {
    return null;
  }

  // Single category - show as static badge
  if (categories.length === 1) {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-2', className)}>
        <Gamepad2 className="w-4 h-4 text-interactive-400" />
        <span className="text-text-tertiary text-sm">Topic:</span>
        <span className="font-medium text-text-primary text-sm">
          {categories[0].name}
        </span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
          }
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-white/5 border border-white/10',
          'hover:bg-white/10 hover:border-white/20',
          'focus:outline-none focus:ring-2 focus:ring-interactive-500/50',
          'transition-colors text-sm',
          isOpen && 'bg-white/10 border-white/20'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="topic-listbox"
        aria-label={`Select topic, current: ${selectedCategory?.name || 'none'}`}
      >
        <Gamepad2 className="w-4 h-4 text-interactive-400" />
        <span className="text-text-tertiary hidden sm:inline">Topic:</span>
        <span className="font-medium text-text-primary truncate max-w-[150px] sm:max-w-none">
          {selectedCategory?.name || 'Select Topic'}
        </span>
        <ChevronDown 
          className={cn(
            'w-4 h-4 text-text-tertiary transition-transform flex-shrink-0',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      {isOpen && (
        <div 
          ref={listRef}
          id="topic-listbox"
          className={cn(
            'absolute top-full left-0 mt-1 z-50',
            'min-w-[200px] max-h-[240px] overflow-y-auto py-1',
            'bg-background-secondary border border-white/10 rounded-lg',
            'shadow-lg shadow-black/20'
          )}
          role="listbox"
          aria-activedescendant={focusedIndex >= 0 ? `topic-option-${focusedIndex}` : undefined}
          onKeyDown={handleKeyDown}
        >
          {categories.map((category, index) => (
            <button
              key={category.key}
              id={`topic-option-${index}`}
              onClick={() => {
                onSelect(category.key);
                setIsOpen(false);
                setFocusedIndex(-1);
                buttonRef.current?.focus();
              }}
              onMouseEnter={() => setFocusedIndex(index)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left',
                'transition-colors',
                focusedIndex === index && 'bg-white/10',
                category.key === selectedKey && 'bg-interactive-500/10',
                focusedIndex !== index && category.key !== selectedKey && 'hover:bg-white/5'
              )}
              role="option"
              aria-selected={category.key === selectedKey}
            >
              <span className="flex-1 text-sm text-text-primary truncate">
                {category.name}
              </span>
              {category.key === selectedKey && (
                <Check className="w-4 h-4 text-interactive-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
