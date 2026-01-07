/**
 * OBS HTML Blob Generator
 *
 * Generates self-contained HTML files for OBS Browser Source.
 * Includes embedded engine code, SSE relay connection, and test functionality.
 */

import type { AlertBlobConfig } from '../types';
import { getMinifiedEngineCode, getEngineCodeWithSSE } from './engineBundler';

/**
 * Generates a self-contained HTML blob for OBS Browser Source.
 *
 * The generated HTML includes:
 * - Embedded animation engine
 * - SSE relay connection with auto-reconnect
 * - Test trigger button (optional)
 * - Status indicator (optional)
 * - Transparent background support
 *
 * @param config - Alert blob configuration
 * @returns Complete HTML string ready for OBS
 *
 * @example
 * ```typescript
 * const html = generateOBSHtmlBlob({
 *   alertId: 'my-alert',
 *   alertName: 'New Follower',
 *   width: 512,
 *   height: 512,
 *   duration: 3000,
 *   loop: false,
 *   backgroundColor: 'transparent',
 *   relayUrl: 'http://localhost:3001/events',
 *   animationConfig: JSON.stringify({ type: 'pop_in' }),
 *   debug: true,
 * });
 * ```
 */
export function generateOBSHtmlBlob(config: AlertBlobConfig): string {
  const {
    alertId,
    alertName,
    width,
    height,
    duration,
    loop,
    backgroundColor,
    relayUrl,
    animationConfig,
    timelineData,
    customCss,
    debug = false,
  } = config;

  // Get engine code (with or without SSE support)
  const engineCode = relayUrl
    ? getEngineCodeWithSSE(relayUrl)
    : getMinifiedEngineCode();

  // Generate the HTML document
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}, height=${height}">
  <title>${escapeHtml(alertName)} - AuraStream Alert</title>
  <style>
    /* Reset and base styles */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: ${backgroundColor === 'transparent' ? 'transparent' : backgroundColor};
    }

    /* Canvas container */
    #canvas-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    #alert-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    /* Status indicator (debug mode) */
    .status-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      opacity: ${debug ? '1' : '0'};
      transition: background-color 0.3s ease;
      z-index: 1000;
    }

    .status-connecting {
      background-color: #fbbf24;
      animation: pulse 1s infinite;
    }

    .status-connected {
      background-color: #22c55e;
    }

    .status-disconnected {
      background-color: #ef4444;
    }

    .status-error {
      background-color: #ef4444;
      animation: pulse 0.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Test button (debug mode) */
    .test-button {
      position: absolute;
      bottom: 8px;
      right: 8px;
      padding: 6px 12px;
      background: rgba(99, 102, 241, 0.9);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
      opacity: ${debug ? '1' : '0'};
      transition: background-color 0.2s ease, opacity 0.2s ease;
      z-index: 1000;
    }

    .test-button:hover {
      background: rgba(79, 70, 229, 0.95);
    }

    .test-button:active {
      transform: scale(0.98);
    }

    /* Custom CSS injection point */
    ${customCss || ''}
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="alert-canvas"></canvas>
    <div id="status-indicator" class="status-indicator status-connecting" title="Connecting..."></div>
    <button id="test-button" class="test-button">Test Alert</button>
  </div>

  <script>
    // ========================================================================
    // Embedded Engine Code
    // ========================================================================
    ${engineCode}

    // ========================================================================
    // Alert Configuration
    // ========================================================================
    const ALERT_CONFIG = {
      alertId: ${JSON.stringify(alertId)},
      alertName: ${JSON.stringify(alertName)},
      width: ${width},
      height: ${height},
      duration: ${duration},
      loop: ${loop},
      backgroundColor: ${JSON.stringify(backgroundColor)},
      animationConfig: ${JSON.stringify(animationConfig)},
      timelineData: ${JSON.stringify(timelineData || null)},
    };

    // ========================================================================
    // Initialization
    // ========================================================================
    (function() {
      'use strict';

      let engine = null;
      let relay = null;

      /**
       * Initialize the alert system
       */
      function init() {
        console.log('[OBS Alert] Initializing:', ALERT_CONFIG.alertName);

        // Create and initialize engine
        engine = new AlertEngine(ALERT_CONFIG);
        if (!engine.init('alert-canvas')) {
          console.error('[OBS Alert] Failed to initialize engine');
          updateStatus('error');
          return;
        }

        // Set up SSE relay if URL is provided
        ${relayUrl ? `
        relay = new SSERelay(${JSON.stringify(relayUrl)}, ALERT_CONFIG.alertId, engine);
        relay.connect();
        ` : `
        updateStatus('connected');
        `}

        // Set up test button
        const testButton = document.getElementById('test-button');
        if (testButton) {
          testButton.addEventListener('click', () => {
            console.log('[OBS Alert] Test trigger');
            engine.trigger();
          });
        }

        // Handle visibility changes (pause when hidden)
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            console.log('[OBS Alert] Page hidden, pausing');
          } else {
            console.log('[OBS Alert] Page visible');
          }
        });

        console.log('[OBS Alert] Ready');
      }

      /**
       * Update status indicator
       */
      function updateStatus(status) {
        const indicator = document.getElementById('status-indicator');
        if (indicator) {
          indicator.className = 'status-indicator status-' + status;
        }
      }

      /**
       * Expose trigger function globally for external control
       */
      window.triggerAlert = function() {
        if (engine) {
          engine.trigger();
        }
      };

      /**
       * Expose reset function globally
       */
      window.resetAlert = function() {
        if (engine) {
          engine.reset();
        }
      };

      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  </script>
</body>
</html>`;

  return html;
}

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Generates a downloadable blob URL for the OBS HTML file.
 *
 * @param config - Alert blob configuration
 * @returns Object URL that can be used for download
 *
 * @example
 * ```typescript
 * const url = generateOBSBlobUrl(config);
 * const link = document.createElement('a');
 * link.href = url;
 * link.download = 'my-alert.html';
 * link.click();
 * URL.revokeObjectURL(url);
 * ```
 */
export function generateOBSBlobUrl(config: AlertBlobConfig): string {
  const html = generateOBSHtmlBlob(config);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Downloads the OBS HTML blob as a file.
 *
 * @param config - Alert blob configuration
 * @param filename - Optional filename (defaults to alertId.html)
 */
export function downloadOBSHtmlBlob(
  config: AlertBlobConfig,
  filename?: string
): void {
  const url = generateOBSBlobUrl(config);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${config.alertId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
