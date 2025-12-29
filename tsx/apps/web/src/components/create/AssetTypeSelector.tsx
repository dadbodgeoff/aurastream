/**
 * Asset type selection grid component.
 * @module create/AssetTypeSelector
 */

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ASSET_TYPES } from './constants';
import { CheckIcon } from './icons';
import type { Platform, AssetType } from './types';

interface AssetTypeSelectorProps {
  platform: Platform;
  selected: string;
  onChange: (assetTypeId: string) => void;
}

// Asset type icons for visual variety
const ASSET_ICONS: Record<string, string> = {
  thumbnail: '🖼️',
  clip_cover: '🎬',
  overlay: '✨',
  offline_screen: '📺',
  story: '📱',
  banner: '🎨',
  panel: '📋',
  emote: '😎',
  badge: '🏅',
  twitch_emote: '😎',
  twitch_badge: '🏅',
  twitch_panel: '📋',
  twitch_banner: '🎨',
  twitch_offline: '📺',
};

function AssetTypeCard({ 
  asset, 
  selected, 
  onClick 
}: { 
  asset: AssetType; 
  selected: boolean;
  onClick: () => void;
}) {
  const icon = ASSET_ICONS[asset.id] || '🎯';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-3 rounded-xl border-2 text-left transition-all duration-200 group",
        "hover:scale-[1.01] active:scale-[0.99]",
        selected
          ? "border-interactive-600 bg-interactive-600/5 shadow-sm shadow-interactive-600/10"
          : "border-border-subtle hover:border-interactive-500/50 bg-background-surface/50"
      )}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-interactive-600 rounded-full flex items-center justify-center text-white">
          <CheckIcon />
        </div>
      )}
      
      {/* Icon + Content inline */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0",
          selected 
            ? "bg-interactive-600/10" 
            : "bg-background-elevated"
        )}>
          {icon}
        </div>
        
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            "font-semibold text-sm leading-tight",
            selected ? "text-interactive-600" : "text-text-primary"
          )}>
            {asset.label}
          </h3>
          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{asset.description}</p>
          <p className={cn(
            "text-[10px] font-mono mt-1",
            selected ? "text-interactive-500" : "text-text-muted"
          )}>
            {asset.dimensions}
          </p>
        </div>
      </div>
    </button>
  );
}

export function AssetTypeSelector({ platform, selected, onChange }: AssetTypeSelectorProps) {
  const filteredAssetTypes = useMemo(() => {
    return ASSET_TYPES.filter(asset => 
      platform === 'general' || asset.platform.includes(platform)
    );
  }, [platform]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredAssetTypes.map((asset) => (
        <AssetTypeCard
          key={asset.id}
          asset={asset}
          selected={selected === asset.id}
          onClick={() => onChange(asset.id)}
        />
      ))}
    </div>
  );
}
