/**
 * Enterprise Analytics Tracker - Utility Functions
 * Lightweight helpers for analytics operations
 */

// Generate a unique ID (UUID v4 compatible)
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Get or create device ID (persisted in localStorage)
export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return generateId();
  
  const key = '__ss_device_id';
  let deviceId = localStorage.getItem(key);
  
  if (!deviceId) {
    deviceId = generateId();
    localStorage.setItem(key, deviceId);
  }
  
  return deviceId;
};

// Get session ID (persisted in sessionStorage)
export const getSessionId = (): string => {
  if (typeof window === 'undefined') return generateId();
  
  const key = '__ss_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = generateId();
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

// Get base event properties
export const getBaseProperties = () => {
  if (typeof window === 'undefined') {
    return {
      timestamp: Date.now(),
      sessionId: generateId(),
      deviceId: generateId(),
      url: '',
      userAgent: '',
      screenResolution: '',
      viewport: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'en',
    };
  }

  return {
    timestamp: Date.now(),
    sessionId: getSessionId(),
    deviceId: getDeviceId(),
    url: window.location.href,
    referrer: document.referrer || undefined,
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
};

// Debounce function for rate limiting
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Throttle function for rate limiting
export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Safe JSON stringify with circular reference handling
export const safeStringify = (obj: unknown): string => {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (_, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
};

// Parse stored queue from localStorage
export const loadPersistedQueue = (): unknown[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('__ss_analytics_queue');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Persist queue to localStorage
export const persistQueue = (queue: unknown[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('__ss_analytics_queue', JSON.stringify(queue));
  } catch {
    // Storage full or unavailable - silently fail
  }
};

// Clear persisted queue
export const clearPersistedQueue = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('__ss_analytics_queue');
};

// Check if we should sample this event
export const shouldSample = (sampleRate: number): boolean => {
  return Math.random() < sampleRate;
};

// Sanitize properties (remove PII, limit depth)
export const sanitizeProperties = (
  props: Record<string, unknown>,
  maxDepth = 3
): Record<string, unknown> => {
  const piiPatterns = [
    /email/i,
    /password/i,
    /ssn/i,
    /credit.?card/i,
    /phone/i,
    /address/i,
  ];

  const sanitize = (obj: Record<string, unknown>, depth: number): Record<string, unknown> => {
    if (depth > maxDepth) return { _truncated: true };

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check for PII keys
      if (piiPatterns.some((pattern) => pattern.test(key))) {
        result[key] = '[REDACTED]';
        continue;
      }

      if (value === null || value === undefined) {
        result[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitize(value as Record<string, unknown>, depth + 1);
      } else if (Array.isArray(value)) {
        result[key] = value.slice(0, 10); // Limit array size
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  return sanitize(props, 0);
};

// Get performance timing data using Navigation Timing API Level 2
export const getPerformanceTiming = (): Record<string, number> | null => {
  if (typeof window === 'undefined' || !window.performance) return null;

  // Use Navigation Timing API Level 2
  const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (!entries || entries.length === 0) {
    return null;
  }

  const timing = entries[0];
  
  return {
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    ttfb: timing.responseStart - timing.requestStart,
    download: timing.responseEnd - timing.responseStart,
    domReady: timing.domContentLoadedEventEnd - timing.startTime,
    load: timing.loadEventEnd - timing.startTime,
  };
};
