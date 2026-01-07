'use client';

/**
 * Alert Animation Studio V2 - Enterprise Grade UX
 *
 * Professional animation studio with proper layout for all V2 features:
 * - Full-width canvas with floating controls
 * - Dockable panels (Inspector, Timeline, Effects)
 * - Tabbed right panel for organized controls
 * - Proper sizing and spacing throughout
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Wand2,
  RefreshCw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Clock,
  Layers,
  Settings,
  Sliders,
  Palette,
  Download,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Zap,
  Box,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Crosshair,
} from 'lucide-react';
import {
  useCreateAnimationProject,
  useUpdateAnimationProject,
  useGenerateDepthMap,
  useAnimationProject,
  useAnimationSuggestions,
  useRegenerateAnimationSuggestions,
  useRemoveAnimationBackground,
  useStreamEventPresets,
  type AnimationConfig,
  type AnimationSuggestion,
  type StreamEventPreset,
} from '@aurastream/api-client';
import { cn } from '@/lib/utils';
import { DEFAULT_TRANSFORM, type TransformState, type ToolMode } from './CanvasToolbar';
import { DEFAULT_ANIMATION_CONFIG, type AlertAnimationStudioProps } from './types';
import type { AnimationCanvas as AnimationCanvasType } from './AnimationCanvas';

// V2 Engine imports
import { useAnimationStudioV2 } from './hooks/useAnimationStudioV2';
import {
  checkV2Support,
  V2_FEATURES,
  createTimeline,
  type Timeline,
  type TimelineUIState,
  type AnimatableProperty,
  type AudioReactiveMapping,
  type ExportFormat,
  type ExportResult,
} from './engine';

// V2 UI Components
import {
  TimelinePanel,
  AudioUploader,
  FrequencyBandsCompact,
  BeatCounter,
  ReactivityMapper,
  ExportPanel as ExportPanelV2,
  type ExportOptions,
} from './ui';

// Lazy load AnimationCanvas
const AnimationCanvas = dynamic<React.ComponentProps<typeof AnimationCanvasType>>(
  () => import('./AnimationCanvas').then(mod => ({ default: mod.AnimationCanvas })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <span className="text-sm text-gray-400">Loading 3D Engine...</span>
        </div>
      </div>
    ),
  }
);

// Panel types
type RightPanelTab = 'presets' | 'effects' | 'audio' | 'export';
type BottomPanelMode = 'timeline' | 'properties' | 'hidden';

// Effect categories for organized display
const EFFECT_CATEGORIES = {
  glow: { label: 'Glow', icon: Sparkles, color: 'yellow' },
  wiggle: { label: 'Wiggle', icon: Move, color: 'purple' },
  depth: { label: '3D Depth', icon: Box, color: 'cyan' },
  particles: { label: 'Particles', icon: Sparkles, color: 'pink' },
} as const;

// Stream event presets
const STREAM_EVENTS = [
  { id: 'new_sub', label: 'New Sub', icon: '🎉', color: 'green' },
  { id: 'raid', label: 'Raid', icon: '⚔️', color: 'red' },
  { id: 'donation', label: 'Donation', icon: '💎', color: 'cyan' },
  { id: 'follow', label: 'Follow', icon: '👋', color: 'purple' },
  { id: 'bits', label: 'Bits', icon: '💜', color: 'violet' },
  { id: 'gift_sub', label: 'Gift Sub', icon: '🎁', color: 'pink' },
] as const;

export function AlertAnimationStudioV2({
  isOpen,
  onClose,
  sourceAsset,
}: AlertAnimationStudioProps) {
  // Core state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>(DEFAULT_ANIMATION_CONFIG);
  const [depthMapUrl, setDepthMapUrl] = useState<string | null>(null);
  const [isGeneratingDepth, setIsGeneratingDepth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('presets');
  const [bottomPanelMode, setBottomPanelMode] = useState<BottomPanelMode>('timeline');
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(280);
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(false);
  
  // Canvas state
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [hasTransparentBackground, setHasTransparentBackground] = useState(false);
  const [transparentSourceUrl, setTransparentSourceUrl] = useState<string | null>(null);

  // AI Suggestion state
  const [showSuggestionBanner, setShowSuggestionBanner] = useState(true);
  const [appliedSuggestion, setAppliedSuggestion] = useState(false);

  // Audio state
  const [audioMappings, setAudioMappings] = useState<AudioReactiveMapping[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);

  // V2 Support check
  const v2Support = useMemo(() => checkV2Support(), []);

  // V2 Integration Hook
  const {
    state: v2State,
    actions: v2Actions,
    timeline: timelineHook,
    playback: playbackHook,
  } = useAnimationStudioV2(512, 512, animationConfig.durationMs);

  // API Hooks
  const createProject = useCreateAnimationProject();
  const updateProject = useUpdateAnimationProject();
  const generateDepthMap = useGenerateDepthMap();
  const { data: project, refetch: refetchProject } = useAnimationProject(projectId || undefined);
  const { data: suggestionsData } = useAnimationSuggestions(sourceAsset?.id);
  const regenerateSuggestions = useRegenerateAnimationSuggestions();
  const removeBackground = useRemoveAnimationBackground();
  const { data: eventPresets } = useStreamEventPresets();

  // Initialize project
  useEffect(() => {
    if (isOpen && sourceAsset && !projectId) {
      setError(null);
      setShowSuggestionBanner(true);
      setAppliedSuggestion(false);
      
      createProject.mutate(
        {
          sourceUrl: sourceAsset.url,
          sourceAssetId: sourceAsset.id,
          name: `${sourceAsset.name} Animation`,
        },
        {
          onSuccess: (newProject) => {
            setProjectId(newProject.id);
            setIsGeneratingDepth(true);
            generateDepthMap.mutate(newProject.id, {
              onSuccess: (job) => {
                if (job.status === 'completed' && job.depthMapUrl) {
                  setDepthMapUrl(job.depthMapUrl);
                  setIsGeneratingDepth(false);
                } else {
                  pollDepthMapStatus(newProject.id);
                }
              },
              onError: () => {
                setError('Failed to generate depth map');
                setIsGeneratingDepth(false);
              },
            });
          },
          onError: () => setError('Failed to create project'),
        }
      );
    }
  }, [isOpen, sourceAsset]);

  // Initialize WebGL
  useEffect(() => {
    if (webglCanvasRef.current && V2_FEATURES.webglParticles && !v2State.isWebGLActive) {
      v2Actions.initWebGL(webglCanvasRef.current);
    }
  }, [webglCanvasRef.current, v2State.isWebGLActive]);

  // Auto-apply AI suggestion
  useEffect(() => {
    if (suggestionsData?.suggestions && !appliedSuggestion && showSuggestionBanner) {
      handleApplySuggestion(suggestionsData.suggestions);
      setAppliedSuggestion(true);
    }
  }, [suggestionsData, appliedSuggestion, showSuggestionBanner]);

  // Poll depth map status
  const pollDepthMapStatus = useCallback(async (id: string) => {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const { data: updatedProject } = await refetchProject();
      if (updatedProject?.depthMapUrl) {
        setDepthMapUrl(updatedProject.depthMapUrl);
        setIsGeneratingDepth(false);
      } else if (attempts < 30) {
        setTimeout(poll, 1000);
      } else {
        setError('Depth map generation timed out');
        setIsGeneratingDepth(false);
      }
    };
    poll();
  }, [refetchProject]);

  // Config change handler
  const handleConfigChange = useCallback((newConfig: AnimationConfig) => {
    setAnimationConfig(newConfig);
    if (projectId) {
      updateProject.mutate({ projectId, data: { animationConfig: newConfig } });
    }
  }, [projectId, updateProject]);

  // Apply AI suggestion
  const handleApplySuggestion = useCallback((suggestion: AnimationSuggestion) => {
    setAnimationConfig(suggestion.config);
    if (projectId) {
      updateProject.mutate({ projectId, data: { animationConfig: suggestion.config } });
    }
  }, [projectId, updateProject]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    playbackHook.isPlaying ? playbackHook.pause() : playbackHook.play();
  }, [playbackHook]);

  const handleSeek = useCallback((timeMs: number) => {
    playbackHook.seek(timeMs);
  }, [playbackHook]);

  // Audio handlers
  const handleAudioUpload = useCallback(async (file: File) => {
    setAudioFile(file);
    await v2Actions.loadAudio(file);
    v2Actions.startAudio();
  }, [v2Actions]);

  // Export handler
  const handleV2Export = useCallback(async (
    format: ExportFormat,
    options: ExportOptions
  ): Promise<ExportResult> => {
    if (format === 'obs') {
      const html = await v2Actions.exportToOBS(animationConfig);
      await navigator.clipboard.writeText(html);
      return {
        success: true,
        format: 'obs',
        fileSize: html.length,
        exportDuration: 0,
        dimensions: { width: 512, height: 512 },
        frameCount: 0,
        suggestedFilename: `${sourceAsset.name}-alert.html`,
        mimeType: 'text/html',
      };
    }
    
    if (!canvasRef.current) {
      return {
        success: false,
        format,
        fileSize: 0,
        exportDuration: 0,
        dimensions: { width: 512, height: 512 },
        frameCount: 0,
        error: 'Canvas not available',
        suggestedFilename: `animation.${format}`,
        mimeType: format === 'webm' ? 'video/webm' : format === 'gif' ? 'image/gif' : 'image/apng',
      };
    }
    
    return v2Actions.exportToVideo(format, canvasRef.current, animationConfig.durationMs);
  }, [v2Actions, animationConfig, sourceAsset]);

  // Background removal
  const handleRemoveBackground = useCallback(() => {
    if (!projectId || isRemovingBackground || hasTransparentBackground) return;
    setIsRemovingBackground(true);
    removeBackground.mutate(projectId, {
      onSuccess: (result) => {
        if (result.status === 'completed' && result.transparentSourceUrl) {
          setTransparentSourceUrl(result.transparentSourceUrl);
          setHasTransparentBackground(true);
          setIsRemovingBackground(false);
        } else {
          // Poll for completion
          pollBackgroundRemovalStatus();
        }
      },
      onError: () => {
        setError('Failed to remove background');
        setIsRemovingBackground(false);
      },
    });
  }, [projectId, isRemovingBackground, hasTransparentBackground, removeBackground]);

  // Poll for background removal completion
  const pollBackgroundRemovalStatus = useCallback(async () => {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const { data: updatedProject } = await refetchProject();
      if (updatedProject?.transparentSourceUrl) {
        setTransparentSourceUrl(updatedProject.transparentSourceUrl);
        setHasTransparentBackground(true);
        setIsRemovingBackground(false);
      } else if (attempts < 60) {
        setTimeout(poll, 1000);
      } else {
        setError('Background removal timed out');
        setIsRemovingBackground(false);
      }
    };
    poll();
  }, [refetchProject]);

  // Close handler
  const handleClose = useCallback(() => {
    setProjectId(null);
    setAnimationConfig(DEFAULT_ANIMATION_CONFIG);
    setDepthMapUrl(null);
    setError(null);
    playbackHook.stop();
    v2Actions.stopAudio();
    v2Actions.disposeWebGL();
    onClose();
  }, [onClose, playbackHook, v2Actions]);

  if (!isOpen) return null;

  const suggestion = suggestionsData?.suggestions;
  const currentTime = playbackHook.currentTime ?? 0;
  const isPlaying = playbackHook.isPlaying ?? false;

  // Timeline UI state
  const timelineUIState: TimelineUIState = {
    currentTime,
    isPlaying,
    playbackSpeed: 1,
    selectedKeyframes: new Set(timelineHook.uiState?.selectedKeyframes ?? []),
    selectedTracks: new Set(timelineHook.uiState?.selectedTracks ?? []),
    zoom: timelineHook.uiState?.zoom ?? 100,
    scrollX: timelineHook.uiState?.scrollX ?? 0,
    scrollY: timelineHook.uiState?.scrollY ?? 0,
    isDragging: false,
    dragType: null,
    dragStartPos: null,
    snapToFrames: true,
    snapToKeyframes: true,
    snapToMarkers: true,
    snapToBeats: v2State.isAudioActive,
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0d0d14]">
      {/* Main Layout */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-gray-800/50 bg-[#12121a] px-4">
          {/* Left: Title & Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Animation Studio</h1>
                <p className="text-xs text-gray-500">{sourceAsset.name}</p>
              </div>
            </div>
            
            {/* Status Badges */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-400">
                <Layers className="h-3 w-3" />
                V2 Engine
              </span>
              {depthMapUrl && (
                <span className="flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-400">
                  <Box className="h-3 w-3" />
                  3D Active
                </span>
              )}
              {v2State.isAudioActive && (
                <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
                  <Music className="h-3 w-3" />
                  Audio
                </span>
              )}
            </div>
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => playbackHook.stop()}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-500 transition-colors"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button
              onClick={() => handleSeek(animationConfig.durationMs)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <div className="ml-2 flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-1.5">
              <span className="font-mono text-sm text-white">
                {(currentTime / 1000).toFixed(2)}s
              </span>
              <span className="text-gray-600">/</span>
              <span className="font-mono text-sm text-gray-400">
                {(animationConfig.durationMs / 1000).toFixed(2)}s
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={cn(
                "rounded-lg p-2 transition-colors",
                showGrid ? "bg-purple-600/20 text-purple-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
              title="Toggle Grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowSafeZone(!showSafeZone)}
              className={cn(
                "rounded-lg p-2 transition-colors",
                showSafeZone ? "bg-purple-600/20 text-purple-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
              title="Toggle Safe Zone"
            >
              <Crosshair className="h-4 w-4" />
            </button>
            <div className="mx-2 h-6 w-px bg-gray-800" />
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* AI Suggestion Banner */}
        <AnimatePresence>
          {showSuggestionBanner && suggestion && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-purple-800/30 bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-purple-900/30"
            >
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Wand2 className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <p className="flex-1 text-sm text-purple-200">
                  <span className="font-medium">AI:</span>{' '}
                  <span className="text-purple-300">{suggestion.vibe}</span> vibe detected. {suggestion.reasoning}
                </p>
                <button
                  onClick={() => regenerateSuggestions.mutate(sourceAsset.id)}
                  disabled={regenerateSuggestions.isPending}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-purple-300 hover:text-white transition-colors"
                >
                  <RefreshCw className={cn("h-3 w-3", regenerateSuggestions.isPending && "animate-spin")} />
                  Retry
                </button>
                <button
                  onClick={() => setShowSuggestionBanner(false)}
                  className="text-xs text-purple-400 hover:text-purple-200"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-900/30 px-4 py-2 text-red-300 border-b border-red-800/30">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-xs underline hover:no-underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas Area */}
          <div className="flex flex-1 flex-col">
            <div className="relative flex-1 bg-[#0a0a12]">
              {/* Checkerboard Background */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #151520 25%, transparent 25%),
                    linear-gradient(-45deg, #151520 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #151520 75%),
                    linear-gradient(-45deg, transparent 75%, #151520 75%)
                  `,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
                }}
              />

              {/* Grid Overlay */}
              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #6366f1 1px, transparent 1px),
                      linear-gradient(to bottom, #6366f1 1px, transparent 1px)
                    `,
                    backgroundSize: '64px 64px',
                  }}
                />
              )}

              {/* Safe Zone Overlay */}
              {showSafeZone && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[90%] h-[90%] border-2 border-dashed border-yellow-500/30 rounded-lg" />
                </div>
              )}

              {/* Canvas Container - Centered */}
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="relative aspect-square w-full max-w-[512px] max-h-full rounded-lg overflow-hidden shadow-2xl shadow-purple-900/20 ring-1 ring-white/10">
                  <AnimationCanvas
                    sourceUrl={transparentSourceUrl || sourceAsset.url}
                    depthMapUrl={depthMapUrl}
                    config={animationConfig}
                    canvasRef={canvasRef}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    onTimeUpdate={handleSeek}
                    transform={transform}
                    toolMode={toolMode}
                    onTransformChange={setTransform}
                    timelineValues={timelineHook.currentValues}
                    audioAnalysis={v2State.audioAnalysis}
                    audioMappings={audioMappings}
                  />

                  {/* WebGL Particle Canvas */}
                  {V2_FEATURES.webglParticles && (
                    <canvas
                      ref={webglCanvasRef}
                      className="absolute inset-0 pointer-events-none"
                      width={512}
                      height={512}
                      style={{ display: v2State.isWebGLActive ? 'block' : 'none' }}
                    />
                  )}
                </div>
              </div>

              {/* Floating Canvas Tools */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl bg-gray-900/90 backdrop-blur-sm p-1.5 shadow-xl ring-1 ring-white/10">
                <button
                  onClick={() => setToolMode('select')}
                  className={cn(
                    "rounded-lg p-2 transition-colors",
                    toolMode === 'select' ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                  title="Select"
                >
                  <Crosshair className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToolMode('pan')}
                  className={cn(
                    "rounded-lg p-2 transition-colors",
                    toolMode === 'pan' ? "bg-purple-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                  title="Pan"
                >
                  <Move className="h-4 w-4" />
                </button>
                <div className="mx-1 h-6 w-px bg-gray-700" />
                <button
                  onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 3) }))}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs text-gray-400 font-mono min-w-[48px] text-center">
                  {Math.round(transform.scale * 100)}%
                </span>
                <button
                  onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.1, 0.25) }))}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <div className="mx-1 h-6 w-px bg-gray-700" />
                <button
                  onClick={() => setTransform(DEFAULT_TRANSFORM)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                  title="Reset View"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRemoveBackground}
                  disabled={isRemovingBackground || hasTransparentBackground}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    hasTransparentBackground
                      ? "bg-green-600/20 text-green-400"
                      : isRemovingBackground
                      ? "bg-gray-800 text-gray-500"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                  )}
                >
                  {isRemovingBackground ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasTransparentBackground ? (
                    "BG Removed"
                  ) : (
                    "Remove BG"
                  )}
                </button>
              </div>

              {/* Depth Map Loading Overlay */}
              {isGeneratingDepth && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                  <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
                  <p className="mt-4 text-sm text-gray-300">Generating depth map...</p>
                  <p className="text-xs text-gray-500">Enables 3D parallax effects</p>
                </div>
              )}
            </div>

            {/* Bottom Panel - Timeline */}
            {bottomPanelMode !== 'hidden' && (
              <div 
                className="border-t border-gray-800/50 bg-[#12121a]"
                style={{ height: bottomPanelHeight }}
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-gray-800/50 px-4 py-2">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setBottomPanelMode('timeline')}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        bottomPanelMode === 'timeline'
                          ? "bg-purple-600/20 text-purple-400"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      )}
                    >
                      <Clock className="h-4 w-4" />
                      Timeline
                    </button>
                    <button
                      onClick={() => setBottomPanelMode('properties')}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        bottomPanelMode === 'properties'
                          ? "bg-purple-600/20 text-purple-400"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      )}
                    >
                      <Sliders className="h-4 w-4" />
                      Properties
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBottomPanelHeight(h => h === 280 ? 400 : 280)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      {bottomPanelHeight > 280 ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setBottomPanelMode('hidden')}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Panel Content */}
                <div className="h-[calc(100%-44px)] overflow-hidden">
                  {bottomPanelMode === 'timeline' && (
                    <TimelinePanel
                      timeline={timelineHook.timeline ?? createTimeline('Animation', animationConfig.durationMs)}
                      uiState={timelineUIState}
                      onTimeChange={handleSeek}
                      onKeyframeAdd={(trackId, time, value) => timelineHook.addKeyframe?.(trackId, time, value)}
                      onKeyframeMove={(trackId, kfId, newTime) => timelineHook.moveKeyframe?.(trackId, kfId, newTime)}
                      onKeyframeSelect={(kfId, add) => timelineHook.selectKeyframe?.(kfId, add)}
                      onKeyframeDelete={(trackId, kfId) => timelineHook.removeKeyframe?.(trackId, kfId)}
                      onTrackToggle={(trackId, prop) => {
                        if (prop === 'visible') timelineHook.toggleTrackVisibility?.(trackId);
                        else if (prop === 'muted') timelineHook.toggleTrackMute?.(trackId);
                        else if (prop === 'locked') timelineHook.toggleTrackLock?.(trackId);
                      }}
                      onTrackAdd={(prop) => timelineHook.addTrack?.(prop)}
                      onTrackRemove={(trackId) => timelineHook.removeTrack?.(trackId)}
                      onZoomChange={(zoom) => timelineHook.setZoom?.(zoom)}
                      onPlayPause={handlePlayPause}
                      className="h-full"
                    />
                  )}

                  {bottomPanelMode === 'properties' && (
                    <div className="h-full overflow-y-auto p-4">
                      <div className="grid grid-cols-4 gap-4">
                        {/* Transform Properties */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Transform</h4>
                          <PropertySlider 
                            label="Scale X" 
                            value={transform.scale} 
                            min={0.1} 
                            max={3} 
                            onChange={(v) => setTransform(prev => ({ ...prev, scale: v }))}
                          />
                          <PropertySlider 
                            label="Scale Y" 
                            value={transform.scale} 
                            min={0.1} 
                            max={3} 
                            onChange={(v) => setTransform(prev => ({ ...prev, scale: v }))}
                          />
                          <PropertySlider 
                            label="Rotation" 
                            value={transform.rotation ?? 0} 
                            min={-180} 
                            max={180} 
                            suffix="°" 
                            onChange={(v) => setTransform(prev => ({ ...prev, rotation: v }))}
                          />
                          <PropertySlider 
                            label="Position X" 
                            value={transform.offsetX} 
                            min={-256} 
                            max={256} 
                            suffix="px" 
                            onChange={(v) => setTransform(prev => ({ ...prev, offsetX: v }))}
                          />
                          <PropertySlider 
                            label="Position Y" 
                            value={transform.offsetY} 
                            min={-256} 
                            max={256} 
                            suffix="px" 
                            onChange={(v) => setTransform(prev => ({ ...prev, offsetY: v }))}
                          />
                        </div>
                        {/* Loop Animation */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Loop</h4>
                          <PropertySlider 
                            label="Intensity Min" 
                            value={animationConfig.loop?.intensityMin ?? 0} 
                            min={0} 
                            max={1} 
                            onChange={(v) => handleConfigChange({
                              ...animationConfig,
                              loop: animationConfig.loop ? { ...animationConfig.loop, intensityMin: v } : null
                            })}
                          />
                          <PropertySlider 
                            label="Intensity Max" 
                            value={animationConfig.loop?.intensityMax ?? 1} 
                            min={0} 
                            max={1} 
                            onChange={(v) => handleConfigChange({
                              ...animationConfig,
                              loop: animationConfig.loop ? { ...animationConfig.loop, intensityMax: v } : null
                            })}
                          />
                          <PropertySlider 
                            label="Frequency" 
                            value={animationConfig.loop?.frequency ?? 1} 
                            min={0.1} 
                            max={5} 
                            onChange={(v) => handleConfigChange({
                              ...animationConfig,
                              loop: animationConfig.loop ? { ...animationConfig.loop, frequency: v } : null
                            })}
                          />
                        </div>
                        {/* Depth */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">3D Depth</h4>
                          <PropertySlider 
                            label="Intensity" 
                            value={animationConfig.depthEffect?.intensity ?? 0.5} 
                            min={0} 
                            max={1} 
                            onChange={(v) => handleConfigChange({
                              ...animationConfig,
                              depthEffect: animationConfig.depthEffect ? { ...animationConfig.depthEffect, intensity: v } : null
                            })}
                          />
                          <PropertySlider 
                            label="Depth Scale" 
                            value={animationConfig.depthEffect?.depthScale ?? 1} 
                            min={0.5} 
                            max={2} 
                            onChange={(v) => handleConfigChange({
                              ...animationConfig,
                              depthEffect: animationConfig.depthEffect ? { ...animationConfig.depthEffect, depthScale: v } : null
                            })}
                          />
                        </div>
                        {/* Particles */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Particles</h4>
                          <PropertySlider 
                            label="Count" 
                            value={animationConfig.particles?.count ?? 50} 
                            min={10} 
                            max={200} 
                            step={10}
                            onChange={(v) => handleConfigChange({
                              ...animationConfig,
                              particles: animationConfig.particles ? { ...animationConfig.particles, count: v } : null
                            })}
                          />
                          <PropertySlider 
                            label="Speed" 
                            value={animationConfig.particles?.speed ?? 1} 
                            min={0.1} 
                            max={3} 
                            onChange={(v) => handleConfigChange({
                              ...animationConfig,
                              particles: animationConfig.particles ? { ...animationConfig.particles, speed: v } : null
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show Bottom Panel Button (when hidden) */}
            {bottomPanelMode === 'hidden' && (
              <button
                onClick={() => setBottomPanelMode('timeline')}
                className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-gray-900/90 backdrop-blur-sm px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors ring-1 ring-white/10"
              >
                <Clock className="h-4 w-4" />
                Show Timeline
              </button>
            )}
          </div>

          {/* Right Panel */}
          <AnimatePresence>
            {!rightPanelCollapsed && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex flex-col border-l border-gray-800/50 bg-[#12121a] overflow-hidden"
              >
                {/* Panel Tabs */}
                <div className="flex border-b border-gray-800/50">
                  {[
                    { id: 'presets' as const, label: 'Presets', icon: Zap },
                    { id: 'effects' as const, label: 'Effects', icon: Sparkles },
                    { id: 'audio' as const, label: 'Audio', icon: Music },
                    { id: 'export' as const, label: 'Export', icon: Download },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setRightPanelTab(tab.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2",
                        rightPanelTab === tab.id
                          ? "text-purple-400 border-purple-500 bg-purple-500/5"
                          : "text-gray-500 border-transparent hover:text-gray-300"
                      )}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto">
                  {/* Presets Tab */}
                  {rightPanelTab === 'presets' && (
                    <div className="p-4 space-y-6">
                      {/* AI Recommendation */}
                      {suggestion && (
                        <button
                          onClick={() => handleApplySuggestion(suggestion)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 hover:border-purple-500/50 transition-all group"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/30">
                            <Wand2 className="h-5 w-5 text-purple-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-purple-200">AI Recommended</p>
                            <p className="text-xs text-purple-400">{suggestion.vibe} • {suggestion.recommendedPreset}</p>
                          </div>
                        </button>
                      )}

                      {/* Stream Events */}
                      <div>
                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Stream Events</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {eventPresets ? eventPresets.map((preset) => (
                            <button
                              key={preset.eventType}
                              onClick={() => handleConfigChange(preset.animationConfig)}
                              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/50 transition-all"
                            >
                              <span className="text-2xl">{preset.icon || '🎯'}</span>
                              <span className="text-xs text-gray-300">{preset.name}</span>
                            </button>
                          )) : STREAM_EVENTS.map(event => (
                            <button
                              key={event.id}
                              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all opacity-50"
                            >
                              <span className="text-2xl">{event.icon}</span>
                              <span className="text-xs text-gray-300">{event.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Duration & Loop */}
                      <div className="space-y-4 pt-4 border-t border-gray-800/50">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">Duration</label>
                            <span className="text-sm text-purple-400 font-mono">{(animationConfig.durationMs / 1000).toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            min={500}
                            max={10000}
                            step={500}
                            value={animationConfig.durationMs}
                            onChange={(e) => handleConfigChange({ ...animationConfig, durationMs: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">Loop</label>
                            <span className="text-sm text-purple-400 font-mono">
                              {animationConfig.loopCount === 0 ? '∞' : `${animationConfig.loopCount}x`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={animationConfig.loopCount}
                            onChange={(e) => handleConfigChange({ ...animationConfig, loopCount: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Effects Tab */}
                  {rightPanelTab === 'effects' && (
                    <div className="p-4 space-y-6">
                      {/* Glow Effect (uses Loop with type 'glow') */}
                      <EffectSection
                        title="Glow"
                        icon={<Sparkles className="h-4 w-4" />}
                        enabled={animationConfig.loop?.type === 'glow' || animationConfig.loop?.type === 'rgb_glow'}
                        onToggle={() => handleConfigChange({
                          ...animationConfig,
                          loop: animationConfig.loop?.type === 'glow' || animationConfig.loop?.type === 'rgb_glow' 
                            ? null 
                            : { type: 'glow', color: '#a855f7', intensityMin: 0.3, intensityMax: 1, blurRadius: 20 }
                        })}
                      >
                        <EffectPresetGrid
                          presets={[
                            { id: 'none', label: 'None', active: animationConfig.loop?.type !== 'glow' && animationConfig.loop?.type !== 'rgb_glow' },
                            { id: 'glow', label: 'Pulse', icon: '💫', active: animationConfig.loop?.type === 'glow' },
                            { id: 'rgb_glow', label: 'Rainbow', icon: '🌈', active: animationConfig.loop?.type === 'rgb_glow' },
                          ]}
                          onSelect={(id) => {
                            if (id === 'none') {
                              handleConfigChange({ ...animationConfig, loop: null });
                            } else {
                              handleConfigChange({
                                ...animationConfig,
                                loop: { type: id as 'glow' | 'rgb_glow', color: '#a855f7', intensityMin: 0.3, intensityMax: 1, blurRadius: 20 }
                              });
                            }
                          }}
                        />
                      </EffectSection>

                      {/* Loop Animation */}
                      <EffectSection
                        title="Loop Animation"
                        icon={<RotateCcw className="h-4 w-4" />}
                        enabled={!!animationConfig.loop && animationConfig.loop.type !== 'glow' && animationConfig.loop.type !== 'rgb_glow'}
                        onToggle={() => handleConfigChange({
                          ...animationConfig,
                          loop: animationConfig.loop && animationConfig.loop.type !== 'glow' && animationConfig.loop.type !== 'rgb_glow'
                            ? null 
                            : { type: 'wiggle', angleMax: 5, frequency: 2 }
                        })}
                      >
                        <EffectPresetGrid
                          presets={[
                            { id: 'none', label: 'None', active: !animationConfig.loop || animationConfig.loop.type === 'glow' || animationConfig.loop.type === 'rgb_glow' },
                            { id: 'wiggle', label: 'Wiggle', icon: '〰️', active: animationConfig.loop?.type === 'wiggle' },
                            { id: 'float', label: 'Float', icon: '☁️', active: animationConfig.loop?.type === 'float' },
                            { id: 'pulse', label: 'Pulse', icon: '💓', active: animationConfig.loop?.type === 'pulse' },
                            { id: 'breathe', label: 'Breathe', icon: '🌬️', active: animationConfig.loop?.type === 'breathe' },
                            { id: 'shake', label: 'Shake', icon: '📳', active: animationConfig.loop?.type === 'shake' },
                          ]}
                          onSelect={(id) => {
                            if (id === 'none') {
                              handleConfigChange({ ...animationConfig, loop: null });
                            } else {
                              handleConfigChange({
                                ...animationConfig,
                                loop: { type: id as any, frequency: 2 }
                              });
                            }
                          }}
                        />
                      </EffectSection>

                      {/* 3D Depth Effect */}
                      <EffectSection
                        title="3D Depth Effect"
                        icon={<Box className="h-4 w-4" />}
                        enabled={!!animationConfig.depthEffect}
                        onToggle={() => handleConfigChange({
                          ...animationConfig,
                          depthEffect: animationConfig.depthEffect ? null : { type: 'parallax', intensity: 0.5 }
                        })}
                        badge={depthMapUrl ? "Ready" : "Generating..."}
                        badgeColor={depthMapUrl ? "green" : "yellow"}
                      >
                        <EffectPresetGrid
                          presets={[
                            { id: 'none', label: 'None', active: !animationConfig.depthEffect },
                            { id: 'parallax', label: 'Parallax', icon: '🎯', active: animationConfig.depthEffect?.type === 'parallax' },
                            { id: 'tilt', label: 'Tilt', icon: '📐', active: animationConfig.depthEffect?.type === 'tilt' },
                            { id: 'pop_out', label: 'Pop Out', icon: '🎪', active: animationConfig.depthEffect?.type === 'pop_out' },
                          ]}
                          onSelect={(id) => {
                            if (id === 'none') {
                              handleConfigChange({ ...animationConfig, depthEffect: null });
                            } else {
                              handleConfigChange({
                                ...animationConfig,
                                depthEffect: { type: id as any, intensity: 0.5 }
                              });
                            }
                          }}
                        />
                      </EffectSection>

                      {/* Particles */}
                      <EffectSection
                        title="Particles"
                        icon={<Sparkles className="h-4 w-4" />}
                        enabled={!!animationConfig.particles}
                        onToggle={() => handleConfigChange({
                          ...animationConfig,
                          particles: animationConfig.particles ? null : { type: 'sparkles', count: 50, speed: 1 }
                        })}
                      >
                        <EffectPresetGrid
                          presets={[
                            { id: 'none', label: 'None', active: !animationConfig.particles },
                            { id: 'sparkles', label: 'Sparkles', icon: '✨', active: animationConfig.particles?.type === 'sparkles' },
                            { id: 'confetti', label: 'Confetti', icon: '🎊', active: animationConfig.particles?.type === 'confetti' },
                            { id: 'hearts', label: 'Hearts', icon: '💕', active: animationConfig.particles?.type === 'hearts' },
                            { id: 'fire', label: 'Fire', icon: '🔥', active: animationConfig.particles?.type === 'fire' },
                            { id: 'snow', label: 'Snow', icon: '❄️', active: animationConfig.particles?.type === 'snow' },
                          ]}
                          onSelect={(id) => {
                            if (id === 'none') {
                              handleConfigChange({ ...animationConfig, particles: null });
                            } else {
                              handleConfigChange({
                                ...animationConfig,
                                particles: { type: id as any, count: 50, speed: 1 }
                              });
                            }
                          }}
                        />
                      </EffectSection>
                    </div>
                  )}

                  {/* Audio Tab */}
                  {rightPanelTab === 'audio' && (
                    <div className="p-4 space-y-4">
                      <AudioUploader
                        onAudioLoad={async (file) => {
                          setAudioFile(file);
                          await v2Actions.loadAudio(file);
                          v2Actions.startAudio();
                        }}
                        currentAudio={audioFile ? {
                          name: audioFile.name,
                          size: audioFile.size,
                          duration: 0,
                          type: audioFile.type,
                          url: URL.createObjectURL(audioFile),
                        } : null}
                        onRemove={() => {
                          setAudioFile(null);
                          v2Actions.stopAudio();
                        }}
                      />

                      {v2State.isAudioActive && v2State.audioAnalysis && (
                        <>
                          <div className="p-4 rounded-xl bg-gray-800/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-300">Audio Analysis</span>
                              <button
                                onClick={() => setAudioMuted(!audioMuted)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                              >
                                {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                              </button>
                            </div>
                            <FrequencyBandsCompact bands={v2State.audioAnalysis.bands} className="h-16" />
                            <div className="flex items-center justify-between text-xs">
                              <BeatCounter
                                bpm={v2State.audioAnalysis.bpm}
                                beatPhase={v2State.audioAnalysis.beatPhase}
                                timeSinceLastBeat={v2State.audioAnalysis.timeSinceLastBeat}
                              />
                              <span className="text-gray-500">
                                Energy: {(v2State.audioAnalysis.energy * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          <ReactivityMapper
                            mappings={audioMappings}
                            availableTargets={[
                              { value: 'scaleUniform', label: 'Scale', category: 'transform' },
                              { value: 'opacity', label: 'Opacity', category: 'transform' },
                              { value: 'rotationZ', label: 'Rotation', category: 'transform' },
                              { value: 'glowIntensity', label: 'Glow', category: 'effects' },
                            ]}
                            onMappingChange={(id, updates) => {
                              setAudioMappings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
                            }}
                            onMappingAdd={() => {
                              setAudioMappings(prev => [...prev, {
                                id: `mapping-${Date.now()}`,
                                enabled: true,
                                source: { type: 'energy' },
                                target: 'scaleUniform',
                                inputMin: 0,
                                inputMax: 1,
                                outputMin: 1,
                                outputMax: 1.2,
                                smoothing: 0.3,
                                triggerMode: 'continuous',
                                invert: false,
                                clamp: true,
                              }]);
                            }}
                            onMappingRemove={(id) => {
                              setAudioMappings(prev => prev.filter(m => m.id !== id));
                            }}
                          />
                        </>
                      )}

                      {!v2State.isAudioActive && (
                        <div className="text-center py-8 text-gray-500">
                          <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Upload audio to enable reactive animations</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Export Tab */}
                  {rightPanelTab === 'export' && projectId && (
                    <ExportPanelV2
                      alertConfig={{
                        id: projectId,
                        name: sourceAsset.name,
                        width: 512,
                        height: 512,
                        duration: animationConfig.durationMs,
                      }}
                      onExport={handleV2Export}
                      exportProgress={v2State.exportProgress}
                      canExport={!v2State.isExporting}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right Panel Toggle (when collapsed) */}
          {rightPanelCollapsed && (
            <button
              onClick={() => setRightPanelCollapsed(false)}
              className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-16 bg-gray-800 hover:bg-gray-700 rounded-l-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// Helper Components

interface PropertySliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange?: (value: number) => void;
}

function PropertySlider({ label, value, min, max, step = 0.01, suffix = '', onChange }: PropertySliderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-20 truncate">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
      />
      <span className="text-xs text-gray-500 font-mono w-14 text-right">
        {value.toFixed(2)}{suffix}
      </span>
    </div>
  );
}

interface EffectSectionProps {
  title: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: 'green' | 'yellow' | 'red';
  children: React.ReactNode;
}

function EffectSection({ title, icon, enabled, onToggle, badge, badgeColor = 'green', children }: EffectSectionProps) {
  return (
    <div className="rounded-xl bg-gray-800/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={cn("text-gray-400", enabled && "text-purple-400")}>{icon}</span>
          <span className="text-sm font-medium text-gray-200">{title}</span>
          {badge && (
            <span className={cn(
              "px-1.5 py-0.5 text-[10px] rounded",
              badgeColor === 'green' && "bg-green-500/20 text-green-400",
              badgeColor === 'yellow' && "bg-yellow-500/20 text-yellow-400",
              badgeColor === 'red' && "bg-red-500/20 text-red-400"
            )}>
              {badge}
            </span>
          )}
        </div>
        <div className={cn(
          "w-8 h-5 rounded-full transition-colors relative",
          enabled ? "bg-purple-600" : "bg-gray-700"
        )}>
          <div className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
            enabled ? "translate-x-3.5" : "translate-x-0.5"
          )} />
        </div>
      </button>
      {enabled && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}


interface EffectPresetGridProps {
  presets: Array<{
    id: string;
    label: string;
    icon?: string;
    active: boolean;
  }>;
  onSelect: (id: string) => void;
}

function EffectPresetGrid({ presets, onSelect }: EffectPresetGridProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {presets.map(preset => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.id)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-center",
            preset.active
              ? "bg-purple-600/30 border border-purple-500/50 text-purple-300"
              : "bg-gray-800/50 border border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-300"
          )}
        >
          {preset.icon && <span className="text-lg">{preset.icon}</span>}
          <span className="text-[10px] font-medium">{preset.label}</span>
        </button>
      ))}
    </div>
  );
}
