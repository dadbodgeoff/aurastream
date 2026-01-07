/**
 * Animation Studio V2 Integration Hook
 *
 * Unified hook that integrates all V2 engine modules:
 * - WebGL Particle System
 * - Timeline Editor
 * - Audio Reactivity
 * - Export System
 *
 * @module hooks/useAnimationStudioV2
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { AnimationConfig } from '@aurastream/api-client';

import {
  // Context
  AnimationContextManager,
  checkV2Support,
  V2_FEATURES,

  // WebGL
  WebGLParticleRenderer,
  type ParticleUniforms,

  // Timeline
  useTimeline,
  usePlayback,
  type UseTimelineOptions,
  type UsePlaybackOptions,

  // Audio
  AudioAnalyzer,
  BeatDetector,
  type AudioAnalysis,

  // Export
  generateOBSHtmlBlob,
  WebMEncoder,
  GIFEncoder,
  APNGEncoder,
  type ExportFormat,
  type ExportProgress,
  type ExportResult,
  type AlertBlobConfig,
} from '../engine';

// ============================================================================
// Types
// ============================================================================

export interface AnimationStudioV2State {
  /** Whether V2 features are supported */
  isV2Supported: boolean;
  /** Missing features (if any) */
  missingFeatures: string[];
  /** Warning messages */
  warnings: string[];

  /** WebGL particle renderer instance */
  particleRenderer: WebGLParticleRenderer | null;
  /** Whether WebGL is active */
  isWebGLActive: boolean;

  /** Audio analyzer instance */
  audioAnalyzer: AudioAnalyzer | null;
  /** Beat detector instance */
  beatDetector: BeatDetector | null;
  /** Current audio analysis */
  audioAnalysis: AudioAnalysis | null;
  /** Whether audio is active */
  isAudioActive: boolean;

  /** Current export progress */
  exportProgress: ExportProgress | null;
  /** Whether export is in progress */
  isExporting: boolean;
}

export interface AnimationStudioV2Actions {
  /** Initialize WebGL particle renderer */
  initWebGL: (canvas: HTMLCanvasElement) => void;
  /** Dispose WebGL resources */
  disposeWebGL: () => void;

  /** Load audio file for reactivity */
  loadAudio: (file: File | string) => Promise<void>;
  /** Start audio analysis */
  startAudio: () => void;
  /** Stop audio analysis */
  stopAudio: () => void;

  /** Export to OBS HTML blob */
  exportToOBS: (config: AnimationConfig) => Promise<string>;
  /** Export to video format */
  exportToVideo: (
    format: ExportFormat,
    canvas: HTMLCanvasElement,
    durationMs: number
  ) => Promise<ExportResult>;
  /** Cancel ongoing export */
  cancelExport: () => void;

  /** Update animation frame */
  updateFrame: (deltaTime: number) => void;
}

export interface UseAnimationStudioV2Return {
  state: AnimationStudioV2State;
  actions: AnimationStudioV2Actions;
  timeline: ReturnType<typeof useTimeline>;
  playback: ReturnType<typeof usePlayback>;
  contextManager: AnimationContextManager | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAnimationStudioV2(
  canvasWidth: number = 512,
  canvasHeight: number = 512,
  durationMs: number = 3000
): UseAnimationStudioV2Return {
  // V2 support check
  const v2Support = useMemo(() => checkV2Support(), []);

  // Context manager
  const contextManagerRef = useRef<AnimationContextManager | null>(null);

  // WebGL state
  const [particleRenderer, setParticleRenderer] = useState<WebGLParticleRenderer | null>(null);
  const [isWebGLActive, setIsWebGLActive] = useState(false);

  // Audio state
  const [audioAnalyzer, setAudioAnalyzer] = useState<AudioAnalyzer | null>(null);
  const [beatDetector, setBeatDetector] = useState<BeatDetector | null>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Export state
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportCancelRef = useRef<boolean>(false);

  // Timeline hooks
  const timelineOptions: UseTimelineOptions = useMemo(() => ({}), []);

  const playbackOptions: UsePlaybackOptions = useMemo(() => ({
    duration: durationMs,
  }), [durationMs]);

  const timeline = useTimeline(timelineOptions);
  const playback = usePlayback(playbackOptions);

  // Initialize context manager
  useEffect(() => {
    contextManagerRef.current = new AnimationContextManager(
      canvasWidth,
      canvasHeight,
      durationMs
    );

    return () => {
      contextManagerRef.current = null;
    };
  }, [canvasWidth, canvasHeight, durationMs]);

  // ============================================================================
  // WebGL Actions
  // ============================================================================

  const initWebGL = useCallback((canvas: HTMLCanvasElement) => {
    if (!V2_FEATURES.webglParticles) {
      console.warn('WebGL2 not supported, falling back to CSS particles');
      return;
    }

    try {
      const renderer = new WebGLParticleRenderer(canvas, {
        maxParticles: 10000,
        blendMode: 'additive',
      });
      setParticleRenderer(renderer);
      setIsWebGLActive(true);
    } catch (error) {
      console.error('Failed to initialize WebGL particle renderer:', error);
      setIsWebGLActive(false);
    }
  }, []);

  const disposeWebGL = useCallback(() => {
    if (particleRenderer) {
      particleRenderer.dispose();
      setParticleRenderer(null);
      setIsWebGLActive(false);
    }
  }, [particleRenderer]);

  // ============================================================================
  // Audio Actions
  // ============================================================================

  const loadAudio = useCallback(async (source: File | string) => {
    if (!V2_FEATURES.audioReactivity) {
      console.warn('Web Audio API not supported');
      return;
    }

    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      // Load audio buffer
      let arrayBuffer: ArrayBuffer;
      if (typeof source === 'string') {
        const response = await fetch(source);
        arrayBuffer = await response.arrayBuffer();
      } else {
        arrayBuffer = await source.arrayBuffer();
      }

      await ctx.decodeAudioData(arrayBuffer);

      // Create analyzer
      const analyzer = new AudioAnalyzer();
      setAudioAnalyzer(analyzer);

      // Create beat detector with sample rate and FFT size
      const detector = new BeatDetector(ctx.sampleRate, 2048, 0.7);
      setBeatDetector(detector);

    } catch (error) {
      console.error('Failed to load audio:', error);
    }
  }, []);

  const startAudio = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsAudioActive(true);
  }, []);

  const stopAudio = useCallback(() => {
    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current.suspend();
    }
    setIsAudioActive(false);
  }, []);

  // ============================================================================
  // Export Actions
  // ============================================================================

  const exportToOBS = useCallback(async (config: AnimationConfig): Promise<string> => {
    setIsExporting(true);
    setExportProgress({
      phase: 'preparing',
      percent: 0,
      currentFrame: 0,
      totalFrames: 0,
      message: 'Preparing OBS export...',
    });

    try {
      const blobConfig: AlertBlobConfig = {
        alertId: `alert-${Date.now()}`,
        alertName: 'Animation Export',
        width: canvasWidth,
        height: canvasHeight,
        duration: config.durationMs,
        loop: true,
        backgroundColor: 'transparent',
        animationConfig: JSON.stringify(config),
      };

      const html = generateOBSHtmlBlob(blobConfig);

      setExportProgress({
        phase: 'complete',
        percent: 100,
        currentFrame: 0,
        totalFrames: 0,
        message: 'Export complete!',
      });
      return html;
    } catch (error) {
      console.error('OBS export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  }, [canvasWidth, canvasHeight]);

  const exportToVideo = useCallback(async (
    format: ExportFormat,
    canvas: HTMLCanvasElement,
    durationMs: number
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setExportProgress({
      phase: 'encoding',
      percent: 0,
      currentFrame: 0,
      totalFrames: Math.ceil(durationMs / 33),
      message: 'Starting export...',
    });
    exportCancelRef.current = false;

    try {
      let result: ExportResult;

      switch (format) {
        case 'webm': {
          const encoder = new WebMEncoder({
            canvas,
            width: canvasWidth,
            height: canvasHeight,
            frameRate: 30,
            bitrate: 5_000_000,
            codec: 'vp9',
            alpha: true,
          });
          encoder.startRecording((progress) => {
            setExportProgress({
              phase: 'encoding',
              percent: progress.percent,
              currentFrame: progress.currentFrame,
              totalFrames: progress.totalFrames,
              message: progress.message,
            });
          });
          // Wait for duration
          await new Promise(resolve => setTimeout(resolve, durationMs));
          result = await encoder.stopRecording();
          break;
        }
        case 'gif': {
          const encoder = new GIFEncoder({
            canvas,
            width: canvasWidth,
            height: canvasHeight,
            frameRate: 20,
            quality: 10,
            workers: 4,
            dithering: true,
            repeat: 0,
          });
          // Capture frames
          const frameCount = Math.ceil(durationMs / 50); // 20fps
          for (let i = 0; i < frameCount && !exportCancelRef.current; i++) {
            encoder.addFrame();
            setExportProgress({
              phase: 'capturing',
              percent: (i / frameCount) * 100,
              currentFrame: i,
              totalFrames: frameCount,
              message: `Capturing frame ${i + 1} of ${frameCount}`,
            });
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          result = await encoder.render();
          break;
        }
        case 'apng': {
          const encoder = new APNGEncoder({
            canvas,
            width: canvasWidth,
            height: canvasHeight,
            frameRate: 30,
            compressionLevel: 6,
            colorType: 'rgba',
            loops: 0,
          });
          // Capture frames manually
          const frameCount = Math.ceil(durationMs / 33); // 30fps
          for (let i = 0; i < frameCount && !exportCancelRef.current; i++) {
            encoder.addFrame();
            setExportProgress({
              phase: 'capturing',
              percent: (i / frameCount) * 100,
              currentFrame: i,
              totalFrames: frameCount,
              message: `Capturing frame ${i + 1} of ${frameCount}`,
            });
            await new Promise(resolve => setTimeout(resolve, 33));
          }
          result = await encoder.encode();
          break;
        }
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        format,
        fileSize: 0,
        exportDuration: 0,
        dimensions: { width: canvasWidth, height: canvasHeight },
        frameCount: 0,
        error: error instanceof Error ? error.message : 'Export failed',
        suggestedFilename: `animation.${format}`,
        mimeType: format === 'webm' ? 'video/webm' : format === 'gif' ? 'image/gif' : 'image/apng',
      };
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      exportCancelRef.current = false;
    }
  }, [canvasWidth, canvasHeight]);

  const cancelExport = useCallback(() => {
    exportCancelRef.current = true;
    setIsExporting(false);
    setExportProgress(null);
  }, []);

  // ============================================================================
  // Frame Update
  // ============================================================================

  const updateFrame = useCallback((deltaTime: number) => {
    const manager = contextManagerRef.current;
    if (!manager) return;

    // Update context
    manager.update(deltaTime);

    // Update audio analysis
    if (isAudioActive && audioAnalyzer) {
      const analysis = audioAnalyzer.analyze();
      setAudioAnalysis(analysis);

      // Beat detector processes FFT data
      if (beatDetector && analysis?.fft) {
        beatDetector.detect(analysis.fft);
      }
    }

    // Update particle renderer
    if (isWebGLActive && particleRenderer) {
      const context = manager.getContext();
      const uniforms: ParticleUniforms = {
        uTime: context.timeMs / 1000,
        uDeltaTime: deltaTime / 1000,
        uResolution: [canvasWidth, canvasHeight],
        uGravity: 0.5,
        uWind: [0, 0],
        uTurbulence: 0.3,
        uGlobalOpacity: 1,
      };

      particleRenderer.render(uniforms);
    }
  }, [
    isAudioActive,
    audioAnalyzer,
    beatDetector,
    isWebGLActive,
    particleRenderer,
    canvasWidth,
    canvasHeight,
  ]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      disposeWebGL();
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [disposeWebGL, stopAudio]);

  // ============================================================================
  // Return
  // ============================================================================

  const state: AnimationStudioV2State = {
    isV2Supported: v2Support.supported,
    missingFeatures: v2Support.missing,
    warnings: v2Support.warnings,
    particleRenderer,
    isWebGLActive,
    audioAnalyzer,
    beatDetector,
    audioAnalysis,
    isAudioActive,
    exportProgress,
    isExporting,
  };

  const actions: AnimationStudioV2Actions = {
    initWebGL,
    disposeWebGL,
    loadAudio,
    startAudio,
    stopAudio,
    exportToOBS,
    exportToVideo,
    cancelExport,
    updateFrame,
  };

  return {
    state,
    actions,
    timeline,
    playback,
    contextManager: contextManagerRef.current,
  };
}

export default useAnimationStudioV2;
