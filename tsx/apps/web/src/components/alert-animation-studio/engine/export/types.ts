/**
 * Export Module - Type Definitions
 *
 * Types for OBS integration, video encoding, GIF generation, and APNG export.
 * Supports multiple export formats with progress tracking.
 */

import type { AnimationTransform } from '../animations/core/types';

// ============================================================================
// Export Format Types
// ============================================================================

/**
 * Supported export formats.
 */
export type ExportFormat = 'obs' | 'webm' | 'gif' | 'apng';

/**
 * Export quality presets.
 */
export type ExportQuality = 'low' | 'medium' | 'high' | 'ultra';

// ============================================================================
// OBS HTML Blob Configuration
// ============================================================================

/**
 * Configuration for generating self-contained OBS HTML blobs.
 */
export interface AlertBlobConfig {
  /** Unique identifier for the alert */
  alertId: string;
  /** Display name for the alert */
  alertName: string;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Animation duration in milliseconds */
  duration: number;
  /** Whether animation should loop */
  loop: boolean;
  /** Background color (CSS color string, 'transparent' for chroma key) */
  backgroundColor: string;
  /** SSE relay server URL for trigger events */
  relayUrl?: string;
  /** Initial transform state */
  initialTransform?: AnimationTransform;
  /** Serialized animation configuration JSON */
  animationConfig: string;
  /** Serialized timeline data JSON */
  timelineData?: string;
  /** Custom CSS to inject */
  customCss?: string;
  /** Enable debug mode with status indicator */
  debug?: boolean;
}

// ============================================================================
// WebM Export Configuration
// ============================================================================

/**
 * Configuration for WebM video export.
 */
export interface WebMExportConfig {
  /** Canvas element to capture */
  canvas: HTMLCanvasElement;
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Frame rate (fps) */
  frameRate: number;
  /** Video bitrate in bits per second */
  bitrate: number;
  /** Video codec ('vp8' | 'vp9') */
  codec: 'vp8' | 'vp9';
  /** Enable alpha channel (VP9 only) */
  alpha?: boolean;
  /** Duration in milliseconds (optional, for fixed-length exports) */
  duration?: number;
}

/**
 * Default WebM export configuration.
 */
export const DEFAULT_WEBM_CONFIG: Omit<WebMExportConfig, 'canvas'> = {
  width: 512,
  height: 512,
  frameRate: 60,
  bitrate: 5_000_000,
  codec: 'vp9',
  alpha: true,
};

// ============================================================================
// GIF Export Configuration
// ============================================================================

/**
 * Configuration for GIF export.
 */
export interface GIFExportConfig {
  /** Canvas element to capture */
  canvas: HTMLCanvasElement;
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Frame rate (fps) - GIF typically uses 10-30 */
  frameRate: number;
  /** Quality (1-30, lower is better quality but slower) */
  quality: number;
  /** Number of workers for parallel processing */
  workers: number;
  /** Enable dithering for better color reproduction */
  dithering: boolean;
  /** Dithering algorithm */
  ditheringAlgorithm?: 'FloydSteinberg' | 'FalseFloydSteinberg' | 'Stucki' | 'Atkinson';
  /** Background color for transparency (null for transparent) */
  background?: string | null;
  /** Whether to loop the GIF (0 = infinite, -1 = no loop, n = loop n times) */
  repeat: number;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Default GIF export configuration.
 */
export const DEFAULT_GIF_CONFIG: Omit<GIFExportConfig, 'canvas'> = {
  width: 512,
  height: 512,
  frameRate: 20,
  quality: 10,
  workers: 4,
  dithering: true,
  ditheringAlgorithm: 'FloydSteinberg',
  background: null,
  repeat: 0,
};

// ============================================================================
// APNG Export Configuration
// ============================================================================

/**
 * Configuration for APNG (Animated PNG) export.
 */
export interface APNGExportConfig {
  /** Canvas element to capture */
  canvas: HTMLCanvasElement;
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Frame rate (fps) */
  frameRate: number;
  /** Compression level (0-9, higher = smaller file but slower) */
  compressionLevel: number;
  /** Color type for PNG encoding */
  colorType: 'rgba' | 'rgb';
  /** Number of loop iterations (0 = infinite) */
  loops: number;
  /** Duration in milliseconds */
  duration?: number;
  /** Delay between frames in milliseconds (overrides frameRate if set) */
  frameDelay?: number;
}

/**
 * Default APNG export configuration.
 */
export const DEFAULT_APNG_CONFIG: Omit<APNGExportConfig, 'canvas'> = {
  width: 512,
  height: 512,
  frameRate: 30,
  compressionLevel: 6,
  colorType: 'rgba',
  loops: 0,
};

// ============================================================================
// Export Progress & Result Types
// ============================================================================

/**
 * Export progress information.
 */
export interface ExportProgress {
  /** Current phase of export */
  phase: 'preparing' | 'capturing' | 'encoding' | 'finalizing' | 'complete' | 'error';
  /** Progress percentage (0-100) */
  percent: number;
  /** Current frame being processed */
  currentFrame: number;
  /** Total frames to process */
  totalFrames: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  /** Current operation description */
  message: string;
}

/**
 * Export result containing the final output.
 */
export interface ExportResult {
  /** Whether export was successful */
  success: boolean;
  /** Export format used */
  format: ExportFormat;
  /** Output blob (for binary formats) */
  blob?: Blob;
  /** Output string (for HTML blob) */
  html?: string;
  /** File size in bytes */
  fileSize: number;
  /** Export duration in milliseconds */
  exportDuration: number;
  /** Output dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Frame count (for animated formats) */
  frameCount?: number;
  /** Error message if failed */
  error?: string;
  /** Suggested filename */
  suggestedFilename: string;
  /** MIME type */
  mimeType: string;
}

// ============================================================================
// SSE Relay Event Types
// ============================================================================

/**
 * Trigger event received from SSE relay.
 */
export interface TriggerEvent {
  /** Event type identifier */
  type: 'trigger' | 'test' | 'config_update' | 'ping';
  /** Alert ID to trigger */
  alertId: string;
  /** Timestamp of the event */
  timestamp: number;
  /** Optional payload data */
  payload?: Record<string, unknown>;
}

/**
 * SSE connection state.
 */
export type SSEConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * SSE relay configuration.
 */
export interface SSERelayConfig {
  /** Relay server URL */
  url: string;
  /** Reconnect delay in milliseconds */
  reconnectDelay: number;
  /** Maximum reconnect attempts (0 = infinite) */
  maxReconnectAttempts: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number;
}

/**
 * Default SSE relay configuration.
 */
export const DEFAULT_SSE_CONFIG: SSERelayConfig = {
  url: 'http://localhost:3001/events',
  reconnectDelay: 3000,
  maxReconnectAttempts: 0,
  heartbeatInterval: 30000,
};

// ============================================================================
// Progress Callback Type
// ============================================================================

/**
 * Callback function for export progress updates.
 */
export type ExportProgressCallback = (progress: ExportProgress) => void;

// ============================================================================
// Encoder State Types
// ============================================================================

/**
 * Base encoder state.
 */
export interface EncoderState {
  /** Whether encoder is currently active */
  isRecording: boolean;
  /** Whether encoder is paused */
  isPaused: boolean;
  /** Start timestamp */
  startTime: number | null;
  /** Frames captured so far */
  framesCaptured: number;
}
