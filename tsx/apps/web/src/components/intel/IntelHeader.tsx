'use client';

import { useRef, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIntelStore } from '@/stores/intelStore';
import { useUnsubscribeCategory } from '@aurastream/api-client';
import { CategoryPill } from './CategoryPill';
import { FilterDropdown } from './FilterDropdown';
import { cn } from '@/lib/utils';

// =============================================================================
// Intel Header
// =============================================================================

export function IntelHeader() {
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  const setCategoryPickerOpen = useIntelStore(state => state.setCategoryPickerOpen);
  const removeCategoryOptimistic = useIntelStore(state => state.removeCategoryOptimistic);
  
  const unsubscribeCategory = useUnsubscribeCategory();
  
  // Horizontal scroll state for mobile
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1
      );
    }
  };
  
  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [subscribedCategories]);
  
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 150;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };
  
  const handleRemoveCategory = async (categoryKey: string) => {
    // Optimistic update
    removeCategoryOptimistic(categoryKey);
    
    try {
      await unsubscribeCategory.mutateAsync(categoryKey);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      // The mutation will handle cache invalidation on error
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Title and Categories */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Creator Intel</h1>
          <p className="text-sm text-text-secondary mt-1">
            Your personalized content intelligence dashboard
          </p>
        </div>
        
        {/* Category Pills - Horizontal scroll on mobile */}
        <div className="relative flex items-center">
          {/* Left scroll button */}
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scroll('left')}
                className="absolute left-0 z-10 p-1 bg-gradient-to-r from-background-base via-background-base to-transparent pr-4 md:hidden"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4 text-text-muted" />
              </motion.button>
            )}
          </AnimatePresence>
          
          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className={cn(
              'flex items-center gap-2 overflow-x-auto scrollbar-hide',
              'max-w-[calc(100vw-2rem)] md:max-w-none md:flex-wrap',
              'scroll-smooth snap-x snap-mandatory md:snap-none',
              // Fade edges on mobile
              canScrollLeft && 'pl-6 md:pl-0',
              canScrollRight && 'pr-6 md:pr-0'
            )}
          >
            <AnimatePresence mode="popLayout">
              {subscribedCategories.map((category) => (
                <motion.div
                  key={category.key}
                  layout
                  className="snap-start flex-shrink-0"
                >
                  <CategoryPill
                    name={category.name}
                    onRemove={() => handleRemoveCategory(category.key)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            
            <button
              onClick={() => setCategoryPickerOpen(true)}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 border border-dashed border-border-subtle hover:border-interactive-500/30 rounded-full text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
          
          {/* Right scroll button */}
          <AnimatePresence>
            {canScrollRight && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scroll('right')}
                className="absolute right-0 z-10 p-1 bg-gradient-to-l from-background-base via-background-base to-transparent pl-4 md:hidden"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Filter Dropdown */}
      <FilterDropdown />
    </div>
  );
}
