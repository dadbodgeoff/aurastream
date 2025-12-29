'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, Trash2, User, Palette, ExternalLink } from 'lucide-react';
import type { GalleryItem } from '@aurastream/api-client/src/types/profileCreator';
import { downloadAsset } from '@/utils/download';

interface ProfileGalleryProps {
  items: GalleryItem[];
  isLoading: boolean;
  onCreateNew: () => void;
}

/**
 * Gallery of created profile pictures and logos.
 */
export function ProfileGallery({ items, isLoading, onCreateNew }: ProfileGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const handleDownload = async (item: GalleryItem) => {
    const filename = `${item.creationType}-${item.id.slice(0, 8)}.png`;
    await downloadAsset({ url: item.assetUrl, filename });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-800/50 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          No creations yet
        </h3>
        <p className="text-gray-400 mb-6">
          Create your first profile picture or logo to see it here
        </p>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Your First
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">
          Your Creations ({items.length})
        </h3>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="group relative aspect-square bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 hover:border-pink-500/50 transition-all"
          >
            {/* Image */}
            <img
              src={item.assetUrl}
              alt={item.promptUsed || 'Profile creation'}
              className="w-full h-full object-cover"
            />

            {/* Type badge */}
            <div className="absolute top-2 left-2">
              <div className={`
                flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                ${item.creationType === 'profile_picture'
                  ? 'bg-pink-500/80 text-white'
                  : 'bg-purple-500/80 text-white'
                }
              `}>
                {item.creationType === 'profile_picture' ? (
                  <User className="w-3 h-3" />
                ) : (
                  <Palette className="w-3 h-3" />
                )}
                {item.creationType === 'profile_picture' ? 'PFP' : 'Logo'}
              </div>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => handleDownload(item)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => window.open(item.assetUrl, '_blank')}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Style preset badge */}
            {item.stylePreset && (
              <div className="absolute bottom-2 left-2 right-2">
                <div className="px-2 py-1 bg-black/60 rounded text-xs text-gray-300 truncate">
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
