'use client';

/**
 * Alert Animation Studio V2
 *
 * Main modal component for creating 3D animated stream alerts.
 * Requires Pro or Studio subscription.
 * 
 * V2 Features:
 * - AI-powered animation suggestions based on asset analysis
 * - Stream event presets (New Sub, Raid, Donation, etc.)
 * - Real-time 3D preview with depth effects
 * - Background removal
 * - Transform controls (zoom, pan, resize)
 * - WebGL Particle System (10,000+ particles at 60fps)
 * - Timeline Editor with Keyframes (After Effects-style control)
 * - Audio Reactivity (FFT + Beat Detection)
 * - OBS Integration & Export (Self-contained HTML blob, WebM/GIF/APNG)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
  X, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Wand2, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Music,
  Clock,
  Layers,
} from 'lucide-react';
import {
  useCreateAnimationProject,
  useUpdateAnimationProject,
  useGenerateDepthMap,
  useAnimationProject,
  useAnimationSuggestions,
  useRegenerateAnimationSuggestions,
  useRemoveAnimationBackground,
  type AnimationConfig,
  type AnimationSuggestion,
} from '@aurastream/api-client';
import { cn } from '@/lib/utils';
import { PresetSelector } from './PresetSelector';
import { CanvasToolbar, DEFAULT_TRANSFORM, type TransformState, type ToolMode } from './CanvasToolbar';
import { DEFAULT_ANIMATION_CONFIG, type AlertAnimationStudioProps } from './types';
import type { AnimationCanvas as AnimationCanvasType } from './AnimationCanvas';

// V2 Engine imports
import { useAnimationStudioV2 } from './hooks/useAnimationStudioV2';
import {
  checkV2Support,
  V2_FEATURES,
  createTimeline,
  createTrack,
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
  WaveformDisplay,
  FrequencyBands,
  FrequencyBandsCompact,
  BeatMarkers,
  BeatCounter,
  ReactivityMapper,
  ExportPanel as ExportPanelV2,
  OBSInstructions,
  VideoExportUI,
  type ExportOptions,
} from './ui';

// Lazy load AnimationCanvas (includes Three.js ~600KB) - preloads when modal opens
const AnimationCanvas = dynamic<React.ComponentProps<typeof AnimationCanvasType>>(
  () => import('./AnimationCanvas').then(mod => ({ default: mod.AnimationCanvas })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex items-center gap-2 text-white text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          Loading 3D engine...
        </div>
      </div>
    ),
  }
);

// Panel collapse state type
type PanelSection = 'timeline' | 'audio' | 'export';

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
  
  // AI Suggestion state
  const [showSuggestionBanner, setShowSuggestionBanner] = useState(true);
  const [appliedSuggestion, setAppliedSuggestion] = useState(false);

  // Canvas transform state
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [hasTransparentBackground, setHasTransparentBackground] = useState(false);
  const [transparentSourceUrl, setTransparentSourceUrl] = useState<string | null>(null);

  // V2 Panel state
  const [expandedPanels, setExpandedPanels] = useState<Set<PanelSection>>(new Set(['timeline']));
  const [showV2Features, setShowV2Features] = useState(true);

  // Canvas ref for export
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);

  // V2 Support check
  const v2Support = useMemo(() => checkV2Support(), []);

  // V2 Integration Hook - provides unified state management for all V2 features
  const {
    state: v2State,
    actions: v2Actions,
    timeline: timelineHook,
    playback: playbackHook,
    contextManager,
  } = useAnimationStudioV2(512, 512, animationConfig.durationMs);

  // Audio reactivity mappings state
  const [audioMappings, setAudioMappings] = useState<AudioReactiveMapping[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Hooks
  const createProject = useCreateAnimationProject();
  const updateProject = useUpdateAnimationProject();
  const generateDepthMap = useGenerateDepthMap();
  const { data: project, refetch: refetchProject } = useAnimationProject(projectId || undefined);
  
  // AI Suggestions
  const { data: suggestionsData } = useAnimationSuggestions(
    sourceAsset?.id
  );
  const regenerateSuggestions = useRegenerateAnimationSuggestions();
  const removeBackground = useRemoveAnimationBackground();

  // Initialize project when modal opens
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

  // Initialize WebGL particle renderer when canvas is ready
  useEffect(() => {
    if (webglCanvasRef.current && V2_FEATURES.webglParticles && !v2State.isWebGLActive) {
      v2Actions.initWebGL(webglCanvasRef.current);
    }
  }, [webglCanvasRef.current, v2State.isWebGLActive]);

  // Auto-apply AI suggestion when available (first time only)
  useEffect(() => {
    if (
      suggestionsData?.suggestions &&
      !appliedSuggestion &&
      showSuggestionBanner
    ) {
      // Auto-apply the suggested config
      handleApplySuggestion(suggestionsData.suggestions);
      setAppliedSuggestion(true);
    }
  }, [suggestionsData, appliedSuggestion, showSuggestionBanner]);

  // Panel toggle handler
  const togglePanel = useCallback((panel: PanelSection) => {
    setExpandedPanels(prev => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        next.add(panel);
      }
      return next;
    });
  }, []);

  // Poll for depth map completion
  const pollDepthMapStatus = useCallback(
    async (id: string) => {
      const maxAttempts = 30;
      let attempts = 0;

      const poll = async () => {
        attempts++;
        const { data: updatedProject } = await refetchProject();

        if (updatedProject?.depthMapUrl) {
          setDepthMapUrl(updatedProject.depthMapUrl);
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
    [refetchProject]
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

  // Apply AI suggestion
  const handleApplySuggestion = useCallback(
    (suggestion: AnimationSuggestion) => {
      setAnimationConfig(suggestion.config);
      
      if (projectId) {
        updateProject.mutate({
          projectId,
          data: { animationConfig: suggestion.config },
        });
      }
    },
    [projectId, updateProject]
  );

  // Regenerate suggestions
  const handleRegenerateSuggestions = useCallback(() => {
    if (sourceAsset?.id) {
      regenerateSuggestions.mutate(sourceAsset.id);
    }
  }, [sourceAsset?.id, regenerateSuggestions]);

  // Timeline controls - now using V2 playback hook
  const handlePlayPause = useCallback(() => {
    if (playbackHook.isPlaying) {
      playbackHook.pause();
    } else {
      playbackHook.play();
    }
  }, [playbackHook]);

  const handleReset = useCallback(() => {
    playbackHook.stop();
  }, [playbackHook]);

  const handleSeek = useCallback((timeMs: number) => {
    playbackHook.seek(timeMs);
  }, [playbackHook]);

  // Audio file handler
  const handleAudioUpload = useCallback(async (file: File) => {
    setAudioFile(file);
    await v2Actions.loadAudio(file);
    v2Actions.startAudio();
  }, [v2Actions]);

  // Audio mapping change handler
  const handleMappingChange = useCallback((mappings: AudioReactiveMapping[]) => {
    setAudioMappings(mappings);
  }, []);

  // V2 Export handler
  const handleV2Export = useCallback(async (
    format: ExportFormat,
    options: ExportOptions
  ): Promise<ExportResult> => {
    if (format === 'obs') {
      const html = await v2Actions.exportToOBS(animationConfig);
      // Copy to clipboard
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

  // Timeline keyframe handlers
  const handleKeyframeAdd = useCallback((trackId: string, time: number, value: number) => {
    timelineHook.addKeyframe?.(trackId, time, value);
  }, [timelineHook]);

  const handleKeyframeMove = useCallback((trackId: string, keyframeId: string, newTime: number) => {
    timelineHook.moveKeyframe?.(trackId, keyframeId, newTime);
  }, [timelineHook]);

  const handleKeyframeSelect = useCallback((keyframeId: string, addToSelection?: boolean) => {
    timelineHook.selectKeyframe?.(keyframeId, addToSelection);
  }, [timelineHook]);

  const handleKeyframeDelete = useCallback((trackId: string, keyframeId: string) => {
    timelineHook.removeKeyframe?.(trackId, keyframeId);
  }, [timelineHook]);

  const handleTrackToggle = useCallback((trackId: string, property: 'visible' | 'muted' | 'solo' | 'locked') => {
    if (property === 'visible') {
      timelineHook.toggleTrackVisibility?.(trackId);
    } else if (property === 'muted') {
      timelineHook.toggleTrackMute?.(trackId);
    } else if (property === 'locked') {
      timelineHook.toggleTrackLock?.(trackId);
    }
  }, [timelineHook]);

  const handleTrackAdd = useCallback((property: AnimatableProperty) => {
    timelineHook.addTrack?.(property);
  }, [timelineHook]);

  const handleTrackRemove = useCallback((trackId: string) => {
    timelineHook.removeTrack?.(trackId);
  }, [timelineHook]);

  const handleZoomChange = useCallback((zoom: number) => {
    timelineHook.setZoom?.(zoom);
  }, [timelineHook]);

  // Background removal handler
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
          pollBackgroundRemovalStatus(projectId);
        }
      },
      onError: () => {
        setError('Failed to remove background. Please try again.');
        setIsRemovingBackground(false);
      },
    });
  }, [projectId, isRemovingBackground, hasTransparentBackground, removeBackground]);

  // Poll for background removal completion
  const pollBackgroundRemovalStatus = useCallback(
    async (id: string) => {
      const maxAttempts = 60; // 60 seconds max
      let attempts = 0;

      const poll = async () => {
        attempts++;
        const { data: updatedProject } = await refetchProject();

        if (updatedProject?.transparentSourceUrl) {
          setTransparentSourceUrl(updatedProject.transparentSourceUrl);
          setHasTransparentBackground(true);
          setIsRemovingBackground(false);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setError('Background removal timed out. Please try again.');
          setIsRemovingBackground(false);
        }
      };

      poll();
    },
    [refetchProject]
  );

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setProjectId(null);
    setAnimationConfig(DEFAULT_ANIMATION_CONFIG);
    setDepthMapUrl(null);
    setIsGeneratingDepth(false);
    setError(null);
    playbackHook.stop();
    setShowSuggestionBanner(true);
    setAppliedSuggestion(false);
    setTransform(DEFAULT_TRANSFORM);
    setToolMode('select');
    setIsRemovingBackground(false);
    setHasTransparentBackground(false);
    setTransparentSourceUrl(null);
    setAudioFile(null);
    setAudioMappings([]);
    v2Actions.stopAudio();
    v2Actions.disposeWebGL();
    onClose();
  }, [onClose, playbackHook, v2Actions]);

  if (!isOpen) return null;

  const suggestion = suggestionsData?.suggestions;

  // Get timeline UI state for TimelinePanel
  const timelineUIState: TimelineUIState = {
    currentTime: playbackHook.currentTime ?? 0,
    isPlaying: playbackHook.isPlaying ?? false,
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

        {/* AI Suggestion Banner */}
        {showSuggestionBanner && suggestion && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 px-6 py-3 border-b border-purple-800/30">
            <Wand2 className="h-5 w-5 text-purple-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-purple-200">
                <span className="font-medium">AI Suggestion:</span>{' '}
                <span className="text-purple-300">{suggestion.vibe}</span> vibe detected.{' '}
                {suggestion.reasoning}
              </p>
              {suggestion.recommendedEvent && (
                <p className="text-xs text-purple-400 mt-0.5">
                  Best for: {suggestion.recommendedEvent.replace(/_/g, ' ')} alerts
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleRegenerateSuggestions}
                disabled={regenerateSuggestions.isPending}
                className="flex items-center gap-1 px-2 py-1 text-xs text-purple-300 hover:text-white transition-colors"
                title="Get new suggestion"
              >
                <RefreshCw className={`h-3 w-3 ${regenerateSuggestions.isPending ? 'animate-spin' : ''}`} />
                Retry
              </button>
              <button
                onClick={() => setShowSuggestionBanner(false)}
                className="text-xs text-purple-400 hover:text-purple-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

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
          <div className="flex flex-1 flex-col min-h-0">
            <div className="relative flex-1 min-h-0 bg-[#1a1a2e]">
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
                sourceUrl={transparentSourceUrl || sourceAsset.url}
                depthMapUrl={depthMapUrl}
                config={animationConfig}
                canvasRef={canvasRef}
                isPlaying={playbackHook.isPlaying ?? false}
                currentTime={playbackHook.currentTime ?? 0}
                onTimeUpdate={(time) => playbackHook.seek(time)}
                transform={transform}
                toolMode={toolMode}
                onTransformChange={setTransform}
                timelineValues={timelineHook.currentValues}
                audioAnalysis={v2State.audioAnalysis}
                audioMappings={audioMappings}
              />

              {/* WebGL Particle Canvas (overlay) */}
              {V2_FEATURES.webglParticles && (
                <canvas
                  ref={webglCanvasRef}
                  className="absolute inset-0 pointer-events-none"
                  width={512}
                  height={512}
                  style={{ display: v2State.isWebGLActive ? 'block' : 'none' }}
                />
              )}

              {/* Canvas Toolbar */}
              <CanvasToolbar
                transform={transform}
                onTransformChange={setTransform}
                toolMode={toolMode}
                onToolModeChange={setToolMode}
                onRemoveBackground={handleRemoveBackground}
                isRemovingBackground={isRemovingBackground}
                hasTransparentBackground={hasTransparentBackground}
              />

              {/* V2 Feature Badge */}
              {v2Support.supported && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-purple-600/80 text-white text-xs px-2 py-1 rounded-full z-10">
                  <Layers className="w-3 h-3" />
                  V2 Engine
                </div>
              )}

              {/* Audio Active Indicator */}
              {v2State.isAudioActive && (
                <div className="absolute top-2 left-24 flex items-center gap-1 bg-green-600/80 text-white text-xs px-2 py-1 rounded-full z-10">
                  <Music className="w-3 h-3 animate-pulse" />
                  Audio Active
                </div>
              )}

              {/* Depth Map Loading Overlay */}
              {isGeneratingDepth && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  <p className="mt-3 text-sm text-gray-300">Generating depth map...</p>
                  <p className="text-xs text-gray-500">This enables 3D parallax effects</p>
                </div>
              )}
            </div>

            {/* V2 Timeline Panel (replaces simple TimelineControls) */}
            {showV2Features && v2Support.supported ? (
              <div className="border-t border-gray-800">
                {/* Timeline Section Header */}
                <button
                  onClick={() => togglePanel('timeline')}
                  className="w-full flex items-center justify-between px-4 py-2 bg-gray-900/80 hover:bg-gray-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">Timeline & Keyframes</span>
                  </div>
                  {expandedPanels.has('timeline') ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {expandedPanels.has('timeline') && (
                  <TimelinePanel
                    timeline={timelineHook.timeline ?? createTimeline('Animation', animationConfig.durationMs)}
                    uiState={timelineUIState}
                    onTimeChange={handleSeek}
                    onKeyframeAdd={handleKeyframeAdd}
                    onKeyframeMove={handleKeyframeMove}
                    onKeyframeSelect={handleKeyframeSelect}
                    onKeyframeDelete={handleKeyframeDelete}
                    onTrackToggle={handleTrackToggle}
                    onTrackAdd={handleTrackAdd}
                    onTrackRemove={handleTrackRemove}
                    onZoomChange={handleZoomChange}
                    onPlayPause={handlePlayPause}
                    className="h-48"
                  />
                )}

                {/* Audio Section Header */}
                <button
                  onClick={() => togglePanel('audio')}
                  className="w-full flex items-center justify-between px-4 py-2 bg-gray-900/80 hover:bg-gray-800/80 transition-colors border-t border-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">Audio Reactivity</span>
                    {v2State.isAudioActive && (
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded">
                        Active
                      </span>
                    )}
                  </div>
                  {expandedPanels.has('audio') ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {expandedPanels.has('audio') && (
                  <div className="p-4 bg-gray-900/50 space-y-4 max-h-64 overflow-y-auto">
                    {/* Audio Uploader */}
                    <AudioUploader
                      onAudioLoad={async (file, info) => {
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

                    {/* Audio Visualization */}
                    {v2State.isAudioActive && v2State.audioAnalysis && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <FrequencyBandsCompact
                            bands={v2State.audioAnalysis.bands}
                            className="h-20"
                          />
                          <div className="flex flex-col gap-2">
                            <BeatCounter
                              bpm={v2State.audioAnalysis.bpm}
                              beatPhase={v2State.audioAnalysis.beatPhase}
                              timeSinceLastBeat={v2State.audioAnalysis.timeSinceLastBeat}
                            />
                            <div className="text-xs text-gray-500">
                              Energy: {(v2State.audioAnalysis.energy * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>

                        {/* Reactivity Mapper */}
                        <ReactivityMapper
                          mappings={audioMappings}
                          availableTargets={[
                            { value: 'scaleUniform', label: 'Scale', category: 'transform' },
                            { value: 'opacity', label: 'Opacity', category: 'transform' },
                            { value: 'rotationZ', label: 'Rotation', category: 'transform' },
                            { value: 'positionX', label: 'Position X', category: 'transform' },
                            { value: 'positionY', label: 'Position Y', category: 'transform' },
                            { value: 'glowIntensity', label: 'Glow', category: 'effects' },
                          ]}
                          onMappingChange={(id, updates) => {
                            setAudioMappings(prev => prev.map(m => 
                              m.id === id ? { ...m, ...updates } : m
                            ));
                          }}
                          onMappingAdd={() => {
                            const newMapping: AudioReactiveMapping = {
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
                            };
                            setAudioMappings(prev => [...prev, newMapping]);
                          }}
                          onMappingRemove={(id) => {
                            setAudioMappings(prev => prev.filter(m => m.id !== id));
                          }}
                        />
                      </>
                    )}

                    {!v2State.isAudioActive && (
                      <p className="text-xs text-gray-500 text-center py-4">
                        Upload an audio file to enable audio-reactive animations
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Fallback: Simple timeline controls for non-V2 browsers */
              <div className="border-t border-gray-800 px-4 py-3 bg-gray-900/80">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePlayPause}
                    className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                  >
                    {playbackHook.isPlaying ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  >
                    ⏮
                  </button>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={animationConfig.durationMs}
                      value={playbackHook.currentTime ?? 0}
                      onChange={(e) => handleSeek(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-mono w-20 text-right">
                    {((playbackHook.currentTime ?? 0) / 1000).toFixed(2)}s / {(animationConfig.durationMs / 1000).toFixed(2)}s
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls Panel */}
          <div className="flex w-96 flex-col border-l border-gray-800">
            {/* Preset Selector */}
            <div className="flex-1 overflow-y-auto">
              <PresetSelector 
                config={animationConfig} 
                onChange={handleConfigChange}
                suggestion={suggestion}
                onApplySuggestion={handleApplySuggestion}
              />
            </div>

            {/* V2 Export Panel */}
            {projectId && showV2Features && v2Support.supported ? (
              <div className="border-t border-gray-800">
                <button
                  onClick={() => togglePanel('export')}
                  className="w-full flex items-center justify-between px-4 py-2 bg-gray-900/80 hover:bg-gray-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">Export</span>
                  </div>
                  {expandedPanels.has('export') ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {expandedPanels.has('export') && (
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
            ) : projectId && (
              /* Fallback export panel */
              <div className="border-t border-gray-800 p-4">
                <p className="text-xs text-gray-500 text-center">
                  Export features require V2 engine support
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
