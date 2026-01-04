/**
 * Canvas Template Types
 * 
 * Pre-made layouts for common compositions.
 * Users pick a template, swap in their assets, done.
 */

import type { MediaAssetType } from '@aurastream/api-client';
import type { AnySketchElement } from '../canvas-export/types';
import type { LabeledRegion } from '../sketch/RegionLabel';

/**
 * Template categories for organization
 */
export type TemplateCategory =
  | 'gaming'      // Gaming thumbnails, emotes
  | 'reaction'    // Reaction faces, expressions
  | 'tutorial'    // How-to, educational
  | 'vlog'        // Personal, lifestyle
  | 'minimal'     // Clean, simple layouts
  | 'dramatic'    // High-impact, bold
  | 'custom';     // User-created templates

/**
 * A slot in a template where users can place their assets
 */
export interface TemplateSlot {
  /** Unique ID for this slot */
  id: string;
  /** Human-readable label (e.g., "Your Face", "Logo") */
  label: string;
  /** What asset types can go in this slot */
  acceptedTypes: MediaAssetType[];
  /** Position as percentage (0-100) */
  position: { x: number; y: number };
  /** Size as percentage (0-100) */
  size: { width: number; height: number };
  /** Layer order */
  zIndex: number;
  /** Is this slot required? */
  required: boolean;
  /** Placeholder image URL */
  placeholder: string;
}


/**
 * A canvas template with pre-defined layout
 */
export interface CanvasTemplate {
  /** Unique template ID */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Category for filtering */
  category: TemplateCategory;
  /** Preview thumbnail URL */
  thumbnail: string;
  /** Target asset type this template is designed for */
  targetAssetType: string;
  /** Placeholder slots for user assets */
  slots: TemplateSlot[];
  /** Pre-defined sketch decorations (arrows, shapes, etc.) */
  decorations: AnySketchElement[];
  /** Pre-defined labeled regions */
  regions: LabeledRegion[];
  /** Suggested prompt additions */
  promptHints: string[];
  /** Is this a premium template? */
  isPremium?: boolean;
}

/**
 * A filled template slot with user's asset
 */
export interface FilledSlot {
  slotId: string;
  assetId: string;
  assetUrl: string;
  assetType: MediaAssetType;
}

/**
 * Template application result
 */
export interface AppliedTemplate {
  templateId: string;
  filledSlots: FilledSlot[];
  decorations: AnySketchElement[];
  regions: LabeledRegion[];
}
