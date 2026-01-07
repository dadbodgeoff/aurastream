/**
 * Web Audio API Context Management
 *
 * Singleton pattern for AudioContext to ensure proper resource management
 * and handle browser autoplay policies.
 */

// ============================================================================
// Types
// ============================================================================

// Declare webkitAudioContext for older Safari browsers
declare const webkitAudioContext: typeof AudioContext | undefined;

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * Extended AudioContext with vendor prefixes for older browsers.
 */
type AudioContextConstructor = typeof AudioContext;

// ============================================================================
// Singleton State
// ============================================================================

let audioContext: AudioContext | null = null;
let contextPromise: Promise<AudioContext> | null = null;

// ============================================================================
// Context Creation
// ============================================================================

/**
 * Get the AudioContext constructor, handling vendor prefixes.
 */
function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.AudioContext || window.webkitAudioContext || null;
}

/**
 * Create a new AudioContext instance.
 *
 * @returns Promise resolving to the AudioContext
 * @throws Error if AudioContext is not supported
 */
export async function createAudioContext(): Promise<AudioContext> {
  const AudioContextClass = getAudioContextConstructor();

  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser');
  }

  const ctx = new AudioContextClass({
    // Use interactive latency for responsive audio visualization
    latencyHint: 'interactive',
    // Standard sample rate for most audio
    sampleRate: 44100,
  });

  // Handle suspended state (browser autoplay policy)
  if (ctx.state === 'suspended') {
    // Try to resume immediately
    try {
      await ctx.resume();
    } catch {
      // Context will need to be resumed on user interaction
      console.warn('AudioContext created in suspended state. Call resumeAudioContext() on user interaction.');
    }
  }

  return ctx;
}

/**
 * Resume a suspended AudioContext.
 *
 * This should be called in response to a user gesture (click, tap, etc.)
 * to comply with browser autoplay policies.
 *
 * @param ctx - The AudioContext to resume
 * @returns Promise that resolves when context is running
 */
export async function resumeAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

/**
 * Get the singleton AudioContext instance.
 *
 * Creates a new context if one doesn't exist.
 * Returns the same instance on subsequent calls.
 *
 * @returns Promise resolving to the AudioContext
 */
export function getAudioContext(): Promise<AudioContext> {
  // Return existing context if available and not closed
  if (audioContext && audioContext.state !== 'closed') {
    return Promise.resolve(audioContext);
  }

  // Return pending promise if context is being created
  if (contextPromise) {
    return contextPromise;
  }

  // Create new context
  contextPromise = createAudioContext()
    .then((ctx) => {
      audioContext = ctx;
      contextPromise = null;

      // Handle context state changes
      ctx.onstatechange = () => {
        if (ctx.state === 'closed') {
          audioContext = null;
        }
      };

      return ctx;
    })
    .catch((error) => {
      contextPromise = null;
      throw error;
    });

  return contextPromise;
}

/**
 * Get the current AudioContext synchronously.
 *
 * Returns null if no context has been created yet.
 * Use getAudioContext() for async access with automatic creation.
 *
 * @returns The current AudioContext or null
 */
export function getAudioContextSync(): AudioContext | null {
  return audioContext;
}

/**
 * Check if AudioContext is supported in the current environment.
 *
 * @returns true if Web Audio API is available
 */
export function isAudioContextSupported(): boolean {
  return getAudioContextConstructor() !== null;
}

/**
 * Check if the current AudioContext is in a usable state.
 *
 * @returns true if context exists and is running
 */
export function isAudioContextReady(): boolean {
  return audioContext !== null && audioContext.state === 'running';
}

/**
 * Get the current state of the AudioContext.
 *
 * @returns The context state or 'unavailable' if no context exists
 */
export function getAudioContextState(): AudioContextState | 'unavailable' {
  return audioContext?.state ?? 'unavailable';
}

/**
 * Close and dispose of the AudioContext.
 *
 * This releases all audio resources. A new context will be created
 * on the next call to getAudioContext().
 */
export async function closeAudioContext(): Promise<void> {
  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close();
    audioContext = null;
  }
  contextPromise = null;
}

/**
 * Add a listener for AudioContext state changes.
 *
 * @param callback - Function to call when state changes
 * @returns Cleanup function to remove the listener
 */
export function onAudioContextStateChange(
  callback: (state: AudioContextState) => void
): () => void {
  if (!audioContext) {
    return () => {};
  }

  const handler = () => {
    if (audioContext) {
      callback(audioContext.state);
    }
  };

  audioContext.addEventListener('statechange', handler);

  return () => {
    audioContext?.removeEventListener('statechange', handler);
  };
}

// ============================================================================
// User Interaction Helpers
// ============================================================================

/**
 * Resume AudioContext on user interaction.
 *
 * Attaches one-time event listeners to resume the context
 * on the first user interaction (click, touch, keydown).
 *
 * @returns Promise that resolves when context is running
 */
export function resumeOnUserInteraction(): Promise<void> {
  return new Promise((resolve) => {
    if (!audioContext || audioContext.state === 'running') {
      resolve();
      return;
    }

    const events = ['click', 'touchstart', 'keydown'];

    const handler = async () => {
      events.forEach((event) => {
        document.removeEventListener(event, handler);
      });

      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      resolve();
    };

    events.forEach((event) => {
      document.addEventListener(event, handler, { once: true });
    });
  });
}

/**
 * Ensure AudioContext is ready for use.
 *
 * Creates context if needed and sets up user interaction resume.
 *
 * @returns Promise resolving to the ready AudioContext
 */
export async function ensureAudioContext(): Promise<AudioContext> {
  const ctx = await getAudioContext();

  if (ctx.state === 'suspended') {
    // Set up resume on user interaction
    resumeOnUserInteraction();
  }

  return ctx;
}
