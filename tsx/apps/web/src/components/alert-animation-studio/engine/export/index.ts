/**
 * Export Module - Main Entry Point
 *
 * Provides OBS integration, video encoding, GIF generation, and APNG export
 * for the Alert Animation Studio.
 *
 * @module export
 *
 * @example
 * ```typescript
 * // OBS HTML Blob Export
 * import { generateOBSHtmlBlob, AlertBlobConfig } from './export';
 *
 * const config: AlertBlobConfig = {
 *   alertId: 'new-follower',
 *   alertName: 'New Follower Alert',
 *   width: 512,
 *   height: 512,
 *   duration: 3000,
 *   loop: false,
 *   backgroundColor: 'transparent',
 *   relayUrl: 'http://localhost:3001/events',
 *   animationConfig: JSON.stringify({ type: 'pop_in' }),
 * };
 *
 * const html = generateOBSHtmlBlob(config);
 * ```
 *
 * @example
 * ```typescript
 * // WebM Video Export
 * import { WebMEncoder } from './export';
 *
 * const encoder = new WebMEncoder({
 *   canvas: myCanvas,
 *   width: 512,
 *   height: 512,
 *   frameRate: 60,
 *   bitrate: 5_000_000,
 *   codec: 'vp9',
 *   alpha: true,
 * });
 *
 * encoder.startRecording((progress) => console.log(progress));
 * // ... run animation ...
 * const result = await encoder.stopRecording();
 * ```
 *
 * @example
 * ```typescript
 * // GIF Export
 * import { GIFEncoder } from './export';
 *
 * const encoder = new GIFEncoder({
 *   canvas: myCanvas,
 *   width: 256,
 *   height: 256,
 *   frameRate: 20,
 *   quality: 10,
 * });
 *
 * // Capture frames
 * for (let i = 0; i < 60; i++) {
 *   renderFrame(i);
 *   encoder.addFrame();
 * }
 *
 * const result = await encoder.render();
 * ```
 *
 * @example
 * ```typescript
 * // APNG Export (with alpha channel)
 * import { APNGEncoder } from './export';
 *
 * const encoder = new APNGEncoder({
 *   canvas: myCanvas,
 *   width: 512,
 *   height: 512,
 *   frameRate: 30,
 * });
 *
 * const result = await encoder.export(3000, (time) => {
 *   renderAnimation(time);
 * });
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Format types
  ExportFormat,
  ExportQuality,
  // Configuration types
  AlertBlobConfig,
  WebMExportConfig,
  GIFExportConfig,
  APNGExportConfig,
  // Progress & result types
  ExportProgress,
  ExportResult,
  ExportProgressCallback,
  // SSE types
  TriggerEvent,
  SSEConnectionState,
  SSERelayConfig,
  // State types
  EncoderState,
} from './types';

// ============================================================================
// Constant Exports
// ============================================================================

export {
  DEFAULT_WEBM_CONFIG,
  DEFAULT_GIF_CONFIG,
  DEFAULT_APNG_CONFIG,
  DEFAULT_SSE_CONFIG,
} from './types';

// ============================================================================
// OBS Module Exports
// ============================================================================

export {
  generateOBSHtmlBlob,
  generateOBSBlobUrl,
  downloadOBSHtmlBlob,
  getMinifiedEngineCode,
  getEngineCodeWithSSE,
} from './obs';

// ============================================================================
// Video Module Exports
// ============================================================================

export { WebMEncoder } from './video';

// ============================================================================
// GIF Module Exports
// ============================================================================

export { GIFEncoder } from './gif';

// ============================================================================
// APNG Module Exports
// ============================================================================

export { APNGEncoder } from './apng';
