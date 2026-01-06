'use client';

/**
 * Alert Animation Studio
 *
 * Main modal component for creating 3D animated stream alerts.
 * Requires Pro or Studio subscription.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import {
  useCreateAnimationProject,
  useUpdateAnimationProject,
  useGenerateDepthMap,
  useAnimationProject,
  type AnimationConfig,
} from '@aurastream/api-client';
import { PresetSelector } from './PresetSelector';
import { TimelineControls } from './TimelineControls';
import { ExportPanel } from './ExportPanel';
import { AnimationCanvas } from './AnimationCanvas';
import { DEFAULT_ANIMATION_CONFIG, type AlertAnimationStudioProps } from './types';

export function AlertAnimationStudio({
  isOpen,
  onClose,
  sourceAsset,
}: AlertAnimationStudioProps) {
  // Project state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>(DEFAULT_ANIMATION_CONFIG);
  const [depthMapUrl, setDepthMapUrl] = useState<string | null>(null);
  const [isGeneratingDepth, setIsGeneratingDepth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timeline state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Canvas ref for export
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hooks
  const createProject = useCreateAnimationProject();
  const updateProject = useUpdateAnimationProject();
  const generateDepthMap = useGenerateDepthMap();
  const { data: project, refetch: refetchProject } = useAnimationProject(projectId || undefined);

  // Initialize project when modal opens
  useEffect(() => {
    if (isOpen && sourceAsset && !projectId) {
      setError(null);
      createProject.mutate(
        {
          sourceUrl: sourceAsset.url,
          sourceAssetId: sourceAsset.id,
          name: `${sourceAsset.name} Animation`,
        },
        {
          onSuccess: (newProject) => {
            setProjectId(newProject.id);
            // Trigger depth map generation
            setIsGeneratingDepth(true);
            generateDepthMap.mutate(newProject.id, {
              onSuccess: (job) => {
                if (job.status === 'completed' && job.depthMapUrl) {
                  setDepthMapUrl(job.depthMapUrl);
                  setIsGeneratingDepth(false);
                } else {
                  // Poll for completion
                  pollDepthMapStatus(newProject.id);
                }
              },
              onError: (err) => {
                setError('Failed to generate depth map. Please try again.');
                setIsGeneratingDepth(false);
              },
            });
          },
          onError: (err) => {
            setError('Failed to create animation project. Please try again.');
          },
        }
      );
    }
  }, [isOpen, sourceAsset]);

  // Poll for depth map completion
  const pollDepthMapStatus = useCallback(
    async (id: string) => {
      const maxAttempts = 30;
      let attempts = 0;

      const poll = async () => {
        attempts++;
        await refetchProject();

        if (project?.depthMapUrl) {
          setDepthMapUrl(project.depthMapUrl);
          setIsGeneratingDepth(false);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setError('Depth map generation timed out. Please try again.');
          setIsGeneratingDepth(false);
        }
      };

      poll();
    },
    [project, refetchProject]
  );

  // Update project when config changes
  const handleConfigChange = useCallback(
    (newConfig: AnimationConfig) => {
      setAnimationConfig(newConfig);

      if (projectId) {
        updateProject.mutate({
          projectId,
          data: { animationConfig: newConfig },
        });
      }
    },
    [projectId, updateProject]
  );

  // Timeline controls
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback((timeMs: number) => {
    setCurrentTime(timeMs);
    setIsPlaying(false);
  }, []);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setProjectId(null);
    setAnimationConfig(DEFAULT_ANIMATION_CONFIG);
    setDepthMapUrl(null);
    setIsGeneratingDepth(false);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-[95vw] max-w-7xl flex-col overflow-hidden rounded-xl bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Animation Studio</h2>
              <p className="text-sm text-gray-400">{sourceAsset.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-900/30 px-6 py-3 text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Preview Canvas */}
          <div className="flex flex-1 flex-col">
            <div className="relative flex-1 bg-[#1a1a2e]">
              {/* Checkerboard pattern for transparency */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #252540 25%, transparent 25%),
                    linear-gradient(-45deg, #252540 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #252540 75%),
                    linear-gradient(-45deg, transparent 75%, #252540 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
              />

              {/* Canvas */}
              <AnimationCanvas
                sourceUrl={sourceAsset.url}
                depthMapUrl={depthMapUrl}
                config={animationConfig}
                canvasRef={canvasRef}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onTimeUpdate={setCurrentTime}
              />

              {/* Depth Map Loading Overlay */}
              {isGeneratingDepth && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  <p className="mt-3 text-sm text-gray-300">Generating depth map...</p>
                  <p className="text-xs text-gray-500">This enables 3D parallax effects</p>
                </div>
              )}
            </div>

            {/* Timeline Controls */}
            <TimelineControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              durationMs={animationConfig.durationMs}
              onPlayPause={handlePlayPause}
              onReset={handleReset}
              onSeek={handleSeek}
            />
          </div>

          {/* Right: Controls Panel */}
          <div className="flex w-80 flex-col border-l border-gray-800">
            {/* Preset Selector */}
            <div className="flex-1 overflow-y-auto">
              <PresetSelector config={animationConfig} onChange={handleConfigChange} />
            </div>

            {/* Export Panel */}
            {projectId && (
              <ExportPanel
                projectId={projectId}
                canvasRef={canvasRef}
                config={animationConfig}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
