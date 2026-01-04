/**
 * StickerPicker Component
 * 
 * Browse and select stickers to add to canvas.
 * Organized by category with search.
 */

'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Sticker, StickerCategory } from './types';
import { BUILT_IN_STICKERS, STICKER_CATEGORIES, getStickersByCategory } from './constants';

interface StickerPickerProps {
  /** Callback when sticker is selected */
  onSelect: (sticker: Sticker) => void;
  /** Recently used sticker IDs */
  recentIds?: string[];
  /** Optional className */
  className?: string;
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function StickerPicker({
  onSelect,
  recentIds = [],
  className,
}: StickerPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<StickerCategory | 'recent' | 'all'>('all');

  // Get recent stickers
  const recentStickers = useMemo(() => {
    return recentIds
      .map(id => BUILT_IN_STICKERS.find(s => s.id === id))
      .filter((s): s is Sticker => s !== undefined)
      .slice(0, 8);
  }, [recentIds]);

  // Filter stickers
  const filteredStickers = useMemo(() => {
    if (selectedCategory === 'recent') {
      return recentStickers;
    }
    
    let stickers = selectedCategory === 'all' 
      ? BUILT_IN_STICKERS 
      : getStickersByCategory(selectedCategory);
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      stickers = stickers.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        s.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }
    
    return stickers;
  }, [selectedCategory, search, recentStickers]);

  // Render sticker preview
  const renderSticker = (sticker: Sticker) => {
    if (sticker.type === 'emoji') {
      return <span className="text-2xl">{sticker.content}</span>;
    }
    if (sticker.type === 'svg') {
      return (
        <div 
          className="w-8 h-8 text-text-primary"
          dangerouslySetInnerHTML={{ __html: sticker.content }}
        />
      );
    }
    return <img src={sticker.content} alt={sticker.name} className="w-8 h-8 object-contain" />;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search */}
      <div className="relative">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
          <SearchIcon />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stickers..."
          className="w-full pl-8 pr-3 py-1.5 bg-background-surface border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500/20 focus:border-interactive-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {recentStickers.length > 0 && (
          <button
            onClick={() => setSelectedCategory('recent')}
            className={cn(
              'px-2 py-1 rounded text-xs whitespace-nowrap transition-colors',
              selectedCategory === 'recent'
                ? 'bg-interactive-500 text-white'
                : 'bg-background-elevated text-text-muted hover:bg-background-surface'
            )}
          >
            ⭐ Recent
          </button>
        )}
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-2 py-1 rounded text-xs whitespace-nowrap transition-colors',
            selectedCategory === 'all'
              ? 'bg-interactive-500 text-white'
              : 'bg-background-elevated text-text-muted hover:bg-background-surface'
          )}
        >
          All
        </button>
        {STICKER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'px-2 py-1 rounded text-xs whitespace-nowrap transition-colors',
              selectedCategory === cat.id
                ? 'bg-interactive-500 text-white'
                : 'bg-background-elevated text-text-muted hover:bg-background-surface'
            )}
          >
            {cat.emoji}
          </button>
        ))}
      </div>

      {/* Sticker Grid */}
      {filteredStickers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm text-text-muted">No stickers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-1">
          {filteredStickers.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => onSelect(sticker)}
              className="aspect-square rounded-lg bg-background-elevated hover:bg-background-surface border border-transparent hover:border-border-default transition-all flex items-center justify-center group"
              title={sticker.name}
            >
              <div className="transform group-hover:scale-110 transition-transform">
                {renderSticker(sticker)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Category Label */}
      {selectedCategory !== 'all' && selectedCategory !== 'recent' && (
        <p className="text-xs text-text-tertiary text-center">
          {STICKER_CATEGORIES.find(c => c.id === selectedCategory)?.label} stickers
        </p>
      )}
    </div>
  );
}

export default StickerPicker;
