/**
 * Template Preview Component
 * 
 * Shows a visual preview of a template with slot indicators.
 * Used in the template selector for hover previews.
 */

'use client';

import { cn } from '@/lib/utils';
import type { CanvasTemplate, TemplateSlot } from './data';
import { TEMPLATE_CATEGORY_ICONS, COLOR_SCHEME_DESCRIPTIONS } from './data';

// ============================================================================
// Icons
// ============================================================================

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ============================================================================
// Slot Preview
// ============================================================================

interface SlotPreviewProps {
  slot: TemplateSlot;
  canvasWidth: number;
  canvasHeight: number;
}

function SlotPreview({ slot, canvasWidth, canvasHeight }: SlotPreviewProps) {
  // Convert percentage to pixels for preview
  const left = (slot.position.x / 100) * canvasWidth - (slot.size.width / 100) * canvasWidth / 2;
  const top = (slot.position.y / 100) * canvasHeight - (slot.size.height / 100) * canvasHeight / 2;
  const width = (slot.size.width / 100) * canvasWidth;
  const height = (slot.size.height / 100) * canvasHeight;
  
  return (
    <div
      className={cn(
        'absolute border-2 border-dashed rounded-lg flex items-center justify-center',
        'text-xs font-medium transition-colors',
        slot.required
          ? 'border-interactive-500/60 bg-interactive-500/10 text-interactive-400'
          : 'border-border-subtle bg-background-elevated/50 text-text-muted'
      )}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: slot.zIndex,
      }}
    >
      <span className="truncate px-1 text-center leading-tight">
        {slot.label}
      </span>
    </div>
  );
}

// ============================================================================
// Template Preview
// ============================================================================

interface TemplatePreviewProps {
  template: CanvasTemplate;
  /** Preview size in pixels */
  size?: 'sm' | 'md' | 'lg';
  /** Show slot labels */
  showSlots?: boolean;
  /** Show template info overlay */
  showInfo?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Whether this template is selected */
  isSelected?: boolean;
  /** Mouse enter handler */
  onMouseEnter?: () => void;
  /** Mouse leave handler */
  onMouseLeave?: () => void;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { width: 160, height: 90 },
  md: { width: 240, height: 135 },
  lg: { width: 320, height: 180 },
};

export function TemplatePreview({
  template,
  size = 'md',
  showSlots = true,
  showInfo = true,
  onClick,
  isSelected = false,
  onMouseEnter,
  onMouseLeave,
  className,
}: TemplatePreviewProps) {
  const { width, height } = SIZE_CONFIG[size];
  const categoryIcon = TEMPLATE_CATEGORY_ICONS[template.category];
  
  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer transition-all',
        'border-2 group',
        isSelected
          ? 'border-interactive-500 ring-2 ring-interactive-500/30'
          : 'border-border-subtle hover:border-interactive-400',
        onClick && 'hover:scale-[1.02]',
        className
      )}
      style={{ width, height }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Background based on color scheme */}
      <div
        className={cn(
          'absolute inset-0',
          template.colorScheme === 'dark' && 'bg-gradient-to-br from-gray-900 to-gray-800',
          template.colorScheme === 'light' && 'bg-gradient-to-br from-gray-100 to-white',
          template.colorScheme === 'vibrant' && 'bg-gradient-to-br from-purple-600 to-pink-500',
          template.colorScheme === 'brand' && 'bg-gradient-to-br from-interactive-600 to-interactive-400'
        )}
      />
      
      {/* Slot previews */}
      {showSlots && (
        <div className="absolute inset-0">
          {template.slots.map(slot => (
            <SlotPreview
              key={slot.id}
              slot={slot}
              canvasWidth={width}
              canvasHeight={height}
            />
          ))}
        </div>
      )}
      
      {/* Premium badge */}
      {template.isPremium && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-xs font-medium">
          <StarIcon />
          <span>Pro</span>
        </div>
      )}
      
      {/* Category icon */}
      <div className="absolute top-2 left-2 text-lg opacity-80">
        {categoryIcon}
      </div>
      
      {/* Info overlay on hover */}
      {showInfo && (
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-sm font-medium truncate">{template.name}</p>
          <p className="text-white/70 text-xs truncate">{template.description}</p>
        </div>
      )}
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 bg-interactive-500/20 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-interactive-500 text-white flex items-center justify-center">
            ✓
          </div>
        </div>
      )}
    </div>
  );
}
