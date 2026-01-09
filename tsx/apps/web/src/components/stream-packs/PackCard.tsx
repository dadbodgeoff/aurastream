'use client';

/**
 * Pack Card Component
 * 
 * Displays a stream pack template in the gallery grid.
 * Shows preview image, name, description, and metadata.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown, Users, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PackCardProps } from './types';

export const PackCard = memo(function PackCard({
  pack,
  onSelect,
  className,
}: PackCardProps) {
  return (
    <motion.button
      onClick={() => onSelect(pack)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative w-full text-left rounded-2xl overflow-hidden',
        'bg-white/5 border border-white/10',
        'hover:border-purple-500/50 hover:bg-white/[0.07]',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-purple-500/50',
        className
      )}
    >
      {/* Preview Image */}
      <div className="relative aspect-video overflow-hidden">
        {/* Placeholder gradient if no image */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-cyan-600/20"
          style={{
            background: pack.originalColors.preview.length > 0
              ? `linear-gradient(135deg, ${pack.originalColors.preview.join(', ')})`
              : undefined
          }}
        />
        
        {/* Actual image would go here */}
        {pack.thumbnailUrl && (
          <img
            src={pack.thumbnailUrl}
            alt={pack.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium">
            Customize This Pack
          </span>
        </div>
        
        {/* Premium badge */}
        {pack.isPremium && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium">
            <Crown className="h-3 w-3" />
            <span>Pro</span>
          </div>
        )}
        
        {/* Asset count badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
          <Layers className="h-3 w-3" />
          <span>{pack.assets.length} assets</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
            {pack.name}
          </h3>
          
          {/* Color preview dots */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {pack.originalColors.preview.slice(0, 3).map((color, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        
        <p className="text-sm text-gray-400 line-clamp-2">
          {pack.description}
        </p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 pt-1">
          {pack.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-gray-500"
            >
              {tag}
            </span>
          ))}
          {pack.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-gray-600">
              +{pack.tags.length - 3}
            </span>
          )}
        </div>
        
        {/* Usage count */}
        {pack.usageCount && (
          <div className="flex items-center gap-1 text-xs text-gray-500 pt-1">
            <Users className="h-3 w-3" />
            <span>{pack.usageCount.toLocaleString()} streamers use this</span>
          </div>
        )}
      </div>
    </motion.button>
  );
});
