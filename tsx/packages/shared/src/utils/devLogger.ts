/**
 * ============================================================================
 * DEV LOGGER - Feature-flagged development logging
 * ============================================================================
 * 
 * 🚨 AGENT INSTRUCTIONS:
 * If the user asks you to enable dev logging, set DEV_LOGGING_ENABLED = true
 * in this file. This will enable verbose console output for debugging.
 * 
 * To enable: Change line below to `const DEV_LOGGING_ENABLED = true;`
 * To disable: Change line below to `const DEV_LOGGING_ENABLED = false;`
 * 
 * ============================================================================
 */

// ⬇️ TOGGLE THIS FLAG TO ENABLE/DISABLE DEV LOGGING ⬇️
const DEV_LOGGING_ENABLED = false;
// ⬆️ TOGGLE THIS FLAG TO ENABLE/DISABLE DEV LOGGING ⬆️

/**
 * Check if we're in development mode
 * Dev logging is enabled when:
 * 1. DEV_LOGGING_ENABLED flag is true (manual override), OR
 * 2. NODE_ENV is 'development' AND NEXT_PUBLIC_DEV_LOGS is 'true'
 */
const isDevLoggingEnabled = (): boolean => {
  // Manual override takes precedence
  if (DEV_LOGGING_ENABLED) return true;
  
  // Check environment
  if (typeof process !== 'undefined') {
    const isDev = process.env.NODE_ENV === 'development';
    const envFlag = process.env.NEXT_PUBLIC_DEV_LOGS === 'true';
    return isDev && envFlag;
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
