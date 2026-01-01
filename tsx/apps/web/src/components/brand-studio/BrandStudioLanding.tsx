/**
 * BrandStudioLanding - Main entry point for Brand Studio
 * 
 * Features:
 * - Two-path selection (Vibe Branding vs Manual)
 * - Brand kits grid with search
 * - Empty state for new users
 */

'use client';

import { useState, useCallback, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreVertical, Check, Trash2, Edit2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  useBrandKits,
  useOptimisticBrandKitActivation,
  useOptimisticBrandKitDeletion,
  useVibeBrandingUsage,
  type BrandKit,
} from '@aurastream/api-client';
import { useAuth } from '@aurastream/shared';
import { PathSelectionCards } from './PathSelectionCards';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';
import { cn } from '@/lib/utils';

interface BrandStudioLandingProps {
  onOpenVibeBranding: () => void;
  onOpenQuickSetup: () => void;
  onEditKit: (id: string) => void;
}

export function BrandStudioLanding({
  onOpenVibeBranding,
  onOpenQuickSetup,
  onEditKit,
}: BrandStudioLandingProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: brandKitsData, isLoading: kitsLoading, refetch } = useBrandKits();
  const { data: vibeUsage, isLoading: usageLoading } = useVibeBrandingUsage();
  
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Mutations
  const activateMutation = useOptimisticBrandKitActivation({
    onError: (err) => showErrorToast(err),
    onSuccess: (kit) => showSuccessToast(`${kit.name} is now active`),
  });
  
  const deleteMutation = useOptimisticBrandKitDeletion({
    onError: (err) => showErrorToast(err),
    onSuccess: () => showSuccessToast('Brand kit deleted'),
  });

  const brandKits = brandKitsData?.brandKits ?? [];
  const filteredKits = search
    ? brandKits.filter((kit) => kit.name.toLowerCase().includes(search.toLowerCase()))
    : brandKits;

  const handleActivate = useCallback((id: string) => {
    activateMutation.mutate(id);
    setActiveMenu(null);
  }, [activateMutation]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Delete this brand kit? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
    setActiveMenu(null);
  }, [deleteMutation]);

  const isLoading = kitsLoading || usageLoading;

  return (
    <div className="space-y-10">
      {/* Path Selection */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Create a Brand Kit</h2>
          <p className="text-sm text-text-secondary">
            Choose how you want to create your brand identity
          </p>
        </div>
        
        <PathSelectionCards
          vibeUsage={vibeUsage ? { remaining: vibeUsage.remaining, limit: vibeUsage.limit } : null}
          brandKitCount={brandKits.length}
          maxBrandKits={10}
          onSelectVibe={onOpenVibeBranding}
          onSelectManual={onOpenQuickSetup}
          isLoading={isLoading}
        />
      </section>

      {/* Existing Brand Kits */}
      {brandKits.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Your Brand Kits ({brandKits.length})
              </h2>
              <p className="text-sm text-text-secondary">
                Click to edit, or use the menu for more options
              </p>
            </div>
            
            {/* Search */}
            {brandKits.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search brand kits..."
                  className="pl-9 pr-4 py-2 bg-background-surface border border-border-subtle rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 w-64"
                />
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredKits.map((kit) => (
                <BrandKitCard
                  key={kit.id}
                  kit={kit}
                  isMenuOpen={activeMenu === kit.id}
                  onToggleMenu={() => setActiveMenu(activeMenu === kit.id ? null : kit.id)}
                  onEdit={() => onEditKit(kit.id)}
                  onActivate={() => handleActivate(kit.id)}
                  onDelete={() => handleDelete(kit.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* No results */}
          {search && filteredKits.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary">No brand kits match "{search}"</p>
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-interactive-500 hover:text-interactive-400 text-sm"
              >
                Clear search
              </button>
            </div>
          )}
        </section>
      )}

      {/* Empty State */}
      {!isLoading && brandKits.length === 0 && (
        <section className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-interactive-600/20 flex items-center justify-center">
            <Star className="w-10 h-10 text-interactive-500" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            No brand kits yet
          </h3>
          <p className="text-text-secondary max-w-md mx-auto">
            Create your first brand kit to ensure consistent styling across all your generated assets.
            Choose Vibe Branding for AI-powered extraction or build your own from scratch.
          </p>
        </section>
      )}
    </div>
  );
}

// Brand Kit Card Component
interface BrandKitCardProps {
  kit: BrandKit;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onActivate: () => void;
  onDelete: () => void;
}

const BrandKitCard = forwardRef<HTMLDivElement, BrandKitCardProps>(function BrandKitCard({
  kit,
  isMenuOpen,
  onToggleMenu,
  onEdit,
  onActivate,
  onDelete,
}, ref) {
  const colors = [...(kit.primary_colors || []), ...(kit.accent_colors || [])].slice(0, 5);
  const isVibeCreated = kit.extracted_from?.startsWith('vibe:');

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative p-4 rounded-xl border-2 transition-all cursor-pointer",
        kit.is_active
          ? "border-success-main/50 bg-success-dark/5"
          : "border-border-subtle hover:border-border-default bg-background-surface/50"
      )}
      onClick={onEdit}
    >
      {/* Active Badge */}
      {kit.is_active && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-success-main text-white text-xs font-semibold rounded-full flex items-center gap-1">
          <Check className="w-3 h-3" />
          Active
        </div>
      )}

      {/* Vibe Badge */}
      {isVibeCreated && !kit.is_active && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-500 text-white text-xs font-semibold rounded-full">
          AI
        </div>
      )}

      {/* Content */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: colors[0] || '#21808D' }}
        >
          {kit.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{kit.name}</h3>
          <p className="text-xs text-text-muted capitalize">{kit.tone} tone</p>
          
          {/* Color swatches */}
          <div className="flex gap-1 mt-2">
            {colors.map((c, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded border border-white/10"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            className="p-1.5 rounded-lg hover:bg-background-elevated text-text-muted hover:text-text-primary transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu();
                }}
              />
              
              {/* Menu */}
              <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-background-surface border border-border-subtle rounded-lg shadow-xl z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-elevated flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                {!kit.is_active && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onActivate();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-background-elevated flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Set Active
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-error-light hover:bg-error-dark/10 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});
