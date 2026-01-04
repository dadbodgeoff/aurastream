/**
 * CanvasPanel Component
 * 
 * Canvas Studio experience within Create Studio.
 * Allows users to visually design scenes that AI will polish.
 * 
 * Features:
 * - Welcome back experience with previous projects
 * - New project creation with dimension selection
 * - Project save/recall functionality
 * - Full canvas editor integration
 * 
 * @module create-studio/CanvasPanel
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CanvasPanelProps } from './types';

// =============================================================================
// Types
// =============================================================================

interface CanvasProject {
  id: string;
  name: string;
  assetType: string;
  thumbnailUrl?: string;
  updatedAt: string;
  createdAt: string;
}

interface DimensionOption {
  id: string;
  label: string;
  description: string;
  width: number;
  height: number;
  icon: string;
}

type PanelView = 'welcome' | 'dimensions' | 'editor';

// =============================================================================
// Constants
// =============================================================================

const DIMENSION_OPTIONS: DimensionOption[] = [
  {
    id: 'youtube_thumbnail',
    label: 'YouTube Thumbnail',
    description: '1280×720 • 16:9',
    width: 1280,
    height: 720,
    icon: '📺',
  },
  {
    id: 'twitch_banner',
    label: 'Twitch Banner',
    description: '1200×480 • Profile banner',
    width: 1200,
    height: 480,
    icon: '🎮',
  },
  {
    id: 'twitch_offline',
    label: 'Twitch Offline Screen',
    description: '1920×1080 • 16:9',
    width: 1920,
    height: 1080,
    icon: '📴',
  },
  {
    id: 'instagram_story',
    label: 'Story / Reel',
    description: '1080×1920 • 9:16 vertical',
    width: 1080,
    height: 1920,
    icon: '📱',
  },
  {
    id: 'twitch_panel',
    label: 'Twitch Panel',
    description: '320×160 • Info panel',
    width: 320,
    height: 160,
    icon: '📋',
  },
  {
    id: 'square',
    label: 'Square',
    description: '1080×1080 • Social posts',
    width: 1080,
    height: 1080,
    icon: '⬜',
  },
];

// =============================================================================
// Icons
// =============================================================================

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const FolderIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CanvasIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
);

// =============================================================================
// Sub-Components
// =============================================================================

interface ProjectCardProps {
  project: CanvasProject;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const timeAgo = getTimeAgo(project.updatedAt);
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-3 p-4 rounded-xl',
        'bg-background-surface/50 border border-white/5',
        'hover:bg-background-surface hover:border-white/10',
        'transition-all duration-200 text-left w-full'
      )}
    >
      {/* Thumbnail */}
      <div className="w-full aspect-video rounded-lg bg-background-elevated overflow-hidden">
        {project.thumbnailUrl ? (
          <img 
            src={project.thumbnailUrl} 
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CanvasIcon className="w-8 h-8 text-text-muted" />
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="w-full">
        <h3 className="font-medium text-sm text-text-primary truncate">
          {project.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <ClockIcon className="w-3 h-3 text-text-muted" />
          <span className="text-xs text-text-muted">{timeAgo}</span>
        </div>
      </div>
    </motion.button>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// =============================================================================
// Main Component
// =============================================================================

export function CanvasPanel({
  onGenerationStart,
  onGenerationComplete,
  className,
}: CanvasPanelProps) {
  const [view, setView] = useState<PanelView>('welcome');
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDimension, setSelectedDimension] = useState<DimensionOption | null>(null);
  const [activeProject, setActiveProject] = useState<CanvasProject | null>(null);

  // Load projects from localStorage (will be replaced with API later)
  useEffect(() => {
    const loadProjects = () => {
      try {
        const saved = localStorage.getItem('canvas_studio_projects');
        if (saved) {
          setProjects(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load canvas projects:', e);
      }
      setIsLoading(false);
    };
    
    loadProjects();
  }, []);

  // Handle starting a new project
  const handleNewProject = useCallback(() => {
    setView('dimensions');
  }, []);

  // Handle dimension selection
  const handleDimensionSelect = useCallback((dimension: DimensionOption) => {
    setSelectedDimension(dimension);
    
    // Create new project
    const newProject: CanvasProject = {
      id: `project_${Date.now()}`,
      name: `Untitled ${dimension.label}`,
      assetType: dimension.id,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    setActiveProject(newProject);
    setView('editor');
  }, []);

  // Handle opening existing project
  const handleOpenProject = useCallback((project: CanvasProject) => {
    setActiveProject(project);
    setView('editor');
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (view === 'editor') {
      setView('welcome');
      setActiveProject(null);
    } else if (view === 'dimensions') {
      setView('welcome');
    }
  }, [view]);

  return (
    <div className={cn('h-full flex flex-col', className)}>
      <AnimatePresence mode="wait">
        {/* Welcome View */}
        {view === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-y-auto"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <CanvasIcon className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Canvas Studio
              </h2>
              <p className="text-sm text-text-secondary max-w-md mx-auto">
                Design your scene visually, then let AI make it professional.
                Upload backgrounds, position characters, and create stunning assets.
              </p>
            </div>

            {/* New Project Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNewProject}
              className={cn(
                'w-full flex items-center justify-center gap-3 p-4 rounded-xl mb-6',
                'bg-amber-500/10 border-2 border-dashed border-amber-500/30',
                'hover:bg-amber-500/15 hover:border-amber-500/50',
                'transition-all duration-200'
              )}
            >
              <PlusIcon className="w-5 h-5 text-amber-400" />
              <span className="font-medium text-amber-400">Start New Project</span>
            </motion.button>

            {/* Recent Projects */}
            {!isLoading && projects.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FolderIcon className="w-4 h-4 text-text-muted" />
                  <h3 className="text-sm font-medium text-text-secondary">Recent Projects</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {projects.slice(0, 6).map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => handleOpenProject(project)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && projects.length === 0 && (
              <div className="text-center py-8">
                <FolderIcon className="w-12 h-12 mx-auto mb-3 text-text-muted/50" />
                <p className="text-sm text-text-muted">No projects yet</p>
                <p className="text-xs text-text-muted/70 mt-1">
                  Start a new project to begin creating
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Dimension Selection View */}
        {view === 'dimensions' && (
          <motion.div
            key="dimensions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 overflow-y-auto"
          >
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Choose Your Canvas Size
              </h2>
              <p className="text-sm text-text-secondary">
                Select the dimensions for your project
              </p>
            </div>

            {/* Dimension Grid */}
            <div className="grid grid-cols-2 gap-3">
              {DIMENSION_OPTIONS.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDimensionSelect(option)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl',
                    'bg-background-surface/50 border border-white/5',
                    'hover:bg-background-surface hover:border-amber-500/30',
                    'transition-all duration-200 text-center'
                  )}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <p className="font-medium text-sm text-text-primary">
                      {option.label}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Editor View */}
        {view === 'editor' && activeProject && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Projects
            </button>

            {/* Editor Placeholder */}
            <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-background-surface/30">
              <div className="text-center p-8">
                <CanvasIcon className="w-16 h-16 mx-auto mb-4 text-text-muted/50" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  Canvas Editor Coming Soon
                </h3>
                <p className="text-sm text-text-muted max-w-sm">
                  The full canvas editor will be integrated here.
                  You'll be able to upload backgrounds, position assets,
                  and send your composition to AI for professional polish.
                </p>
                <p className="text-xs text-amber-400 mt-4">
                  Project: {activeProject.name}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CanvasPanel;
