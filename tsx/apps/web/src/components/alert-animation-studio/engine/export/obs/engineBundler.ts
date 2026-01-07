/**
 * Engine Bundler - Minified Engine Code Generator
 *
 * Provides the embedded animation engine code as a string for OBS HTML blobs.
 * This is a placeholder that returns a minimal engine class structure.
 */

/**
 * Returns the minified engine code as a string for embedding in HTML blobs.
 *
 * The engine code includes:
 * - Animation transform handling
 * - Timeline playback
 * - Easing functions
 * - Canvas rendering
 *
 * @returns Minified JavaScript code string
 */
export function getMinifiedEngineCode(): string {
  // This is a minimal placeholder engine that provides core functionality
  // In production, this would be replaced with the actual bundled engine code
  return `
/**
 * Minimal Alert Animation Engine
 * Embedded version for OBS Browser Source
 */
class AlertEngine {
  constructor(config) {
    this.config = config;
    this.canvas = null;
    this.ctx = null;
    this.isPlaying = false;
    this.startTime = null;
    this.animationFrame = null;
    this.transform = {
      scaleX: 1, scaleY: 1, scaleZ: 1,
      rotationX: 0, rotationY: 0, rotationZ: 0,
      positionX: 0, positionY: 0, positionZ: 0,
      opacity: 1
    };
    this.onComplete = null;
  }

  /**
   * Initialize the engine with a canvas element
   */
  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('[AlertEngine] Canvas not found:', canvasId);
      return false;
    }
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.config.width || 512;
    this.canvas.height = this.config.height || 512;
    console.log('[AlertEngine] Initialized', this.config);
    return true;
  }

  /**
   * Start playing the animation
   */
  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now();
    this._animate();
    console.log('[AlertEngine] Playing');
  }

  /**
   * Stop the animation
   */
  stop() {
    this.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    console.log('[AlertEngine] Stopped');
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.stop();
    this.transform = {
      scaleX: 1, scaleY: 1, scaleZ: 1,
      rotationX: 0, rotationY: 0, rotationZ: 0,
      positionX: 0, positionY: 0, positionZ: 0,
      opacity: 1
    };
    this._clear();
  }

  /**
   * Trigger the alert animation
   */
  trigger() {
    this.reset();
    this.play();
  }

  /**
   * Main animation loop
   */
  _animate() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    const duration = this.config.duration || 3000;
    const t = Math.min(elapsed / duration, 1);

    // Update transform based on animation config
    this._updateTransform(t);

    // Render frame
    this._render();

    // Check if animation is complete
    if (t >= 1) {
      if (this.config.loop) {
        this.startTime = now;
      } else {
        this.isPlaying = false;
        if (this.onComplete) this.onComplete();
        console.log('[AlertEngine] Animation complete');
        return;
      }
    }

    this.animationFrame = requestAnimationFrame(() => this._animate());
  }

  /**
   * Update transform based on normalized time
   */
  _updateTransform(t) {
    // Apply easing
    const eased = this._ease(t, this.config.easing || 'easeOutBack');

    // Parse animation config if available
    let animConfig = {};
    try {
      if (this.config.animationConfig) {
        animConfig = JSON.parse(this.config.animationConfig);
      }
    } catch (e) {
      console.warn('[AlertEngine] Failed to parse animation config');
    }

    // Default pop-in animation
    const entryDuration = 0.3;
    if (t < entryDuration) {
      const entryT = this._ease(t / entryDuration, 'easeOutBack');
      this.transform.scaleX = entryT;
      this.transform.scaleY = entryT;
      this.transform.opacity = entryT;
    } else {
      this.transform.scaleX = 1;
      this.transform.scaleY = 1;
      this.transform.opacity = 1;
    }
  }

  /**
   * Easing functions
   */
  _ease(t, type) {
    switch (type) {
      case 'linear': return t;
      case 'easeInQuad': return t * t;
      case 'easeOutQuad': return t * (2 - t);
      case 'easeInOutQuad': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'easeInCubic': return t * t * t;
      case 'easeOutCubic': return (--t) * t * t + 1;
      case 'easeInOutCubic': return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      case 'easeOutBack': {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      }
      case 'easeOutElastic': {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      }
      case 'easeOutBounce': {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
      }
      default: return t;
    }
  }

  /**
   * Clear the canvas
   */
  _clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.config.backgroundColor && this.config.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = this.config.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Render the current frame
   */
  _render() {
    this._clear();
    if (!this.ctx) return;

    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    this.ctx.save();

    // Apply transforms
    this.ctx.globalAlpha = this.transform.opacity;
    this.ctx.translate(centerX + this.transform.positionX * width, centerY + this.transform.positionY * height);
    this.ctx.rotate(this.transform.rotationZ);
    this.ctx.scale(this.transform.scaleX, this.transform.scaleY);

    // Draw placeholder content (would be replaced with actual alert content)
    this.ctx.fillStyle = '#6366f1';
    this.ctx.beginPath();
    this.ctx.roundRect(-50, -50, 100, 100, 10);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('ALERT', 0, 0);

    this.ctx.restore();
  }
}

// Export for use in HTML blob
window.AlertEngine = AlertEngine;
`.trim();
}

/**
 * Returns the engine code with SSE relay support embedded.
 *
 * @param relayUrl - The SSE relay server URL
 * @returns JavaScript code string with SSE support
 */
export function getEngineCodeWithSSE(relayUrl: string): string {
  const baseEngine = getMinifiedEngineCode();

  const sseCode = `
/**
 * SSE Relay Connection Manager
 */
class SSERelay {
  constructor(url, alertId, engine) {
    this.url = url;
    this.alertId = alertId;
    this.engine = engine;
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 0; // 0 = infinite
    this.reconnectDelay = 3000;
    this.isConnected = false;
  }

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    console.log('[SSERelay] Connecting to', this.url);
    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      console.log('[SSERelay] Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this._updateStatus('connected');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._handleEvent(data);
      } catch (e) {
        console.warn('[SSERelay] Failed to parse event:', e);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('[SSERelay] Connection error:', error);
      this.isConnected = false;
      this._updateStatus('disconnected');
      this._scheduleReconnect();
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this._updateStatus('disconnected');
  }

  _handleEvent(data) {
    console.log('[SSERelay] Received event:', data);

    if (data.type === 'trigger' && data.alertId === this.alertId) {
      console.log('[SSERelay] Triggering alert');
      this.engine.trigger();
    } else if (data.type === 'test') {
      console.log('[SSERelay] Test trigger');
      this.engine.trigger();
    } else if (data.type === 'ping') {
      console.log('[SSERelay] Ping received');
    }
  }

  _scheduleReconnect() {
    if (this.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSERelay] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);
    console.log('[SSERelay] Reconnecting in', delay, 'ms (attempt', this.reconnectAttempts + ')');

    setTimeout(() => this.connect(), delay);
  }

  _updateStatus(status) {
    const indicator = document.getElementById('status-indicator');
    if (indicator) {
      indicator.className = 'status-' + status;
      indicator.title = status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
}

window.SSERelay = SSERelay;
`;

  return baseEngine + '\n\n' + sseCode.trim();
}
