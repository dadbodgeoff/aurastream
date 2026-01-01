'use client';

import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntelStore } from '@/stores/intelStore';
import { 
  useAvailableCategories, 
  useSubscribeCategory,
  useUnsubscribeCategory,
} from '@aurastream/api-client';
import type { AvailableCategory } from '@aurastream/api-client';

// =============================================================================
// Types
// =============================================================================

interface CategoryPickerProps {
  userTier?: 'free' | 'pro' | 'studio';
}

// =============================================================================
// Tier Limits
// =============================================================================

const TIER_LIMITS = {
  free: 3,
  pro: 10,
  studio: Infinity,
};

// =============================================================================
// Category Card
// =============================================================================

function CategoryCard({
  category,
  isSubscribed,
  isDisabled,
  onToggle,
  isLoading,
}: {
  category: AvailableCategory;
  isSubscribed: boolean;
  isDisabled: boolean;
  onToggle: () => void;
  isLoading: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onToggle}
      disabled={isDisabled || isLoading}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full',
        isSubscribed
          ? 'bg-interactive-600/15 border-interactive-500/40'
          : isDisabled
            ? 'bg-background-surface/50 border-border-subtle opacity-50 cursor-not-allowed'
            : 'bg-background-surface border-border-subtle hover:border-interactive-500/30'
      )}
    >
      {/* Icon */}
      <span className="text-xl flex-shrink-0">{category.icon}</span>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text-primary text-sm">
          {category.name}
        </div>
        <div className="text-xs text-text-muted capitalize">
          {category.platform}
        </div>
      </div>
      
      {/* Status */}
      {isLoading ? (
        <Loader2 className="w-4 h-4 text-interactive-400 animate-spin" />
      ) : isSubscribed ? (
        <div className="p-1 rounded-full bg-interactive-600/20">
          <Check className="w-3.5 h-3.5 text-interactive-400" />
        </div>
      ) : null}
    </motion.button>
  );
}

// =============================================================================
// Category Picker Modal
// =============================================================================

export function CategoryPicker({ userTier = 'free' }: CategoryPickerProps) {
  const isOpen = useIntelStore(state => state.isCategoryPickerOpen);
  const setOpen = useIntelStore(state => state.setCategoryPickerOpen);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  const addCategoryOptimistic = useIntelStore(state => state.addCategoryOptimistic);
  const removeCategoryOptimistic = useIntelStore(state => state.removeCategoryOptimistic);
  
  const { data: availableCategories, isLoading: isLoadingCategories } = useAvailableCategories();
  const subscribeCategory = useSubscribeCategory();
  const unsubscribeCategory = useUnsubscribeCategory();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  
  const limit = TIER_LIMITS[userTier];
  const subscribedKeys = new Set(subscribedCategories.map(c => c.key));
  const slotsUsed = subscribedCategories.length;
  const slotsRemaining = limit - slotsUsed;
  
  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!availableCategories) return [];
    if (!searchQuery.trim()) return availableCategories;
    
    const query = searchQuery.toLowerCase();
    return availableCategories.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.platform.toLowerCase().includes(query)
    );
  }, [availableCategories, searchQuery]);
  
  // Group by platform
  const groupedCategories = useMemo(() => {
    const groups: Record<string, AvailableCategory[]> = {
      both: [],
      twitch: [],
      youtube: [],
    };
    
    filteredCategories.forEach(cat => {
      groups[cat.platform]?.push(cat);
    });
    
    return groups;
  }, [filteredCategories]);
  
  const handleToggle = async (category: AvailableCategory) => {
    const isSubscribed = subscribedKeys.has(category.key);
    setLoadingCategory(category.key);
    
    try {
      if (isSubscribed) {
        // Optimistic remove
        removeCategoryOptimistic(category.key);
        await unsubscribeCategory.mutateAsync(category.key);
      } else {
        // Optimistic add
        addCategoryOptimistic({
          key: category.key,
          name: category.name,
          twitchId: category.twitchId,
          youtubeQuery: category.youtubeQuery,
          platform: category.platform,
          notifications: true,
          addedAt: new Date().toISOString(),
        });
        await subscribeCategory.mutateAsync({
          key: category.key,
          name: category.name,
          twitchId: category.twitchId,
          youtubeQuery: category.youtubeQuery,
          platform: category.platform,
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      console.error('Failed to toggle category:', error);
    } finally {
      setLoadingCategory(null);
    }
  };
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
        </Dialog.Overlay>
        
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-lg max-h-[85vh]',
              'bg-background-elevated rounded-xl shadow-2xl',
              'border border-border-subtle',
              'flex flex-col z-50',
              'focus:outline-none'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <div>
                <Dialog.Title className="text-lg font-semibold text-text-primary">
                  Select Categories
                </Dialog.Title>
                <Dialog.Description className="text-sm text-text-muted mt-0.5">
                  {slotsRemaining === Infinity 
                    ? `${slotsUsed} categories selected`
                    : `${slotsUsed} of ${limit} slots used`
                  }
                </Dialog.Description>
              </div>
              
              <Dialog.Close asChild>
                <button
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            
            {/* Search */}
            <div className="px-6 py-3 border-b border-border-subtle">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-lg',
                    'bg-background-surface border border-border-subtle',
                    'text-sm text-text-primary placeholder:text-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-interactive-500/50'
                  )}
                />
              </div>
            </div>
            
            {/* Category List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoadingCategories ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Both Platforms */}
                  {groupedCategories.both.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                        Twitch & YouTube
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <AnimatePresence>
                          {groupedCategories.both.map((cat) => (
                            <CategoryCard
                              key={cat.key}
                              category={cat}
                              isSubscribed={subscribedKeys.has(cat.key)}
                              isDisabled={!subscribedKeys.has(cat.key) && slotsRemaining <= 0}
                              onToggle={() => handleToggle(cat)}
                              isLoading={loadingCategory === cat.key}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                  
                  {/* Twitch Only */}
                  {groupedCategories.twitch.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                        Twitch Only
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <AnimatePresence>
                          {groupedCategories.twitch.map((cat) => (
                            <CategoryCard
                              key={cat.key}
                              category={cat}
                              isSubscribed={subscribedKeys.has(cat.key)}
                              isDisabled={!subscribedKeys.has(cat.key) && slotsRemaining <= 0}
                              onToggle={() => handleToggle(cat)}
                              isLoading={loadingCategory === cat.key}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                  
                  {/* YouTube Only */}
                  {groupedCategories.youtube.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                        YouTube Only
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <AnimatePresence>
                          {groupedCategories.youtube.map((cat) => (
                            <CategoryCard
                              key={cat.key}
                              category={cat}
                              isSubscribed={subscribedKeys.has(cat.key)}
                              isDisabled={!subscribedKeys.has(cat.key) && slotsRemaining <= 0}
                              onToggle={() => handleToggle(cat)}
                              isLoading={loadingCategory === cat.key}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                  
                  {/* No Results */}
                  {filteredCategories.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-text-muted">No categories found</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
              {slotsRemaining <= 0 && slotsRemaining !== Infinity && (
                <p className="text-sm text-accent-400">
                  Upgrade to add more categories
                </p>
              )}
              {(slotsRemaining > 0 || slotsRemaining === Infinity) && (
                <p className="text-sm text-text-muted">
                  {slotsRemaining === Infinity 
                    ? 'Unlimited categories'
                    : `${slotsRemaining} slot${slotsRemaining !== 1 ? 's' : ''} remaining`
                  }
                </p>
              )}
              
              <Dialog.Close asChild>
                <button
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    'bg-interactive-600 hover:bg-interactive-500',
                    'text-white transition-colors'
                  )}
                >
                  Done
                </button>
              </Dialog.Close>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
