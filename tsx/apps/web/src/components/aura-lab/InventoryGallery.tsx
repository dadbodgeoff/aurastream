'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Filter, Package, Trophy, Sparkles, Circle } from 'lucide-react';

import type { InventoryResponse, FusionItem, RarityType } from './types';
import { ELEMENTS_BY_ID, RARITY_COLORS, RARITY_LABELS, RARITY_BADGE_STYLES } from './constants';

interface InventoryGalleryProps {
  inventory: InventoryResponse | undefined;
  isLoading: boolean;
  onDownload: (fusion: FusionItem) => void;
}

type FilterOption = 'all' | RarityType;

/**
 * InventoryGallery - Displays the user's saved fusions.
 * 
 * Features:
 * - Grid of saved fusion cards
 * - Filter by rarity (All, Common, Rare, Mythic)
 * - Stats header showing counts (total, mythic, rare, common)
 * - Each card shows: image, element icon, rarity badge
 * - Download button on each card
 * - Empty state when no fusions saved
 * - Loading skeleton
 */
export function InventoryGallery({
  inventory,
  isLoading,
  onDownload,
}: InventoryGalleryProps) {
  const [filter, setFilter] = useState<FilterOption>('all');

  // Filter fusions based on selected rarity
  const filteredFusions = inventory?.fusions.filter((fusion) => {
    if (filter === 'all') return true;
    return fusion.rarity === filter;
  }) ?? [];

  // Filter options
  const filterOptions: { value: FilterOption; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All', icon: <Package className="w-3.5 h-3.5" /> },
    { value: 'mythic', label: 'Mythic', icon: <Trophy className="w-3.5 h-3.5 text-accent-400" /> },
    { value: 'rare', label: 'Rare', icon: <Sparkles className="w-3.5 h-3.5 text-interactive-400" /> },
    { value: 'common', label: 'Common', icon: <Circle className="w-3.5 h-3.5 text-text-secondary" /> },
  ];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-1 h-20 bg-background-elevated/50 rounded-xl animate-pulse" />
          ))}
        </div>
        
        {/* Filter skeleton */}
        <div className="h-10 w-64 bg-background-elevated/50 rounded-lg animate-pulse" />
        
        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square bg-background-elevated/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!inventory || inventory.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-background-elevated/50 flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-text-disabled" />
        </div>
        <h3 className="text-lg font-semibold text-text-secondary mb-2">No Fusions Yet</h3>
        <p className="text-sm text-text-tertiary text-center max-w-sm">
          Your saved fusions will appear here. Start experimenting in the lab to build your collection!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total"
          value={inventory.total}
          icon={<Package className="w-5 h-5" />}
          color="text-text-secondary"
          bgColor="bg-background-elevated/50"
        />
        <StatCard
          label="Mythic"
          value={inventory.mythicCount}
          icon={<Trophy className="w-5 h-5" />}
          color="text-accent-400"
          bgColor="bg-accent-500/10"
          glowColor="shadow-accent-500/20"
        />
        <StatCard
          label="Rare"
          value={inventory.rareCount}
          icon={<Sparkles className="w-5 h-5" />}
          color="text-interactive-400"
          bgColor="bg-interactive-500/10"
          glowColor="shadow-interactive-500/20"
        />
        <StatCard
          label="Common"
          value={inventory.commonCount}
          icon={<Circle className="w-5 h-5" />}
          color="text-text-secondary"
          bgColor="bg-background-elevated/50"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-text-tertiary" />
        <div className="flex gap-1 p-1 bg-background-elevated/50 rounded-lg">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                transition-all duration-200
                ${filter === option.value
                  ? 'bg-border-default text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-secondary hover:bg-border-default/50'
                }
              `}
            >
              {option.icon}
              {option.label}
              {option.value !== 'all' && (
                <span className="text-xs opacity-60">
                  ({option.value === 'mythic' 
                    ? inventory.mythicCount 
                    : option.value === 'rare' 
                    ? inventory.rareCount 
                    : inventory.commonCount})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Fusion Grid */}
      <AnimatePresence mode="popLayout">
        {filteredFusions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <p className="text-sm text-text-tertiary">
              No {filter !== 'all' ? filter : ''} fusions found
            </p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {filteredFusions.map((fusion, index) => (
              <FusionCard
                key={fusion.id}
                fusion={fusion}
                index={index}
                onDownload={() => onDownload(fusion)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  glowColor?: string;
}

function StatCard({ label, value, icon, color, bgColor, glowColor }: StatCardProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-xl
        ${bgColor} border border-border-default/50
        ${glowColor ? `shadow-lg ${glowColor}` : ''}
      `}
    >
      <div className={color}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-text-tertiary">{label}</p>
      </div>
    </div>
  );
}

interface FusionCardProps {
  fusion: FusionItem;
  index: number;
  onDownload: () => void;
}

function FusionCard({ fusion, index, onDownload }: FusionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const element = ELEMENTS_BY_ID[fusion.elementId];
  const rarityColors = RARITY_COLORS[fusion.rarity];
  const rarityLabel = RARITY_LABELS[fusion.rarity];
  const rarityBadgeStyle = RARITY_BADGE_STYLES[fusion.rarity];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.03 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative aspect-square rounded-xl overflow-hidden
        ${rarityColors.bg} ${rarityColors.border}
        border-2 transition-all duration-300
        ${fusion.rarity === 'mythic' ? 'shadow-lg ' + rarityColors.glow : ''}
        ${fusion.rarity === 'rare' ? 'shadow-md ' + rarityColors.glow : ''}
        hover:scale-105 cursor-pointer group
      `}
    >
      {/* Image */}
      <img
        src={fusion.imageUrl}
        alt={`Fusion with ${element?.name || 'unknown'}`}
        className="w-full h-full object-cover"
      />

      {/* Rarity Badge */}
      <div className="absolute top-2 right-2">
        <div
          className={`
            px-2 py-0.5 rounded-full text-micro font-bold
            ${rarityBadgeStyle}
          `}
        >
          {rarityLabel}
        </div>
      </div>

      {/* Element Icon */}
      {element && (
        <div className="absolute bottom-2 left-2">
          <div className="w-8 h-8 rounded-full bg-background-surface/80 backdrop-blur-sm flex items-center justify-center border border-border-default">
            <span className="text-lg">{element.icon}</span>
          </div>
        </div>
      )}

      {/* Hover Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background-surface/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.button
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="
                flex items-center gap-2 px-4 py-2 rounded-lg
                bg-white text-background-base font-semibold text-sm
                hover:bg-neutral-100 transition-colors
              "
            >
              <Download className="w-4 h-4" />
              Download
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mythic shimmer effect */}
      {fusion.rarity === 'mythic' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-400/20 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default InventoryGallery;
