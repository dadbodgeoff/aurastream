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

function AssetTypeCard({ 
  asset, 
  selected, 
  onClick 
}: { 
  asset: AssetType; 
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border-2 text-left transition-all duration-200 group",
        selected
          ? "border-interactive-600 bg-interactive-600/5"
          : "border-border-subtle hover:border-border-default bg-background-surface/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className={cn(
            "font-medium mb-1",
            selected ? "text-interactive-600" : "text-text-primary"
          )}>
            {asset.label}
          </h3>
          <p className="text-sm text-text-tertiary">{asset.description}</p>
          <p className="text-xs text-text-muted mt-2">{asset.dimensions}</p>
        </div>
        {selected && (
          <div className="w-5 h-5 bg-interactive-600 rounded-full flex items-center justify-center text-white">
            <CheckIcon />
          </div>
        )}
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
