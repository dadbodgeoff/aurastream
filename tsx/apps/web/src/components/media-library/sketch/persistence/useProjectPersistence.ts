/**
 * Project Persistence Store
 * 
 * Zustand store for managing project persistence, auto-save,
 * version history, and metadata tracking.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  SketchProjectFile,
  SketchProjectState,
  ProjectMetadata,
  ProjectVersion,
  AutoSaveStatus,
  VersionHistoryConfig,
  CanvasSettings,
  ElementMetadata,
  SketchElementWithMeta,
  ToolSettingsSnapshot,
  ViewportState,
} from './types';
import {
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_VIEWPORT,
  DEFAULT_HISTORY_CONFIG,
  DEFAULT_ELEMENT_METADATA,
} from './types';
import type { AnySketchElement } from '../../canvas-export/types';
import type { BrushSettings, TextSettings } from '../types';
import { DEFAULT_BRUSH, DEFAULT_TEXT } from '../constants';

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `proj-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function calculateStateSize(state: SketchProjectState): number {
  return new Blob([JSON.stringify(state)]).size;
}

function compressState(state: SketchProjectState): SketchProjectState {
  // For now, just return as-is. Could implement actual compression later.
  return JSON.parse(JSON.stringify(state));
}

// ============================================================================
// Store State Interface
// ============================================================================

interface ProjectPersistenceState {
  // Current project
  currentProject: SketchProjectFile | null;
  isLoading: boolean;
  error: string | null;
  
  // Auto-save
  autoSaveStatus: AutoSaveStatus;
  autoSaveTimerId: NodeJS.Timeout | null;
  
  // Session tracking
  sessionStartTime: number | null;
  lastActivityTime: number | null;
  
  // Recent projects (for quick access)
  recentProjects: Array<{
    id: string;
    name: string;
    assetType: string;
    thumbnailUrl?: string;
    lastOpenedAt: string;
  }>;
}

interface ProjectPersistenceActions {
  // Project lifecycle
  createProject: (name: string, assetType: string, canvasSettings?: Partial<CanvasSettings>) => SketchProjectFile;
  loadProject: (project: SketchProjectFile) => void;
  updateProjectState: (elements: AnySketchElement[], toolSettings?: Partial<ToolSettingsSnapshot>) => void;
  saveProject: (description?: string) => ProjectVersion;
  closeProject: () => void;
  
  // Version management
  createCheckpoint: (description: string) => ProjectVersion;
  restoreVersion: (versionId: string) => SketchProjectState | null;
  deleteVersion: (versionId: string) => void;
  
  // Auto-save
  startAutoSave: (interval?: number) => void;
  stopAutoSave: () => void;
  triggerAutoSave: () => void;
  
  // Element metadata
  addElementWithMeta: (element: AnySketchElement, name?: string) => SketchElementWithMeta;
  updateElementMeta: (elementId: string, updates: Partial<ElementMetadata>) => void;
  getElementMeta: (elementId: string) => ElementMetadata | null;
  
  // Project metadata
  updateProjectMetadata: (updates: Partial<ProjectMetadata>) => void;
  markDirty: () => void;
  markClean: () => void;
  
  // Activity tracking
  recordActivity: () => void;
  getEditTime: () => number;
  
  // Export/Import
  exportToFile: () => Blob | null;
  importFromFile: (data: string) => SketchProjectFile | null;
  
  // Utilities
  setError: (error: string | null) => void;
  addToRecent: (project: SketchProjectFile) => void;
}

type ProjectPersistenceStore = ProjectPersistenceState & ProjectPersistenceActions;

// ============================================================================
// Store Implementation
// ============================================================================

export const useProjectPersistence = create<ProjectPersistenceStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      isLoading: false,
      error: null,
      autoSaveStatus: {
        isEnabled: false,
        lastSaveAt: null,
        nextSaveAt: null,
        hasPendingChanges: false,
        error: null,
      },
      autoSaveTimerId: null,
      sessionStartTime: null,
      lastActivityTime: null,
      recentProjects: [],

      // ========================================================================
      // Project Lifecycle
      // ========================================================================

      createProject: (name, assetType, canvasSettings) => {
        const now = new Date().toISOString();
        const id = generateId();
        
        const metadata: ProjectMetadata = {
          id,
          name,
          createdAt: now,
          modifiedAt: now,
          lastOpenedAt: now,
          totalEditTime: 0,
          saveCount: 0,
          currentVersion: 0,
          assetType,
          tags: [],
          isDirty: false,
          isFavorite: false,
        };
        
        const currentState: SketchProjectState = {
          version: '1.0.0',
          elements: [],
          toolSettings: {
            brush: { ...DEFAULT_BRUSH },
            text: { ...DEFAULT_TEXT },
            activeToolOnSave: 'pen',
          },
          canvasSettings: { ...DEFAULT_CANVAS_SETTINGS, ...canvasSettings },
          selectedIds: [],
          viewport: { ...DEFAULT_VIEWPORT },
        };
        
        const project: SketchProjectFile = {
          format: 'aurastream-sketch-project',
          formatVersion: '1.0.0',
          metadata,
          currentState,
          versions: [],
          historyConfig: { ...DEFAULT_HISTORY_CONFIG },
        };
        
        set({
          currentProject: project,
          sessionStartTime: Date.now(),
          lastActivityTime: Date.now(),
          error: null,
        });
        
        get().addToRecent(project);
        
        return project;
      },

      loadProject: (project) => {
        const now = new Date().toISOString();
        
        // Update last opened time
        const updatedProject = {
          ...project,
          metadata: {
            ...project.metadata,
            lastOpenedAt: now,
          },
        };
        
        set({
          currentProject: updatedProject,
          sessionStartTime: Date.now(),
          lastActivityTime: Date.now(),
          error: null,
          autoSaveStatus: {
            ...get().autoSaveStatus,
            hasPendingChanges: false,
          },
        });
        
        get().addToRecent(updatedProject);
        
        // Start auto-save if enabled
        if (project.historyConfig.autoSaveEnabled) {
          get().startAutoSave(project.historyConfig.autoSaveInterval);
        }
      },

      updateProjectState: (elements, toolSettings) => {
        const { currentProject } = get();
        if (!currentProject) return;
        
        // Convert elements to elements with metadata
        const elementsWithMeta: SketchElementWithMeta[] = elements.map(el => {
          const existing = currentProject.currentState.elements.find(e => e.id === el.id);
          if (existing) {
            return {
              ...el,
              meta: {
                ...existing.meta,
                modifiedAt: new Date().toISOString(),
                modificationCount: existing.meta.modificationCount + 1,
              },
            } as SketchElementWithMeta;
          }
          return {
            ...el,
            meta: { ...DEFAULT_ELEMENT_METADATA, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString() },
          } as SketchElementWithMeta;
        });
        
        set({
          currentProject: {
            ...currentProject,
            currentState: {
              ...currentProject.currentState,
              elements: elementsWithMeta,
              toolSettings: toolSettings 
                ? { ...currentProject.currentState.toolSettings, ...toolSettings }
                : currentProject.currentState.toolSettings,
            },
            metadata: {
              ...currentProject.metadata,
              modifiedAt: new Date().toISOString(),
              isDirty: true,
            },
          },
          autoSaveStatus: {
            ...get().autoSaveStatus,
            hasPendingChanges: true,
          },
        });
        
        get().recordActivity();
      },

      saveProject: (description) => {
        const { currentProject } = get();
        if (!currentProject) throw new Error('No project loaded');
        
        const now = new Date().toISOString();
        const versionNumber = currentProject.metadata.currentVersion + 1;
        
        const version: ProjectVersion = {
          id: generateId(),
          versionNumber,
          createdAt: now,
          description: description || `Save #${versionNumber}`,
          saveType: 'manual',
          state: compressState(currentProject.currentState),
          sizeBytes: calculateStateSize(currentProject.currentState),
        };
        
        // Trim old versions if needed
        let versions = [...currentProject.versions, version];
        if (versions.length > currentProject.historyConfig.maxVersions) {
          // Keep checkpoints, remove oldest auto-saves first
          const checkpoints = versions.filter(v => v.saveType === 'checkpoint');
          const others = versions.filter(v => v.saveType !== 'checkpoint');
          const toKeep = currentProject.historyConfig.maxVersions - checkpoints.length;
          versions = [...others.slice(-toKeep), ...checkpoints].sort(
            (a, b) => a.versionNumber - b.versionNumber
          );
        }
        
        // Check if we should create a checkpoint
        const manualSaves = versions.filter(v => v.saveType === 'manual').length;
        if (manualSaves % currentProject.historyConfig.checkpointInterval === 0) {
          version.saveType = 'checkpoint';
          version.description = `Checkpoint: ${version.description}`;
        }
        
        set({
          currentProject: {
            ...currentProject,
            metadata: {
              ...currentProject.metadata,
              modifiedAt: now,
              saveCount: currentProject.metadata.saveCount + 1,
              currentVersion: versionNumber,
              isDirty: false,
            },
            versions,
          },
          autoSaveStatus: {
            ...get().autoSaveStatus,
            lastSaveAt: now,
            hasPendingChanges: false,
          },
        });
        
        return version;
      },

      closeProject: () => {
        get().stopAutoSave();
        
        // Calculate total edit time
        const { currentProject, sessionStartTime } = get();
        if (currentProject && sessionStartTime) {
          const sessionTime = Date.now() - sessionStartTime;
          set({
            currentProject: {
              ...currentProject,
              metadata: {
                ...currentProject.metadata,
                totalEditTime: currentProject.metadata.totalEditTime + sessionTime,
              },
            },
          });
        }
        
        set({
          currentProject: null,
          sessionStartTime: null,
          lastActivityTime: null,
        });
      },

      // ========================================================================
      // Version Management
      // ========================================================================

      createCheckpoint: (description) => {
        const { currentProject } = get();
        if (!currentProject) throw new Error('No project loaded');
        
        const now = new Date().toISOString();
        const versionNumber = currentProject.metadata.currentVersion + 1;
        
        const version: ProjectVersion = {
          id: generateId(),
          versionNumber,
          createdAt: now,
          description: `Checkpoint: ${description}`,
          saveType: 'checkpoint',
          state: compressState(currentProject.currentState),
          sizeBytes: calculateStateSize(currentProject.currentState),
        };
        
        set({
          currentProject: {
            ...currentProject,
            metadata: {
              ...currentProject.metadata,
              currentVersion: versionNumber,
            },
            versions: [...currentProject.versions, version],
          },
        });
        
        return version;
      },

      restoreVersion: (versionId) => {
        const { currentProject } = get();
        if (!currentProject) return null;
        
        const version = currentProject.versions.find(v => v.id === versionId);
        if (!version) return null;
        
        // Save current state as a version before restoring
        get().saveProject(`Before restore to version ${version.versionNumber}`);
        
        set({
          currentProject: {
            ...currentProject,
            currentState: JSON.parse(JSON.stringify(version.state)),
            metadata: {
              ...currentProject.metadata,
              modifiedAt: new Date().toISOString(),
              isDirty: true,
            },
          },
        });
        
        return version.state;
      },

      deleteVersion: (versionId) => {
        const { currentProject } = get();
        if (!currentProject) return;
        
        set({
          currentProject: {
            ...currentProject,
            versions: currentProject.versions.filter(v => v.id !== versionId),
          },
        });
      },

      // ========================================================================
      // Auto-Save
      // ========================================================================

      startAutoSave: (interval) => {
        const { currentProject, autoSaveTimerId } = get();
        if (!currentProject) return;
        
        // Clear existing timer
        if (autoSaveTimerId) {
          clearInterval(autoSaveTimerId);
        }
        
        const saveInterval = interval || currentProject.historyConfig.autoSaveInterval;
        
        const timerId = setInterval(() => {
          get().triggerAutoSave();
        }, saveInterval);
        
        set({
          autoSaveTimerId: timerId,
          autoSaveStatus: {
            ...get().autoSaveStatus,
            isEnabled: true,
            nextSaveAt: new Date(Date.now() + saveInterval).toISOString(),
          },
        });
      },

      stopAutoSave: () => {
        const { autoSaveTimerId } = get();
        if (autoSaveTimerId) {
          clearInterval(autoSaveTimerId);
        }
        
        set({
          autoSaveTimerId: null,
          autoSaveStatus: {
            ...get().autoSaveStatus,
            isEnabled: false,
            nextSaveAt: null,
          },
        });
      },

      triggerAutoSave: () => {
        const { currentProject, autoSaveStatus } = get();
        if (!currentProject || !autoSaveStatus.hasPendingChanges) return;
        
        try {
          const now = new Date().toISOString();
          const versionNumber = currentProject.metadata.currentVersion + 1;
          
          const version: ProjectVersion = {
            id: generateId(),
            versionNumber,
            createdAt: now,
            description: 'Auto-save',
            saveType: 'auto',
            state: compressState(currentProject.currentState),
            sizeBytes: calculateStateSize(currentProject.currentState),
          };
          
          // Keep fewer auto-saves than manual saves
          let versions = [...currentProject.versions, version];
          const autoSaves = versions.filter(v => v.saveType === 'auto');
          if (autoSaves.length > 10) {
            // Remove oldest auto-saves
            const oldestAutoSave = autoSaves[0];
            versions = versions.filter(v => v.id !== oldestAutoSave.id);
          }
          
          set({
            currentProject: {
              ...currentProject,
              metadata: {
                ...currentProject.metadata,
                currentVersion: versionNumber,
              },
              versions,
            },
            autoSaveStatus: {
              ...get().autoSaveStatus,
              lastSaveAt: now,
              hasPendingChanges: false,
              error: null,
              nextSaveAt: new Date(Date.now() + currentProject.historyConfig.autoSaveInterval).toISOString(),
            },
          });
        } catch (error) {
          set({
            autoSaveStatus: {
              ...get().autoSaveStatus,
              error: error instanceof Error ? error.message : 'Auto-save failed',
            },
          });
        }
      },

      // ========================================================================
      // Element Metadata
      // ========================================================================

      addElementWithMeta: (element, name) => {
        const now = new Date().toISOString();
        const elementWithMeta: SketchElementWithMeta = {
          ...element,
          meta: {
            ...DEFAULT_ELEMENT_METADATA,
            createdAt: now,
            modifiedAt: now,
            name: name || `${element.type} ${element.id.slice(-4)}`,
          },
        };
        return elementWithMeta;
      },

      updateElementMeta: (elementId, updates) => {
        const { currentProject } = get();
        if (!currentProject) return;
        
        const elements = currentProject.currentState.elements.map(el =>
          el.id === elementId
            ? { ...el, meta: { ...el.meta, ...updates, modifiedAt: new Date().toISOString() } }
            : el
        );
        
        set({
          currentProject: {
            ...currentProject,
            currentState: {
              ...currentProject.currentState,
              elements,
            },
          },
        });
      },

      getElementMeta: (elementId) => {
        const { currentProject } = get();
        if (!currentProject) return null;
        
        const element = currentProject.currentState.elements.find(el => el.id === elementId);
        return element?.meta || null;
      },

      // ========================================================================
      // Project Metadata
      // ========================================================================

      updateProjectMetadata: (updates) => {
        const { currentProject } = get();
        if (!currentProject) return;
        
        set({
          currentProject: {
            ...currentProject,
            metadata: {
              ...currentProject.metadata,
              ...updates,
              modifiedAt: new Date().toISOString(),
            },
          },
        });
      },

      markDirty: () => {
        const { currentProject } = get();
        if (!currentProject) return;
        
        set({
          currentProject: {
            ...currentProject,
            metadata: {
              ...currentProject.metadata,
              isDirty: true,
            },
          },
          autoSaveStatus: {
            ...get().autoSaveStatus,
            hasPendingChanges: true,
          },
        });
      },

      markClean: () => {
        const { currentProject } = get();
        if (!currentProject) return;
        
        set({
          currentProject: {
            ...currentProject,
            metadata: {
              ...currentProject.metadata,
              isDirty: false,
            },
          },
          autoSaveStatus: {
            ...get().autoSaveStatus,
            hasPendingChanges: false,
          },
        });
      },

      // ========================================================================
      // Activity Tracking
      // ========================================================================

      recordActivity: () => {
        set({ lastActivityTime: Date.now() });
      },

      getEditTime: () => {
        const { currentProject, sessionStartTime } = get();
        if (!currentProject || !sessionStartTime) return 0;
        
        const sessionTime = Date.now() - sessionStartTime;
        return currentProject.metadata.totalEditTime + sessionTime;
      },

      // ========================================================================
      // Export/Import
      // ========================================================================

      exportToFile: () => {
        const { currentProject } = get();
        if (!currentProject) return null;
        
        const json = JSON.stringify(currentProject, null, 2);
        return new Blob([json], { type: 'application/json' });
      },

      importFromFile: (data) => {
        try {
          const project = JSON.parse(data) as SketchProjectFile;
          
          // Validate format
          if (project.format !== 'aurastream-sketch-project') {
            throw new Error('Invalid project file format');
          }
          
          // TODO: Handle version migrations if formatVersion differs
          
          return project;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to import project' });
          return null;
        }
      },

      // ========================================================================
      // Utilities
      // ========================================================================

      setError: (error) => {
        set({ error });
      },

      addToRecent: (project) => {
        const { recentProjects } = get();
        
        const recentEntry = {
          id: project.metadata.id,
          name: project.metadata.name,
          assetType: project.metadata.assetType,
          thumbnailUrl: project.versions[project.versions.length - 1]?.thumbnailUrl,
          lastOpenedAt: project.metadata.lastOpenedAt,
        };
        
        // Remove if already exists, add to front
        const filtered = recentProjects.filter(p => p.id !== project.metadata.id);
        const updated = [recentEntry, ...filtered].slice(0, 10); // Keep last 10
        
        set({ recentProjects: updated });
      },
    }),
    {
      name: 'aurastream-sketch-projects',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentProjects: state.recentProjects,
        // Don't persist currentProject - that should be loaded explicitly
      }),
    }
  )
);

export default useProjectPersistence;
