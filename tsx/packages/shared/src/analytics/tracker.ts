/**
 * Enterprise Analytics Tracker - Core Implementation
 * Queue-based, zero-impact analytics for Aurastream
 */

import type {
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsState,
  AnalyticsTracker,
  CustomProperties,
  EventCategory,
  ModalEvent,
  ModalProperties,
  PerformanceProperties,
  QueueItem,
  WizardEvent,
  WizardProperties,
} from './types';

import {
  generateId,
  getBaseProperties,
  getDeviceId,
  getSessionId,
  loadPersistedQueue,
  persistQueue,
  clearPersistedQueue,
  shouldSample,
  sanitizeProperties,
} from './utils';

// Default configuration
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  debug: false,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000,
  persistQueue: true,
  maxQueueSize: 1000,
  sampleRate: 1.0,
  hasConsent: true,
};

// Singleton state
let config: AnalyticsConfig = { ...DEFAULT_CONFIG };
let state: AnalyticsState = {
  initialized: false,
  sessionId: '',
  deviceId: '',
  queue: [],
  isFlushing: false,
  lastFlush: 0,
  totalEventsSent: 0,
  totalEventsDropped: 0,
};

let flushTimer: ReturnType<typeof setInterval> | null = null;

// Debug logger
const log = (...args: unknown[]) => {
  if (config.debug) {
    console.log('[Analytics]', ...args);
  }
};

// Create an event object
const createEvent = (
  name: AnalyticsEventName,
  properties: CustomProperties = {},
  category: EventCategory = 'user_action'
): AnalyticsEvent => {
  const base = getBaseProperties();
  
  return {
    id: generateId(),
    name,
    category,
    properties: sanitizeProperties(properties) as CustomProperties,
    base: {
      ...base,
      userId: state.userId,
    },
    createdAt: Date.now(),
  };
};

// Add event to queue
const enqueue = (event: AnalyticsEvent, priority: QueueItem['priority'] = 'normal') => {
  if (!config.enabled || !config.hasConsent) {
    log('Tracking disabled or no consent, dropping event:', event.name);
    return;
  }

  if (!shouldSample(config.sampleRate)) {
    log('Event sampled out:', event.name);
    return;
  }

  if (config.excludeEvents?.includes(event.name)) {
    log('Event excluded:', event.name);
    return;
  }

  // Check queue size limit
  if (state.queue.length >= config.maxQueueSize) {
    // Remove oldest low-priority events
    const lowPriorityIndex = state.queue.findIndex((item) => item.priority === 'low');
    if (lowPriorityIndex !== -1) {
      state.queue.splice(lowPriorityIndex, 1);
    } else {
      state.totalEventsDropped++;
      log('Queue full, dropping event:', event.name);
      return;
    }
  }

  state.queue.push({ event, priority });
  log('Event queued:', event.name, `(queue size: ${state.queue.length})`);

  // Persist queue if enabled
  if (config.persistQueue) {
    persistQueue(state.queue);
  }

  // Auto-flush if batch size reached
  if (state.queue.length >= config.batchSize) {
    flush();
  }
};


// Send events to endpoint
const sendEvents = async (events: AnalyticsEvent[]): Promise<boolean> => {
  if (!config.endpoint) {
    log('No endpoint configured, events logged locally:', events);
    // In development, just log events
    if (config.debug) {
      events.forEach((e) => console.table({ name: e.name, category: e.category, ...e.properties }));
    }
    return true;
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
        ...config.headers,
      },
      body: JSON.stringify({
        events: events.map((e) => ({ ...e, sentAt: Date.now() })),
        metadata: {
          sdk: 'aurastream-analytics',
          version: '1.0.0',
        },
      }),
      // Use keepalive for page unload scenarios
      keepalive: true,
    });

    return response.ok;
  } catch (error) {
    log('Failed to send events:', error);
    return false;
  }
};

// Flush queue to endpoint
const flush = async (): Promise<void> => {
  if (state.isFlushing || state.queue.length === 0) {
    return;
  }

  state.isFlushing = true;
  log('Flushing queue:', state.queue.length, 'events');

  // Sort by priority (high first)
  const priorityOrder = { high: 0, normal: 1, low: 2 };
  const sortedQueue = [...state.queue].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Take batch
  const batch = sortedQueue.slice(0, config.batchSize);
  const events = batch.map((item) => item.event);

  let success = false;
  let retries = 0;

  while (!success && retries < config.maxRetries) {
    success = await sendEvents(events);
    if (!success) {
      retries++;
      if (retries < config.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, config.retryDelay * retries));
      }
    }
  }

  if (success) {
    // Remove sent events from queue
    const sentIds = new Set(events.map((e) => e.id));
    state.queue = state.queue.filter((item) => !sentIds.has(item.event.id));
    state.totalEventsSent += events.length;
    state.lastFlush = Date.now();
    
    if (config.persistQueue) {
      persistQueue(state.queue);
    }
    
    log('Flush successful, sent:', events.length, 'events');
  } else {
    // Mark events with retry count
    events.forEach((e) => {
      e.retryCount = (e.retryCount || 0) + 1;
    });
    log('Flush failed after', config.maxRetries, 'retries');
  }

  state.isFlushing = false;

  // Continue flushing if more events in queue
  if (state.queue.length >= config.batchSize) {
    setTimeout(flush, 100);
  }
};

// Start flush timer
const startFlushTimer = () => {
  if (flushTimer) return;
  
  flushTimer = setInterval(() => {
    if (state.queue.length > 0) {
      flush();
    }
  }, config.flushInterval);
};

// Stop flush timer
const stopFlushTimer = () => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
};

// Setup page visibility and unload handlers
const setupLifecycleHandlers = () => {
  if (typeof window === 'undefined') return;

  // Flush on page hide (works better than unload on mobile)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  });

  // Flush on beforeunload
  window.addEventListener('beforeunload', () => {
    flush();
  });

  // Track page visibility for engagement
  let hiddenTime = 0;
  let lastHidden = 0;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      lastHidden = Date.now();
    } else if (lastHidden > 0) {
      hiddenTime += Date.now() - lastHidden;
      lastHidden = 0;
    }
  });
};


// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize the analytics tracker
 */
const init = (userConfig: Partial<AnalyticsConfig> = {}): void => {
  if (state.initialized) {
    log('Already initialized, updating config');
  }

  config = { ...DEFAULT_CONFIG, ...userConfig };
  state.sessionId = getSessionId();
  state.deviceId = getDeviceId();
  state.initialized = true;

  // Load persisted queue
  if (config.persistQueue) {
    const persisted = loadPersistedQueue() as QueueItem[];
    if (persisted.length > 0) {
      state.queue = persisted;
      log('Loaded', persisted.length, 'events from storage');
    }
  }

  // Start flush timer
  startFlushTimer();

  // Setup lifecycle handlers
  setupLifecycleHandlers();

  log('Initialized with config:', config);
};

/**
 * Identify a user
 */
const identify = (userId: string, traits: CustomProperties = {}): void => {
  state.userId = userId;
  
  enqueue(
    createEvent('user_identified', { userId, ...traits }, 'user_action'),
    'high'
  );
  
  log('User identified:', userId);
};

/**
 * Track a custom event
 */
const track = (
  name: AnalyticsEventName,
  properties: CustomProperties = {},
  category: EventCategory = 'user_action'
): void => {
  enqueue(createEvent(name, properties, category));
};

/**
 * Track a page view
 */
const page = (name: string, properties: CustomProperties = {}): void => {
  enqueue(
    createEvent('page_view', { pageName: name, ...properties }, 'page_view'),
    'normal'
  );
};

/**
 * Track modal events
 */
const modal = (event: ModalEvent, properties: ModalProperties & CustomProperties): void => {
  enqueue(createEvent(event, properties, 'modal'), event === 'modal_completed' ? 'high' : 'normal');
};

/**
 * Track wizard/flow events
 */
const wizard = (event: WizardEvent, properties: WizardProperties & CustomProperties): void => {
  const priority = event === 'wizard_completed' ? 'high' : event === 'wizard_abandoned' ? 'high' : 'normal';
  enqueue(createEvent(event, properties, 'wizard'), priority);
};

/**
 * Track timing/performance metrics
 */
const timing = (metric: string, value: number, properties: CustomProperties = {}): void => {
  const perfProps: PerformanceProperties & CustomProperties = {
    metric,
    value,
    unit: 'ms',
    ...properties,
  };
  enqueue(createEvent('performance_metric', perfProps, 'performance'), 'low');
};

/**
 * Track errors
 */
const error = (err: Error, properties: CustomProperties = {}): void => {
  enqueue(
    createEvent(
      'error_occurred',
      {
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack?.slice(0, 500), // Limit stack trace size
        ...properties,
      },
      'error'
    ),
    'high'
  );
};

/**
 * Set consent status
 */
const setConsent = (hasConsent: boolean): void => {
  config.hasConsent = hasConsent;
  
  if (!hasConsent) {
    // Clear queue and storage if consent revoked
    state.queue = [];
    clearPersistedQueue();
    stopFlushTimer();
    log('Consent revoked, cleared all data');
  } else {
    startFlushTimer();
    log('Consent granted');
  }
};

/**
 * Reset tracker state (e.g., on logout)
 */
const reset = (): void => {
  state.userId = undefined;
  state.queue = [];
  clearPersistedQueue();
  
  // Generate new session
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('__ss_session_id');
  }
  state.sessionId = getSessionId();
  
  log('Tracker reset');
};

/**
 * Get current session ID
 */
const getTrackerSessionId = (): string => state.sessionId;

/**
 * Get current state (for debugging)
 */
const getState = (): AnalyticsState => ({ ...state });

// Export tracker instance
export const analytics: AnalyticsTracker = {
  init,
  identify,
  track,
  page,
  modal,
  wizard,
  timing,
  error,
  flush,
  reset,
  setConsent,
  getSessionId: getTrackerSessionId,
  getState,
};

export default analytics;
