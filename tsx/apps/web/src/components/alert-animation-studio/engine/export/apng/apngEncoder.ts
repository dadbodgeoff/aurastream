/**
 * APNG Encoder
 *
 * Encodes canvas animations to APNG (Animated PNG) format.
 * Supports full alpha channel transparency.
 * Uses upng-js library for encoding (dynamically imported).
 */

import type {
  APNGExportConfig,
  ExportProgress,
  ExportResult,
  ExportProgressCallback,
  EncoderState,
} from '../types';
import { DEFAULT_APNG_CONFIG } from '../types';

/**
 * Frame data for APNG encoding.
 */
interface APNGFrame {
  /** Raw RGBA pixel data */
  data: Uint8Array;
  /** Frame delay in milliseconds */
  delay: number;
}

/**
 * APNG encoder for canvas animations.
 * Provides full alpha channel support unlike GIF.
 *
 * @example
 * ```typescript
 * const encoder = new APNGEncoder({
 *   canvas: myCanvas,
 *   width: 512,
 *   height: 512,
 *   frameRate: 30,
 *   compressionLevel: 6,
 * });
 *
 * // Capture frames during animation
 * encoder.addFrame();
 *
 * // When done, encode the APNG
 * const result = await encoder.encode((progress) => {
 *   console.log(`Encoding: ${progress.percent}%`);
 * });
 * ```
 */
export class APNGEncoder {
  private config: APNGExportConfig;
  private frames: APNGFrame[] = [];
  private state: EncoderState = {
    isRecording: false,
    isPaused: false,
    startTime: null,
    framesCaptured: 0,
  };
  private ctx: CanvasRenderingContext2D | null = null;

  /**
   * Creates a new APNG encoder instance.
   *
   * @param config - APNG export configuration
   */
  constructor(config: APNGExportConfig) {
    this.config = { ...DEFAULT_APNG_CONFIG, ...config };
    this.ctx = this.config.canvas.getContext('2d');
  }

  /**
   * Checks if APNG encoding is supported.
   *
   * @returns Whether APNG encoding is supported
   */
  static isSupported(): boolean {
    if (typeof document === 'undefined') return false;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return ctx !== null;
  }

  /**
   * Adds a frame from the current canvas state.
   *
   * @param delay - Optional custom delay for this frame in milliseconds
   */
  addFrame(delay?: number): void {
    if (!this.ctx) {
      console.warn('[APNGEncoder] No canvas context available');
      return;
    }

    const { width, height, frameRate, frameDelay } = this.config;
    const actualDelay = delay ?? frameDelay ?? Math.round(1000 / frameRate);

    // Get image data from canvas
    const imageData = this.ctx.getImageData(0, 0, width, height);

    // Convert to Uint8Array
    const data = new Uint8Array(imageData.data.buffer);

    this.frames.push({
      data,
      delay: actualDelay,
    });

    this.state.framesCaptured++;
  }

  /**
   * Clears all captured frames.
   */
  clear(): void {
    this.frames = [];
    this.state = {
      isRecording: false,
      isPaused: false,
      startTime: null,
      framesCaptured: 0,
    };
  }

  /**
   * Gets the number of captured frames.
   *
   * @returns Frame count
   */
  getFrameCount(): number {
    return this.frames.length;
  }

  /**
   * Gets the current encoder state.
   *
   * @returns Current encoder state
   */
  getState(): Readonly<EncoderState> {
    return { ...this.state };
  }

  /**
   * Encodes the captured frames to an APNG.
   *
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to the export result
   */
  async encode(onProgress?: ExportProgressCallback): Promise<ExportResult> {
    if (this.frames.length === 0) {
      return {
        success: false,
        format: 'apng',
        fileSize: 0,
        exportDuration: 0,
        dimensions: {
          width: this.config.width,
          height: this.config.height,
        },
        error: 'No frames to encode',
        suggestedFilename: 'animation.png',
        mimeType: 'image/png',
      };
    }

    const startTime = performance.now();

    // Report initial progress
    if (onProgress) {
      onProgress({
        phase: 'preparing',
        percent: 0,
        currentFrame: 0,
        totalFrames: this.frames.length,
        message: 'Loading APNG encoder...',
      });
    }

    try {
      // Dynamically import upng-js
      const UPNG = await this.loadUpng();

      const { width, height, compressionLevel, loops } = this.config;

      // Prepare frame data arrays
      const frameDataArrays: ArrayBuffer[] = [];
      const delays: number[] = [];

      // Process frames
      for (let i = 0; i < this.frames.length; i++) {
        const frame = this.frames[i];
        // Create a copy of the buffer to ensure it's a proper ArrayBuffer
        const buffer = new ArrayBuffer(frame.data.byteLength);
        new Uint8Array(buffer).set(frame.data);
        frameDataArrays.push(buffer);
        delays.push(frame.delay);

        if (onProgress) {
          onProgress({
            phase: 'encoding',
            percent: Math.round((i / this.frames.length) * 50),
            currentFrame: i + 1,
            totalFrames: this.frames.length,
            message: `Processing frame ${i + 1}/${this.frames.length}`,
          });
        }
      }

      // Report encoding phase
      if (onProgress) {
        onProgress({
          phase: 'encoding',
          percent: 50,
          currentFrame: this.frames.length,
          totalFrames: this.frames.length,
          message: 'Encoding APNG...',
        });
      }

      // Encode APNG
      // UPNG.encode expects: (imgs, w, h, cnum, dels, loops)
      // cnum: 0 = auto, 256 = indexed color
      const pngData = UPNG.encode(
        frameDataArrays,
        width,
        height,
        0, // Auto color depth
        delays,
        loops
      );

      // Apply compression if needed
      let finalData = pngData;
      if (compressionLevel > 0) {
        // UPNG.encode already handles compression internally
        // Additional compression would require re-encoding
      }

      // Report finalizing
      if (onProgress) {
        onProgress({
          phase: 'finalizing',
          percent: 90,
          currentFrame: this.frames.length,
          totalFrames: this.frames.length,
          message: 'Finalizing...',
        });
      }

      // Create blob
      const blob = new Blob([finalData], { type: 'image/png' });
      const exportDuration = performance.now() - startTime;

      // Report completion
      if (onProgress) {
        onProgress({
          phase: 'complete',
          percent: 100,
          currentFrame: this.frames.length,
          totalFrames: this.frames.length,
          message: 'Export complete',
        });
      }

      return {
        success: true,
        format: 'apng',
        blob,
        fileSize: blob.size,
        exportDuration,
        dimensions: { width, height },
        frameCount: this.frames.length,
        suggestedFilename: `animation-${Date.now()}.png`,
        mimeType: 'image/png',
      };
    } catch (error) {
      const exportDuration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      console.error('[APNGEncoder] Encoding error:', error);

      return {
        success: false,
        format: 'apng',
        fileSize: 0,
        exportDuration,
        dimensions: {
          width: this.config.width,
          height: this.config.height,
        },
        error: errorMessage,
        suggestedFilename: 'animation.png',
        mimeType: 'image/png',
      };
    }
  }

  /**
   * Exports the animation by capturing frames at the specified frame rate.
   *
   * @param durationMs - Duration to capture in milliseconds
   * @param renderFn - Function to call before each frame capture
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to the export result
   */
  async export(
    durationMs: number,
    renderFn: (time: number) => void,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    const { frameRate, frameDelay } = this.config;
    const actualFrameDelay = frameDelay ?? 1000 / frameRate;
    const totalFrames = Math.ceil(durationMs / actualFrameDelay);

    this.clear();
    this.state.isRecording = true;
    this.state.startTime = performance.now();

    // Capture frames
    for (let i = 0; i < totalFrames; i++) {
      const time = i * actualFrameDelay;

      // Call render function to update canvas
      renderFn(time);

      // Capture frame
      this.addFrame(Math.round(actualFrameDelay));

      // Report progress
      if (onProgress) {
        onProgress({
          phase: 'capturing',
          percent: Math.round((i / totalFrames) * 40),
          currentFrame: i + 1,
          totalFrames,
          estimatedTimeRemaining: (totalFrames - i) * 10,
          message: `Capturing frame ${i + 1}/${totalFrames}`,
        });
      }

      // Yield to prevent blocking
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this.state.isRecording = false;

    // Encode APNG
    return this.encode(onProgress);
  }

  /**
   * Dynamically loads the upng-js library from CDN.
   *
   * @returns Promise resolving to the UPNG module
   */
  private async loadUpng(): Promise<UPNGModule> {
    // Try to load from window if already available
    if (typeof window !== 'undefined') {
      const win = window as unknown as WindowWithUPNG;
      if (win.UPNG) {
        return win.UPNG;
      }
    }

    // Load from CDN to avoid bundling issues
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/upng-js@2.1.0/UPNG.min.js';
      script.onload = () => {
        const win = window as unknown as WindowWithUPNG;
        if (win.UPNG) {
          resolve(win.UPNG);
        } else {
          reject(new Error('upng-js failed to load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load upng-js'));
      document.head.appendChild(script);
    });
  }
}

/**
 * UPNG module interface.
 */
interface UPNGModule {
  /**
   * Encodes frames to APNG.
   *
   * @param imgs - Array of frame data (ArrayBuffer of RGBA pixels)
   * @param w - Width in pixels
   * @param h - Height in pixels
   * @param cnum - Color count (0 = auto, 256 = indexed)
   * @param dels - Array of delays in milliseconds
   * @param loops - Number of loops (0 = infinite)
   * @returns Encoded PNG data as ArrayBuffer
   */
  encode(
    imgs: ArrayBuffer[],
    w: number,
    h: number,
    cnum: number,
    dels?: number[],
    loops?: number
  ): ArrayBuffer;

  /**
   * Decodes a PNG/APNG file.
   *
   * @param data - PNG file data
   * @returns Decoded image data
   */
  decode(data: ArrayBuffer): DecodedPNG;

  /**
   * Converts decoded PNG to RGBA frames.
   *
   * @param img - Decoded PNG data
   * @returns Array of RGBA frame data
   */
  toRGBA8(img: DecodedPNG): Uint8Array[];
}

/**
 * Decoded PNG data structure.
 */
interface DecodedPNG {
  width: number;
  height: number;
  depth: number;
  ctype: number;
  frames: Array<{
    rect: { x: number; y: number; width: number; height: number };
    delay: number;
    dispose: number;
    blend: number;
  }>;
  tabs: Record<string, unknown>;
  data: Uint8Array;
}

/**
 * Window with UPNG global.
 */
interface WindowWithUPNG extends Window {
  UPNG: UPNGModule;
}
