/**
 * ============================================================================
 * DEV LOGGER - Feature-flagged development logging
 * ============================================================================
 * 
 * 🚨 AGENT INSTRUCTIONS:
 * This flag ENABLES dev logs when set to true.
 * 
 * To ENABLE logs (debugging):   Set DEV_LOGGING_ENABLED = true
 * To DISABLE logs (production): Set DEV_LOGGING_ENABLED = false
 * 
 * You can also enable at runtime via browser console:
 *   localStorage.setItem('AURASTREAM_DEV_LOGS', 'true')
 *   // Then refresh the page
 * 
 * ============================================================================
 */

// ⬇️ TOGGLE THIS FLAG - TRUE = ENABLE LOGS, FALSE = DISABLE ⬇️
const DEV_LOGGING_ENABLED = false;
// ⬆️ TOGGLE THIS FLAG - TRUE = ENABLE LOGS, FALSE = DISABLE ⬆️

/**
 * Check if we're in development mode
 * Dev logging is enabled when:
 * 1. DEV_LOGGING_ENABLED is true, OR
 * 2. localStorage has AURASTREAM_DEV_LOGS = 'true', OR
 * 3. NEXT_PUBLIC_DEV_LOGS env var is 'true'
 */
const isDevLoggingEnabled = (): boolean => {
  // Check localStorage override first (allows runtime debugging)
  if (typeof window !== 'undefined') {
    const localOverride = localStorage.getItem('AURASTREAM_DEV_LOGS');
    if (localOverride === 'true') return true;
    if (localOverride === 'false') return false;
  }
  
  // Check compile-time flag
  if (DEV_LOGGING_ENABLED) return true;
  
  // Check environment variable
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_DEV_LOGS === 'true') return true;
  }
  
  return false;
};

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface DevLoggerOptions {
  /** Prefix for all log messages from this logger */
  prefix: string;
  /** Force enable regardless of global flag */
  forceEnable?: boolean;
}

/**
 * Create a namespaced dev logger
 * 
 * @example
 * ```ts
 * const log = createDevLogger({ prefix: '[CoachChat]' });
 * log.info('Session started', { sessionId: '123' });
 * // Output (when enabled): [CoachChat] Session started { sessionId: '123' }
 * ```
 */
export function createDevLogger(options: DevLoggerOptions) {
  const { prefix, forceEnable = false } = options;
  
  const shouldLog = () => forceEnable || isDevLoggingEnabled();
  
  const formatMessage = (level: LogLevel, ...args: unknown[]) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    return [`[${timestamp}] ${prefix}`, ...args];
  };
  
  return {
    log: (...args: unknown[]) => {
      if (shouldLog()) console.log(...formatMessage('log', ...args));
    },
    info: (...args: unknown[]) => {
      if (shouldLog()) console.info(...formatMessage('info', ...args));
    },
    warn: (...args: unknown[]) => {
      if (shouldLog()) console.warn(...formatMessage('warn', ...args));
    },
    error: (...args: unknown[]) => {
      // Errors always log regardless of flag
      console.error(...formatMessage('error', ...args));
    },
    debug: (...args: unknown[]) => {
      if (shouldLog()) console.debug(...formatMessage('debug', ...args));
    },
    /** Check if logging is currently enabled */
    isEnabled: shouldLog,
  };
}

/**
 * Global dev logger for quick one-off logs
 * 
 * @example
 * ```ts
 * import { devLog } from '@aurastream/shared';
 * devLog.info('[MyComponent]', 'Something happened', { data });
 * ```
 */
export const devLog = {
  log: (...args: unknown[]) => {
    if (isDevLoggingEnabled()) console.log('[DEV]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDevLoggingEnabled()) console.info('[DEV]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDevLoggingEnabled()) console.warn('[DEV]', ...args);
  },
  error: (...args: unknown[]) => {
    // Errors always log
    console.error('[DEV]', ...args);
  },
  debug: (...args: unknown[]) => {
    if (isDevLoggingEnabled()) console.debug('[DEV]', ...args);
  },
  /** Check if dev logging is enabled */
  isEnabled: isDevLoggingEnabled,
};

/**
 * Quick check if dev logging is enabled
 * Useful for conditional expensive operations
 * 
 * @example
 * ```ts
 * if (isDevMode()) {
 *   const debugData = expensiveDebugOperation();
 *   devLog.info('Debug data:', debugData);
 * }
 * ```
 */
export const isDevMode = isDevLoggingEnabled;

export default devLog;
