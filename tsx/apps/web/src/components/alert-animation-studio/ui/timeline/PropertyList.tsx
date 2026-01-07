'use client';

/**
 * Property List Component
 *
 * Sidebar showing available and active animation properties.
 * Grouped by category with checkboxes to enable/disable tracks.
 *
 * @module ui/timeline/PropertyList
 */

import { useCallback, memo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AnimatableProperty,
  PropertyCategory,
  Track,
  PROPERTY_METADATA,
} from '../../engine/timeline/types';

// ============================================================================
// Types
// ============================================================================

export interface PropertyListProps {
  /** All available properties that can be animated */
  availableProperties: AnimatableProperty[];
  /** Currently active track properties */
  activeTracks: AnimatableProperty[];
  /** Track data for displaying controls */
  tracks: Track[];
  /** Callback when a track is added */
  onAddTrack: (property: AnimatableProperty) => void;
  /** Callback when a track is removed */
  onRemoveTrack: (trackId: string) => void;
  /** Callback when track visibility/mute/solo/lock changes */
  onTrackToggle: (trackId: string, property: 'visible' | 'muted' | 'solo' | 'locked') => void;
  /** Style for the container */
  style?: React.CSSProperties;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  transform: 'Transform',
  effects: 'Effects',
  depth: 'Depth',
  particles: 'Particles',
};

const CATEGORY_ICONS: Record<PropertyCategory, string> = {
  transform: '🔄',
  effects: '✨',
  depth: '📐',
  particles: '💫',
};

// Property metadata (simplified version - full version in types.ts)
const PROPERTIES_BY_CATEGORY: Record<PropertyCategory, { property: AnimatableProperty; displayName: string }[]> = {
  transform: [
    { property: 'scaleX', displayName: 'Scale X' },
    { property: 'scaleY', displayName: 'Scale Y' },
    { property: 'scaleUniform', displayName: 'Scale' },
    { property: 'positionX', displayName: 'Position X' },
    { property: 'positionY', displayName: 'Position Y' },
    { property: 'rotationZ', displayName: 'Rotation' },
    { property: 'opacity', displayName: 'Opacity' },
  ],
  effects: [
    { property: 'glowIntensity', displayName: 'Glow Intensity' },
    { property: 'glowRadius', displayName: 'Glow Radius' },
    { property: 'blurAmount', displayName: 'Blur' },
    { property: 'rgbSplitAmount', displayName: 'RGB Split' },
  ],
  depth: [
    { property: 'depthIntensity', displayName: 'Depth Intensity' },
    { property: 'depthScale', displayName: 'Depth Scale' },
  ],
  particles: [
    { property: 'particleSpawnRate', displayName: 'Spawn Rate' },
    { property: 'particleSpeed', displayName: 'Speed' },
    { property: 'particleSize', displayName: 'Size' },
    { property: 'particleOpacity', displayName: 'Opacity' },
  ],
};

// ============================================================================
// Component
// ============================================================================

/**
 * Property list sidebar for managing animation tracks.
 */
export const PropertyList = memo(function PropertyList({
  availableProperties,
  activeTracks,
  tracks,
  onAddTrack,
  onRemoveTrack,
  onTrackToggle,
  style,
  className,
}: PropertyListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<PropertyCategory>>(
    new Set(['transform', 'effects'])
  );

  // Toggle category expansion
  const toggleCategory = useCallback((category: PropertyCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Get track by property
  const getTrackByProperty = useCallback(
    (property: AnimatableProperty) => tracks.find((t) => t.property === property),
    [tracks]
  );

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-900/80 border-r border-gray-800 overflow-y-auto',
        className
      )}
      style={style}
      role="tree"
      aria-label="Animation Properties"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Properties
        </span>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {(Object.keys(PROPERTIES_BY_CATEGORY) as PropertyCategory[]).map((category) => {
          const isExpanded = expandedCategories.has(category);
          const properties = PROPERTIES_BY_CATEGORY[category];
          const activeCount = properties.filter((p) => activeTracks.includes(p.property)).length;

          return (
            <div key={category} role="treeitem" aria-expanded={isExpanded}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/50 transition-colors text-left"
                aria-label={`${CATEGORY_LABELS[category]} category, ${activeCount} active`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
                <span className="text-sm">{CATEGORY_ICONS[category]}</span>
                <span className="text-sm text-gray-300 flex-1">{CATEGORY_LABELS[category]}</span>
                {activeCount > 0 && (
                  <span className="text-[10px] bg-purple-600/30 text-purple-300 px-1.5 py-0.5 rounded">
                    {activeCount}
                  </span>
                )}
              </button>

              {/* Properties */}
              {isExpanded && (
                <div className="pb-1" role="group">
                  {properties.map(({ property, displayName }) => {
                    const track = getTrackByProperty(property);
                    const isActive = !!track;

                    return (
                      <PropertyRow
                        key={property}
                        property={property}
                        displayName={displayName}
                        track={track}
                        isActive={isActive}
                        onAdd={() => onAddTrack(property)}
                        onRemove={() => track && onRemoveTrack(track.id)}
                        onToggle={(prop) => track && onTrackToggle(track.id, prop)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================================================
// Property Row Sub-component
// ============================================================================

interface PropertyRowProps {
  property: AnimatableProperty;
  displayName: string;
  track: Track | undefined;
  isActive: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onToggle: (property: 'visible' | 'muted' | 'solo' | 'locked') => void;
}

const PropertyRow = memo(function PropertyRow({
  property,
  displayName,
  track,
  isActive,
  onAdd,
  onRemove,
  onToggle,
}: PropertyRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 px-3 py-1.5 ml-5 mr-2 rounded',
        isActive ? 'bg-gray-800/50' : 'hover:bg-gray-800/30'
      )}
      role="treeitem"
      aria-selected={isActive}
    >
      {/* Property Name */}
      <span
        className={cn(
          'flex-1 text-xs truncate',
          isActive ? 'text-gray-200' : 'text-gray-500'
        )}
      >
        {displayName}
      </span>

      {/* Track Controls (when active) */}
      {isActive && track && (
        <div className="flex items-center gap-0.5">
          {/* Visibility Toggle */}
          <button
            onClick={() => onToggle('visible')}
            className={cn(
              'p-1 rounded hover:bg-gray-700 transition-colors',
              track.visible ? 'text-gray-400' : 'text-gray-600'
            )}
            aria-label={track.visible ? 'Hide track' : 'Show track'}
            aria-pressed={track.visible}
          >
            {track.visible ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
          </button>

          {/* Mute Toggle */}
          <button
            onClick={() => onToggle('muted')}
            className={cn(
              'p-1 rounded hover:bg-gray-700 transition-colors',
              track.muted ? 'text-red-400' : 'text-gray-600'
            )}
            aria-label={track.muted ? 'Unmute track' : 'Mute track'}
            aria-pressed={track.muted}
          >
            {track.muted ? (
              <VolumeX className="w-3 h-3" />
            ) : (
              <Volume2 className="w-3 h-3" />
            )}
          </button>

          {/* Lock Toggle */}
          <button
            onClick={() => onToggle('locked')}
            className={cn(
              'p-1 rounded hover:bg-gray-700 transition-colors',
              track.locked ? 'text-yellow-400' : 'text-gray-600'
            )}
            aria-label={track.locked ? 'Unlock track' : 'Lock track'}
            aria-pressed={track.locked}
          >
            {track.locked ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
          </button>
        </div>
      )}

      {/* Add/Remove Button */}
      {!isActive ? (
        <button
          onClick={onAdd}
          className="p-1 rounded hover:bg-gray-700 text-gray-600 hover:text-purple-400 transition-colors"
          aria-label={`Add ${displayName} track`}
        >
          <Plus className="w-3 h-3" />
        </button>
      ) : (
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-gray-700 text-gray-600 hover:text-red-400 transition-colors"
          aria-label={`Remove ${displayName} track`}
        >
          <span className="text-xs">×</span>
        </button>
      )}
    </div>
  );
});

export default PropertyList;
