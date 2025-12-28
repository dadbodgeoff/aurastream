/**
 * Enterprise Analytics Tracker - Type Definitions
 * Zero-impact, queue-based analytics for Streamer Studio
 */

// Core event categories - must match backend VALID_CATEGORIES
export type EventCategory =
  | 'page'
  | 'modal'
  | 'wizard'
  | 'user_action'
  | 'feature'
  | 'error'
  | 'performance';

// Modal-specific events
export type ModalEvent =
  | 'modal_opened'
  | 'modal_closed'
  | 'modal_dismissed'
  | 'modal_completed'
  | 'modal_step_changed';

// Wizard flow events
export type WizardEvent =
  | 'wizard_started'
  | 'wizard_step_completed'
  | 'wizard_step_skipped'
  | 'wizard_abandoned'
  | 'wizard_completed';

// User action events
export type UserActionEvent =
  | 'button_clicked'
  | 'link_clicked'
  | 'form_submitted'
  | 'form_field_changed'
  | 'file_uploaded'
  | 'item_selected'
  | 'item_deleted'
  | 'search_performed'
  | 'filter_applied'
  | 'sort_changed';

// Feature-specific events for Streamer Studio
export type FeatureEvent =
  | 'brand_kit_created'
  | 'brand_kit_updated'
  | 'brand_kit_deleted'
  | 'logo_uploaded'
  | 'color_palette_changed'
  | 'font_selected'
  | 'coach_session_started'
  | 'coach_message_sent'
  | 'coach_tip_viewed'
  | 'content_generated'
  | 'content_exported'
  | 'quick_create_started'
  | 'quick_create_completed';

// Performance events
export type PerformanceEvent =
  | 'page_load'
  | 'api_call'
  | 'render_time'
  | 'interaction_delay';

export type AnalyticsEventName =
  | ModalEvent
  | WizardEvent
  | UserActionEvent
  | FeatureEvent
  | PerformanceEvent
  | string;

// Base event properties
export interface BaseEventProperties {
  timestamp: number;
  sessionId: string;
  userId?: string;
  deviceId: string;
  url: string;
  referrer?: string;
  userAgent: string;
  screenResolution: string;
  viewport: string;
  timezone: string;
  language: string;
}

// Modal tracking properties
export interface ModalProperties {
  modalId: string;
  modalName: string;
  trigger?: string;
  currentStep?: number;
  totalSteps?: number;
  timeSpentMs?: number;
  completionRate?: number;
}

// Wizard tracking properties
export interface WizardProperties {
  wizardId: string;
  wizardName: string;
  currentStep: number;
  totalSteps: number;
  stepName?: string;
  timeOnStep?: number;
  inputsProvided?: Record<string, boolean>;
}

// Performance tracking properties
export interface PerformanceProperties {
  metric: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count';
  context?: string;
}

// Custom properties for any event
export type CustomProperties = Record<string, string | number | boolean | null | undefined>;

// Full analytics event
export interface AnalyticsEvent {
  id: string;
  name: AnalyticsEventName;
  category: EventCategory;
  properties: CustomProperties;
  base: BaseEventProperties;
  createdAt: number;
  sentAt?: number;
  retryCount?: number;
}

// Analytics configuration
export interface AnalyticsConfig {
  // Endpoint for sending events
  endpoint?: string;
  // API key for authentication
  apiKey?: string;
  // Enable/disable tracking
  enabled: boolean;
  // Enable debug logging
  debug: boolean;
  // Batch size before auto-flush
  batchSize: number;
  // Flush interval in ms
  flushInterval: number;
  // Max retry attempts
  maxRetries: number;
  // Retry delay in ms
  retryDelay: number;
  // Enable offline queue persistence
  persistQueue: boolean;
  // Max queue size
  maxQueueSize: number;
  // Sample rate (0-1)
  sampleRate: number;
  // Events to exclude
  excludeEvents?: string[];
  // Custom headers
  headers?: Record<string, string>;
  // Consent status
  hasConsent: boolean;
}

// Queue item for batching
export interface QueueItem {
  event: AnalyticsEvent;
  priority: 'high' | 'normal' | 'low';
}

// Analytics state
export interface AnalyticsState {
  initialized: boolean;
  sessionId: string;
  deviceId: string;
  userId?: string;
  queue: QueueItem[];
  isFlushing: boolean;
  lastFlush: number;
  totalEventsSent: number;
  totalEventsDropped: number;
}

// Tracker instance interface
export interface AnalyticsTracker {
  init: (config: Partial<AnalyticsConfig>) => void;
  identify: (userId: string, traits?: CustomProperties) => void;
  track: (name: AnalyticsEventName, properties?: CustomProperties, category?: EventCategory) => void;
  page: (name: string, properties?: CustomProperties) => void;
  modal: (event: ModalEvent, properties: ModalProperties & CustomProperties) => void;
  wizard: (event: WizardEvent, properties: WizardProperties & CustomProperties) => void;
  timing: (metric: string, value: number, properties?: CustomProperties) => void;
  error: (error: Error, properties?: CustomProperties) => void;
  flush: () => Promise<void>;
  reset: () => void;
  destroy: () => void;
  setConsent: (hasConsent: boolean) => void;
  getSessionId: () => string;
  getState: () => AnalyticsState;
}
