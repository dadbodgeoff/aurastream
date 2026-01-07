/**
 * WebM Video Encoder
 *
 * Encodes canvas animations to WebM video format using MediaRecorder API.
 * Supports VP8/VP9 codecs with optional alpha channel.
 */

import type {
  WebMExportConfig,
  ExportProgress,
  ExportResult,
  ExportProgressCallback,
  EncoderState,
} from '../types';
import { DEFAULT_WEBM_CONFIG } from '../types';

/**
 * WebM video encoder using MediaRecorder API.
 *
 * @example
 * ```typescript
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
 * encoder.startRecording((progress) => {
 *   console.log(`Recording: ${progress.percent}%`);
 * });
 *
 * // After animation completes...
 * const result = await encoder.stopRecording();
 * ```
 */
export class WebMEncoder {
  private config: WebMExportConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private state: EncoderState = {
    isRecording: false,
    isPaused: false,
    startTime: null,
    framesCaptured: 0,
  };
  private progressCallback: ExportProgressCallback | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Creates a new WebM encoder instance.
   *
   * @param config - WebM export configuration
   */
  constructor(config: WebMExportConfig) {
    this.config = { ...DEFAULT_WEBM_CONFIG, ...config };
  }

  /**
   * Checks if WebM recording is supported in the current browser.
   *
   * @returns Whether WebM recording is supported
   */
  static isSupported(): boolean {
    if (typeof MediaRecorder === 'undefined') {
      return false;
    }

    // Check for VP9 support first, then VP8
    const vp9Type = 'video/webm;codecs=vp9';
    const vp8Type = 'video/webm;codecs=vp8';

    return (
      MediaRecorder.isTypeSupported(vp9Type) ||
      MediaRecorder.isTypeSupported(vp8Type)
    );
  }

  /**
   * Gets the best supported MIME type for the configured codec.
   *
   * @returns MIME type string or null if not supported
   */
  private getMimeType(): string | null {
    const { codec, alpha } = this.config;

    // VP9 with alpha channel
    if (codec === 'vp9' && alpha) {
      const type = 'video/webm;codecs=vp9,opus';
      if (MediaRecorder.isTypeSupported(type)) return type;
    }

    // VP9 without alpha
    if (codec === 'vp9') {
      const type = 'video/webm;codecs=vp9';
      if (MediaRecorder.isTypeSupported(type)) return type;
    }

    // VP8 fallback
    const vp8Type = 'video/webm;codecs=vp8';
    if (MediaRecorder.isTypeSupported(vp8Type)) return vp8Type;

    // Generic WebM fallback
    const genericType = 'video/webm';
    if (MediaRecorder.isTypeSupported(genericType)) return genericType;

    return null;
  }

  /**
   * Starts recording the canvas.
   *
   * @param onProgress - Optional callback for progress updates
   * @throws Error if recording is not supported or already in progress
   */
  startRecording(onProgress?: ExportProgressCallback): void {
    if (this.state.isRecording) {
      throw new Error('Recording is already in progress');
    }

    const mimeType = this.getMimeType();
    if (!mimeType) {
      throw new Error('WebM recording is not supported in this browser');
    }

    // Capture stream from canvas
    this.stream = this.config.canvas.captureStream(this.config.frameRate);

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      videoBitsPerSecond: this.config.bitrate,
    });

    // Reset state
    this.recordedChunks = [];
    this.state = {
      isRecording: true,
      isPaused: false,
      startTime: performance.now(),
      framesCaptured: 0,
    };
    this.progressCallback = onProgress || null;

    // Handle data available
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Start recording
    this.mediaRecorder.start(100); // Collect data every 100ms

    // Start progress updates
    if (this.progressCallback) {
      this.progressInterval = setInterval(() => {
        this.updateProgress();
      }, 100);
    }

    console.log('[WebMEncoder] Recording started', { mimeType });
  }

  /**
   * Pauses the recording.
   */
  pause(): void {
    if (!this.state.isRecording || this.state.isPaused) return;

    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
      this.state.isPaused = true;
      console.log('[WebMEncoder] Recording paused');
    }
  }

  /**
   * Resumes a paused recording.
   */
  resume(): void {
    if (!this.state.isRecording || !this.state.isPaused) return;

    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
      this.state.isPaused = false;
      console.log('[WebMEncoder] Recording resumed');
    }
  }

  /**
   * Stops recording and returns the result.
   *
   * @returns Promise resolving to the export result
   */
  async stopRecording(): Promise<ExportResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.state.isRecording) {
        reject(new Error('No recording in progress'));
        return;
      }

      const startTime = this.state.startTime || performance.now();

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        // Clear progress interval
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
        }

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        // Create final blob
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const exportDuration = performance.now() - startTime;

        // Update final progress
        if (this.progressCallback) {
          this.progressCallback({
            phase: 'complete',
            percent: 100,
            currentFrame: this.state.framesCaptured,
            totalFrames: this.state.framesCaptured,
            message: 'Export complete',
          });
        }

        // Reset state
        this.state = {
          isRecording: false,
          isPaused: false,
          startTime: null,
          framesCaptured: 0,
        };

        const result: ExportResult = {
          success: true,
          format: 'webm',
          blob,
          fileSize: blob.size,
          exportDuration,
          dimensions: {
            width: this.config.width,
            height: this.config.height,
          },
          suggestedFilename: `animation-${Date.now()}.webm`,
          mimeType: 'video/webm',
        };

        console.log('[WebMEncoder] Recording complete', {
          size: blob.size,
          duration: exportDuration,
        });

        resolve(result);
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('[WebMEncoder] Recording error', event);
        reject(new Error('Recording failed'));
      };

      // Stop recording
      this.mediaRecorder.stop();
      this.state.isRecording = false;
    });
  }

  /**
   * Cancels the current recording.
   */
  cancel(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.recordedChunks = [];
    this.state = {
      isRecording: false,
      isPaused: false,
      startTime: null,
      framesCaptured: 0,
    };

    console.log('[WebMEncoder] Recording cancelled');
  }

  /**
   * Gets the current recording state.
   *
   * @returns Current encoder state
   */
  getState(): Readonly<EncoderState> {
    return { ...this.state };
  }

  /**
   * Updates progress callback with current status.
   */
  private updateProgress(): void {
    if (!this.progressCallback || !this.state.startTime) return;

    const elapsed = performance.now() - this.state.startTime;
    const duration = this.config.duration || 0;

    // Estimate frames based on elapsed time and frame rate
    this.state.framesCaptured = Math.floor(
      (elapsed / 1000) * this.config.frameRate
    );

    let percent = 0;
    let estimatedTimeRemaining: number | undefined;

    if (duration > 0) {
      percent = Math.min((elapsed / duration) * 100, 100);
      estimatedTimeRemaining = Math.max(0, duration - elapsed);
    }

    const progress: ExportProgress = {
      phase: 'capturing',
      percent,
      currentFrame: this.state.framesCaptured,
      totalFrames: duration > 0
        ? Math.ceil((duration / 1000) * this.config.frameRate)
        : 0,
      estimatedTimeRemaining,
      message: `Recording... ${this.state.framesCaptured} frames`,
    };

    this.progressCallback(progress);
  }

  /**
   * Exports a fixed-duration recording.
   *
   * @param durationMs - Duration to record in milliseconds
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to the export result
   */
  async export(
    durationMs: number,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    this.config.duration = durationMs;
    this.startRecording(onProgress);

    // Wait for duration
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    return this.stopRecording();
  }
}
