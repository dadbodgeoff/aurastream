'use client';

/**
 * Stream Packs Gallery
 * 
 * Main gallery component for browsing and selecting stream pack templates.
 * Users can filter by category, search, and select a pack to customize.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Crown, Filter, Grid3X3, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PackCard } from './PackCard';
import { PackCustomizer } from './PackCustomizer';
import { SAMPLE_PACKS } from './data/samplePacks';
import type { 
  StreamPack, 
  PackCategory, 
  PackCustomization,
  StreamPacksGalleryProps 
} from './types';

// ============================================================================
// Category Tabs
// ============================================================================

const CATEGORIES: Array<{ id: PackCategory; label: string; icon: string }> = [
  { id: 'all', label: 'All Packs', icon: '🎨' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'irl', label: 'IRL / Just Chatting', icon: '💬' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'minimal', label: 'Minimal', icon: '✨' },
];

// ============================================================================
// Gallery Component
// ============================================================================

export function StreamPacksGallery({ className }: StreamPacksGalleryProps) {
  // State
  const [category, setCategory] = useState<PackCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPack, setSelectedPack] = useState<StreamPack | null>(null);
  const [customization, setCustomization] = useState<PackCustomization>({
    channelName: '',
    socialPlatforms: ['twitch'],
    colorScheme: { id: 'original', name: 'Original', primary: '', secondary: '', accent: '', preview: [] },
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'large'>('grid');

  // Filter packs
  const filteredPacks = useMemo(() => {
    let packs = SAMPLE_PACKS;
    
    // Filter by category
    if (category !== 'all') {
      packs = packs.filter(p => p.category === category);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      packs = packs.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    return packs;
  }, [category, searchQuery]);

  // Handlers
  const handleSelectPack = useCallback((pack: StreamPack) => {
    setSelectedPack(pack);
    // Reset customization with pack's original colors
    setCustomization({
      channelName: '',
      socialPlatforms: ['twitch'],
      colorScheme: pack.originalColors,
    });
  }, []);

  const handleBack = useCallback(() => {
    setSelectedPack(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedPack) return;
    
    setIsGenerating(true);
    
    // TODO: Call backend API to generate pack
    // For now, simulate generation
    console.log('Generating pack:', {
      packId: selectedPack.id,
      customization,
    });
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsGenerating(false);
    // TODO: Navigate to generation progress page
  }, [selectedPack, customization]);

  // If a pack is selected, show the customizer
  if (selectedPack) {
    return (
      <PackCustomizer
        pack={selectedPack}
        customization={customization}
        onCustomizationChange={setCustomization}
        onGenerate={handleGenerate}
        onBack={handleBack}
        isGenerating={isGenerating}
        className={className}
      />
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            Stream Packs
          </h1>
          <p className="text-gray-400 mt-1">
            Choose a template, customize it, and generate your complete stream package
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search packs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              category === cat.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            )}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
        
        {/* View Mode Toggle */}
        <div className="ml-auto flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('large')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'large' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredPacks.length} pack{filteredPacks.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Pack Grid */}
      <div className={cn(
        'grid gap-6',
        viewMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1 md:grid-cols-2'
      )}>
        <AnimatePresence mode="popLayout">
          {filteredPacks.map((pack, index) => (
            <motion.div
              key={pack.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <PackCard
                pack={pack}
                onSelect={handleSelectPack}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredPacks.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Search className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No packs found</h3>
          <p className="text-gray-500">
            Try adjusting your search or browse a different category
          </p>
        </div>
      )}
    </div>
  );
}
