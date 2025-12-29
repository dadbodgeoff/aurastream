'use client';

import { motion } from 'framer-motion';
import { Plus, Download, User, Palette, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GalleryItem } from '@aurastream/api-client/src/types/profileCreator';
import { downloadAsset } from '@/utils/download';

interface ProfileGalleryProps {
  items: GalleryItem[];
  isLoading: boolean;
  onCreateNew: () => void;
}

export function ProfileGallery({ items, isLoading, onCreateNew }: ProfileGalleryProps) {
  const handleDownload = async (item: GalleryItem) => {
    const filename = `${item.creationType}-${item.id.slice(0, 8)}.png`;
    await downloadAsset({ url: item.assetUrl, filename });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="aspect-square bg-background-surface rounded-lg animate-pulse border border-border-subtle" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-background-elevated rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-text-disabled" />
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-1">No creations yet</h3>
        <p className="text-xs text-text-tertiary mb-4">Create your first profile picture or logo</p>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Your First
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">Your Creations ({items.length})</h3>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-interactive-600/10 hover:bg-interactive-600/20 text-interactive-400 text-xs font-medium rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className="group relative aspect-square bg-background-surface rounded-lg overflow-hidden border border-border-subtle hover:border-interactive-600/50 transition-all"
          >
            <img
              src={item.assetUrl}
              alt={item.promptUsed || 'Profile creation'}
              className="w-full h-full object-cover"
            />

            {/* Type badge */}
            <div className="absolute top-1 left-1">
              <div className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium",
                item.creationType === 'profile_picture'
                  ? "bg-interactive-600/80 text-white"
                  : "bg-accent-600/80 text-white"
              )}>
                {item.creationType === 'profile_picture' ? <User className="w-2.5 h-2.5" /> : <Palette className="w-2.5 h-2.5" />}
                {item.creationType === 'profile_picture' ? 'PFP' : 'Logo'}
              </div>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-background-base/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              <button
                onClick={() => handleDownload(item)}
                className="p-1.5 bg-background-elevated hover:bg-background-surface rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4 text-text-primary" />
              </button>
              <button
                onClick={() => window.open(item.assetUrl, '_blank')}
                className="p-1.5 bg-background-elevated hover:bg-background-surface rounded-lg transition-colors"
                title="Open"
              >
                <ExternalLink className="w-4 h-4 text-text-primary" />
              </button>
            </div>

            {/* Style preset */}
            {item.stylePreset && (
              <div className="absolute bottom-1 left-1 right-1">
                <div className="px-1.5 py-0.5 bg-background-base/80 rounded text-[8px] text-text-tertiary truncate">
                  {item.stylePreset}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
