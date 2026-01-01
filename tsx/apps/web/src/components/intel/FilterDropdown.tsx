'use client';

import { useEffect } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useIntelStore } from '@/stores/intelStore';

// =============================================================================
// Filter Dropdown Component
// =============================================================================

export function FilterDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  const activeFilter = useIntelStore(state => state.activeFilter);
  const setActiveFilter = useIntelStore(state => state.setActiveFilter);
  
  // Sync filter from URL on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && filterParam !== activeFilter) {
      // Validate that the filter is either 'all' or a subscribed category
      if (filterParam === 'all' || subscribedCategories.some(c => c.key === filterParam)) {
        setActiveFilter(filterParam);
      }
    }
  }, [searchParams, subscribedCategories, activeFilter, setActiveFilter]);
  
  const handleFilterChange = (value: string) => {
    setActiveFilter(value);
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', value);
    }
    
    const newUrl = params.toString() 
      ? `?${params.toString()}`
      : window.location.pathname;
    router.push(newUrl, { scroll: false });
  };
  
  // Get display name for current filter
  const getFilterDisplayName = () => {
    if (activeFilter === 'all') return 'All Categories';
    const category = subscribedCategories.find(c => c.key === activeFilter);
    return category?.name || 'All Categories';
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-muted">Viewing:</span>
      
      <Select.Root value={activeFilter} onValueChange={handleFilterChange}>
        <Select.Trigger
          className={cn(
            'inline-flex items-center justify-between gap-2',
            'h-10 px-4 rounded-lg',
            'bg-background-surface border border-border-subtle',
            'text-sm text-text-primary',
            'hover:border-interactive-500/30',
            'focus:outline-none focus:ring-2 focus:ring-interactive-500/50',
            'transition-colors',
            'min-w-[180px]'
          )}
          aria-label="Filter by category"
        >
          <Select.Value>{getFilterDisplayName()}</Select.Value>
          <Select.Icon>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </Select.Icon>
        </Select.Trigger>
        
        <Select.Portal>
          <Select.Content
            className={cn(
              'overflow-hidden rounded-lg',
              'bg-background-elevated border border-border-subtle',
              'shadow-xl shadow-black/20',
              'z-50'
            )}
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport className="p-1">
              {/* All Categories Option */}
              <Select.Item
                value="all"
                className={cn(
                  'relative flex items-center gap-2',
                  'h-10 px-3 pr-8 rounded-md',
                  'text-sm text-text-primary',
                  'cursor-pointer select-none',
                  'outline-none',
                  'data-[highlighted]:bg-interactive-600/10',
                  'data-[state=checked]:text-interactive-300'
                )}
              >
                <Select.ItemText>All Categories</Select.ItemText>
                <Select.ItemIndicator className="absolute right-2">
                  <Check className="w-4 h-4 text-interactive-400" />
                </Select.ItemIndicator>
              </Select.Item>
              
              {/* Separator */}
              {subscribedCategories.length > 0 && (
                <Select.Separator className="h-px bg-border-subtle my-1" />
              )}
              
              {/* Subscribed Categories */}
              {subscribedCategories.map((category) => (
                <Select.Item
                  key={category.key}
                  value={category.key}
                  className={cn(
                    'relative flex items-center gap-2',
                    'h-10 px-3 pr-8 rounded-md',
                    'text-sm text-text-primary',
                    'cursor-pointer select-none',
                    'outline-none',
                    'data-[highlighted]:bg-interactive-600/10',
                    'data-[state=checked]:text-interactive-300'
                  )}
                >
                  <Select.ItemText>
                    <span className="flex items-center gap-2">
                      {category.name}
                    </span>
                  </Select.ItemText>
                  <Select.ItemIndicator className="absolute right-2">
                    <Check className="w-4 h-4 text-interactive-400" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
              
              {/* Empty State */}
              {subscribedCategories.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-text-muted">
                    No categories subscribed
                  </p>
                </div>
              )}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
