/**
 * GIF Encoder
 *
 * Encodes canvas animations to GIF format with configurable quality and dithering.
 * Uses gif.js library for encoding (dynamically imported).
 */

import type {
  GIFExportConfig,
  ExportProgress,
  ExportResult,
  ExportProgressCallback,
  EncoderState,
} from '../types';
import { DEFAULT_GIF_CONFIG } from '../types';

/**
 * Frame data for GIF encoding.
 */
interface GIFFrame {
  /** Image data from canvas */
  imageData: ImageData;
  /** Frame delay in milliseconds */
  delay: number;
}

/**
 * GIF encoder for canvas animations.
 *
 * @example
 * ```typescript
 * const encoder = new GIFEncoder({
 *   canvas: myCanvas,
 *   width: 256,
 *   height: 256,
 *   frameRate: 20,
 *   quality: 10,
 *   dithering: true,
 * });
 *
 * // Capture frames during animation
 * encoder.addFrame();
 *
 * // When done, render the GIF
 * const result = await encoder.render((progress) => {
 *   console.log(`Encoding: ${progress.percent}%`);
 * });
 * ```
 */
export class GIFEncoder {
  private config: GIFExportConfig;
  private frames: GIFFrame[] = [];
  private state: EncoderState = {
    isRecording: false,
    isPaused: false,
    startTime: null,
    framesCaptured: 0,
  };
  private ctx: CanvasRenderingContext2D | null = null;

  /**
   * Creates a new GIF encoder instance.
   *
   * @param config - GIF export configuration
   */
  constructor(config: GIFExportConfig) {
    this.config = { ...DEFAULT_GIF_CONFIG, ...config };
    this.ctx = this.config.canvas.getContext('2d');
  }

  /**
   * Checks if GIF encoding is supported.
   * GIF encoding requires canvas 2D context support.
   *
   * @returns Whether GIF encoding is supported
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
      console.warn('[GIFEncoder] No canvas context available');
      return;
    }

    const { width, height, frameRate } = this.config;
    const frameDelay = delay ?? Math.round(1000 / frameRate);

    // Get image data from canvas
    const imageData = this.ctx.getImageData(0, 0, width, height);

    this.frames.push({
      imageData,
      delay: frameDelay,
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
   * Renders the captured frames to a GIF.
   *
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to the export result
   */
  async render(onProgress?: ExportProgressCallback): Promise<ExportResult> {
    if (this.frames.length === 0) {
      return {
        success: false,
        format: 'gif',
        fileSize: 0,
        exportDuration: 0,
        dimensions: {
          width: this.config.width,
          height: this.config.height,
        },
        error: 'No frames to encode',
        suggestedFilename: 'animation.gif',
        mimeType: 'image/gif',
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
        message: 'Loading GIF encoder...',
      });
    }

    try {
      // Dynamically import gif.js to avoid build issues
      const GIF = await this.loadGifJs();

      return new Promise((resolve, reject) => {
        const { width, height, quality, workers, repeat, background, dithering } =
          this.config;

        // Create GIF instance
        const gif = new GIF({
          workers,
          quality,
          width,
          height,
          workerScript: '/gif.worker.js', // Worker script path
          repeat,
          background: background || undefined,
          dither: dithering,
        });

        // Add frames
        let framesAdded = 0;
        for (const frame of this.frames) {
          gif.addFrame(frame.imageData, { delay: frame.delay });
          framesAdded++;

          if (onProgress) {
            onProgress({
              phase: 'encoding',
              percent: Math.round((framesAdded / this.frames.length) * 50),
              currentFrame: framesAdded,
              totalFrames: this.frames.length,
              message: `Adding frame ${framesAdded}/${this.frames.length}`,
            });
          }
        }

        // Handle progress during rendering
        gif.on('progress', (p: number) => {
          if (onProgress) {
            onProgress({
              phase: 'encoding',
              percent: 50 + Math.round(p * 50),
              currentFrame: this.frames.length,
              totalFrames: this.frames.length,
              message: `Encoding: ${Math.round(p * 100)}%`,
            });
          }
        });

        // Handle completion
        gif.on('finished', (blob: Blob) => {
          const exportDuration = performance.now() - startTime;

          if (onProgress) {
            onProgress({
              phase: 'complete',
              percent: 100,
              currentFrame: this.frames.length,
              totalFrames: this.frames.length,
              message: 'Export complete',
            });
          }

          resolve({
            success: true,
            format: 'gif',
            blob,
            fileSize: blob.size,
            exportDuration,
            dimensions: { width, height },
            frameCount: this.frames.length,
            suggestedFilename: `animation-${Date.now()}.gif`,
            mimeType: 'image/gif',
          });
        });

        // Handle errors
        gif.on('error', (error: Error) => {
          console.error('[GIFEncoder] Encoding error:', error);
          reject(error);
        });

        // Start rendering
        gif.render();
      });
    } catch (error) {
      const exportDuration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        format: 'gif',
        fileSize: 0,
        exportDuration,
        dimensions: {
          width: this.config.width,
          height: this.config.height,
        },
        error: errorMessage,
        suggestedFilename: 'animation.gif',
        mimeType: 'image/gif',
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
    const { frameRate } = this.config;
    const frameDelay = 1000 / frameRate;
    const totalFrames = Math.ceil(durationMs / frameDelay);

    this.clear();
    this.state.isRecording = true;
    this.state.startTime = performance.now();

    // Capture frames
    for (let i = 0; i < totalFrames; i++) {
      const time = i * frameDelay;

      // Call render function to update canvas
      renderFn(time);

      // Capture frame
      this.addFrame(Math.round(frameDelay));

      // Report progress
      if (onProgress) {
        onProgress({
          phase: 'capturing',
          percent: Math.round((i / totalFrames) * 50),
          currentFrame: i + 1,
          totalFrames,
          estimatedTimeRemaining: (totalFrames - i) * 10, // Rough estimate
          message: `Capturing frame ${i + 1}/${totalFrames}`,
        });
      }

      // Yield to prevent blocking
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this.state.isRecording = false;

    // Render GIF
    return this.render(onProgress);
  }

  /**
   * Dynamically loads the gif.js library.
   *
   * @returns Promise resolving to the GIF constructor
   */
  private async loadGifJs(): Promise<GIFConstructor> {
    // Try to load from window if already available
    if (typeof window !== 'undefined') {
      const win = window as unknown as WindowWithGIF;
      if (win.GIF) {
        return win.GIF;
      }
    }

    // Dynamic import - wrapped in try/catch for environments without the module
    try {
      // @ts-expect-error - gif.js may not be installed, fallback to CDN
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const module = await (import('gif.js') as Promise<any>);
      return module.default || module;
    } catch {
      // Fallback: try loading from CDN
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src =
          'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js';
        script.onload = () => {
          const win = window as unknown as WindowWithGIF;
          if (win.GIF) {
            resolve(win.GIF);
          } else {
            reject(new Error('gif.js failed to load'));
          }
        };
        script.onerror = () => reject(new Error('Failed to load gif.js'));
        document.head.appendChild(script);
      });
    }
  }
}

/**
 * GIF.js constructor type.
 */
interface GIFConstructor {
  new (options: GIFOptions): GIFInstance;
}

/**
 * GIF.js options.
 */
interface GIFOptions {
  workers: number;
  quality: number;
  width: number;
  height: number;
  workerScript?: string;
  repeat?: number;
  background?: string;
  dither?: boolean;
}

/**
 * GIF.js instance.
 */
interface GIFInstance {
  addFrame(imageData: ImageData, options?: { delay?: number }): void;
  on(event: 'progress', callback: (progress: number) => void): void;
  on(event: 'finished', callback: (blob: Blob) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  render(): void;
}

/**
 * Window with GIF global.
 */
interface WindowWithGIF extends Window {
  GIF: GIFConstructor;
}
