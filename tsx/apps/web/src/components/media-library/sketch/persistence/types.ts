/**
 * Sketch Persistence Types
 * 
 * Photoshop-style project persistence with full metadata tracking,
 * version history, and auto-save capabilities.
 */

import type { AnySketchElement } from '../../canvas-export/types';
import type { BrushSettings, TextSettings, LineStyle } from '../types';

// ============================================================================
// Element Metadata
// ============================================================================

/**
 * Metadata tracked for each sketch element
 */
export interface ElementMetadata {
  /** When the element was created */
  createdAt: string;
  /** When the element was last modified */
  modifiedAt: string;
  /** User who created the element (for future collaboration) */
  createdBy?: string;
  /** Number of times this element has been modified */
  modificationCount: number;
  /** Whether element is locked from editing */
  locked: boolean;
  /** Whether element is visible */
  visible: boolean;
  /** Custom name for the element (layer name) */
  name?: string;
  /** Tags for organization */
  tags?: string[];
  /** Element-specific notes */
  notes?: string;
}

/**
 * Sketch element with full metadata
 */
export type SketchElementWithMeta = AnySketchElement & {
  /** Element metadata */
  meta: ElementMetadata;
};

// ============================================================================
// Project State
// ============================================================================

/**
 * Brush/tool settings snapshot for project state
 */
export interface ToolSettingsSnapshot {
  brush: BrushSettings;
  text: TextSettings;
  activeToolOnSave: string;
}

/**
 * Canvas settings for the project
 */
export interface CanvasSettings {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Background color (null = transparent) */
  backgroundColor: string | null;
  /** Grid visibility */
  showGrid: boolean;
  /** Grid size in percentage */
  gridSize: number;
  /** Snap to grid enabled */
  snapToGrid: boolean;
  /** Ruler visibility */
  showRulers: boolean;
}

/**
 * Complete sketch project state - like a PSD file
 */
export interface SketchProjectState {
  /** Project format version for migrations */
  version: string;
  /** All sketch elements with metadata */
  elements: SketchElementWithMeta[];
  /** Tool settings at time of save */
  toolSettings: ToolSettingsSnapshot;
  /** Canvas configuration */
  canvasSettings: CanvasSettings;
  /** Currently selected element IDs */
  selectedIds: string[];
  /** Viewport state (pan/zoom) */
  viewport: ViewportState;
}

/**
 * Viewport state for pan/zoom
 */
export interface ViewportState {
  /** Zoom level (1 = 100%) */
  zoom: number;
  /** Pan offset X */
  panX: number;
  /** Pan offset Y */
  panY: number;
}

// ============================================================================
// Version History
// ============================================================================

/**
 * A single version in the history
 */
export interface ProjectVersion {
  /** Unique version ID */
  id: string;
  /** Version number (auto-incremented) */
  versionNumber: number;
  /** When this version was created */
  createdAt: string;
  /** Description of changes */
  description: string;
  /** Type of save (auto, manual, checkpoint) */
  saveType: 'auto' | 'manual' | 'checkpoint';
  /** Compressed project state */
  state: SketchProjectState;
  /** Thumbnail data URL */
  thumbnailUrl?: string;
  /** Size in bytes (for storage management) */
  sizeBytes: number;
}

/**
 * Version history configuration
 */
export interface VersionHistoryConfig {
  /** Maximum number of versions to keep */
  maxVersions: number;
  /** Auto-save interval in milliseconds */
  autoSaveInterval: number;
  /** Whether auto-save is enabled */
  autoSaveEnabled: boolean;
  /** Create checkpoint every N manual saves */
  checkpointInterval: number;
}

// ============================================================================
// Project Metadata
// ============================================================================

/**
 * Full project metadata
 */
export interface ProjectMetadata {
  /** Project ID */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** When project was created */
  createdAt: string;
  /** When project was last modified */
  modifiedAt: string;
  /** When project was last opened */
  lastOpenedAt: string;
  /** Total time spent editing (milliseconds) */
  totalEditTime: number;
  /** Number of saves */
  saveCount: number;
  /** Current version number */
  currentVersion: number;
  /** Asset type (twitch_emote, youtube_thumbnail, etc.) */
  assetType: string;
  /** Tags for organization */
  tags: string[];
  /** Whether project has unsaved changes */
  isDirty: boolean;
  /** Whether project is favorited */
  isFavorite: boolean;
  /** Color label for organization */
  colorLabel?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';
}

// ============================================================================
// Complete Project File
// ============================================================================

/**
 * Complete project file structure - everything needed to fully restore a project
 */
export interface SketchProjectFile {
  /** File format identifier */
  format: 'aurastream-sketch-project';
  /** Format version for migrations */
  formatVersion: '1.0.0';
  /** Project metadata */
  metadata: ProjectMetadata;
  /** Current project state */
  currentState: SketchProjectState;
  /** Version history */
  versions: ProjectVersion[];
  /** Version history configuration */
  historyConfig: VersionHistoryConfig;
}

// ============================================================================
// Auto-Save State
// ============================================================================

/**
 * Auto-save status
 */
export interface AutoSaveStatus {
  /** Whether auto-save is currently running */
  isEnabled: boolean;
  /** Last auto-save timestamp */
  lastSaveAt: string | null;
  /** Next scheduled auto-save */
  nextSaveAt: string | null;
  /** Whether there are pending changes */
  hasPendingChanges: boolean;
  /** Auto-save error if any */
  error: string | null;
}

// ============================================================================
// Persistence Actions
// ============================================================================

/**
 * Actions for project persistence
 */
export interface PersistenceActions {
  // Project lifecycle
  createProject: (name: string, assetType: string, canvasSettings?: Partial<CanvasSettings>) => SketchProjectFile;
  loadProject: (projectId: string) => Promise<SketchProjectFile>;
  saveProject: (description?: string) => Promise<void>;
  saveProjectAs: (name: string) => Promise<SketchProjectFile>;
  closeProject: () => void;
  
  // Version management
  createCheckpoint: (description: string) => void;
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  getVersionHistory: () => ProjectVersion[];
  
  // Auto-save
  enableAutoSave: (interval?: number) => void;
  disableAutoSave: () => void;
  getAutoSaveStatus: () => AutoSaveStatus;
  
  // Element metadata
  setElementName: (elementId: string, name: string) => void;
  setElementLocked: (elementId: string, locked: boolean) => void;
  setElementVisible: (elementId: string, visible: boolean) => void;
  setElementTags: (elementId: string, tags: string[]) => void;
  setElementNotes: (elementId: string, notes: string) => void;
  
  // Project metadata
  setProjectName: (name: string) => void;
  setProjectTags: (tags: string[]) => void;
  setProjectFavorite: (isFavorite: boolean) => void;
  setProjectColorLabel: (color: ProjectMetadata['colorLabel']) => void;
  
  // Export/Import
  exportProjectFile: () => Blob;
  importProjectFile: (file: File) => Promise<SketchProjectFile>;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  width: 1280,
  height: 720,
  backgroundColor: null,
  showGrid: false,
  gridSize: 10,
  snapToGrid: false,
  showRulers: false,
};

export const DEFAULT_VIEWPORT: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const DEFAULT_HISTORY_CONFIG: VersionHistoryConfig = {
  maxVersions: 50,
  autoSaveInterval: 30000, // 30 seconds
  autoSaveEnabled: true,
  checkpointInterval: 10,
};

export const DEFAULT_ELEMENT_METADATA: ElementMetadata = {
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
  modificationCount: 0,
  locked: false,
  visible: true,
};
