/**
 * Creator Media Library Component Types
 */

import type { MediaAsset, MediaAssetType, ListMediaParams } from '@aurastream/api-client';

export interface MediaFilters extends Omit<ListMediaParams, 'limit' | 'offset'> {
  assetType?: MediaAssetType;
  tags?: string[];
  favoritesOnly?: boolean;
  search?: string;
  sortBy?: 'created_at' | 'updated_at' | 'usage_count' | 'display_name';
  sortOrder?: 'asc' | 'desc';
}

export interface MediaGridProps {
  assets: MediaAsset[];
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onAssetClick?: (asset: MediaAsset) => void;
  onFavorite?: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onDelete?: (id: string) => void;
  selectionMode?: boolean;
  emptyMessage?: string;
  className?: string;
}

export interface MediaCardProps {
  asset: MediaAsset;
  isSelected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  onFavorite?: () => void;
  onSetPrimary?: () => void;
  onDelete?: () => void;
  selectionMode?: boolean;
  className?: string;
}

export interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAssetType?: MediaAssetType;
  onSuccess?: (asset: MediaAsset) => void;
}

export interface MediaDetailModalProps {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (asset: MediaAsset) => void;
  onDelete?: () => void;
}

export interface MediaFiltersProps {
  filters: MediaFilters;
  onChange: (filters: MediaFilters) => void;
  className?: string;
}

export type ViewMode = 'grid' | 'list';
