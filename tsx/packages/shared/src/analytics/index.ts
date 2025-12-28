/**
 * Enterprise Analytics Tracker
 * Zero-impact, queue-based analytics for Aurastream
 * 
 * Features:
 * - Queue-based batching for minimal performance impact
 * - Offline resilience with localStorage persistence
 * - Automatic retry with exponential backoff
 * - PII sanitization
 * - Sampling support
 * - Consent management
 * - TypeScript-first with full type safety
 * 
 * Usage:
 * 
 * 1. Wrap your app with AnalyticsProvider:
 * ```tsx
 * import { AnalyticsProvider } from '@aurastream/shared';
 * 
 * <AnalyticsProvider 
 *   config={{ 
 *     endpoint: '/api/analytics',
 *     debug: process.env.NODE_ENV === 'development'
 *   }}
 *   userId={user?.id}
 * >
 *   <App />
 * </AnalyticsProvider>
 * ```
 * 
 * 2. Use the tracker directly:
 * ```tsx
 * import { analytics } from '@aurastream/shared';
 * 
 * analytics.track('custom_event', { key: 'value' });
 * analytics.page('dashboard');
 * analytics.error(new Error('Something went wrong'), { context: 'generation' });
 * ```
 */

// Core tracker
export { analytics, default } from './tracker';

// React integration
export { AnalyticsProvider, useAnalytics, withAnalytics } from './provider';

// Types
export type {
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsState,
  AnalyticsTracker,
  BaseEventProperties,
  CustomProperties,
  EventCategory,
  FeatureEvent,
  ModalEvent,
  ModalProperties,
  PerformanceEvent,
  PerformanceProperties,
  QueueItem,
  UserActionEvent,
  WizardEvent,
  WizardProperties,
} from './types';

// Utilities (for advanced usage - namespaced to avoid conflicts)
export {
  generateId as analyticsGenerateId,
  getDeviceId,
  getSessionId,
  getBaseProperties,
  sanitizeProperties,
  getPerformanceTiming,
} from './utils';

// =============================================================================
// Enterprise Analytics (Comprehensive Tracking with Heatmaps, Journeys, etc.)
// =============================================================================

export { 
  enterpriseTracker,
  type EnterpriseTrackerConfig,
  type FunnelStep,
  type AbandonmentType,
} from './enterpriseTracker';

export {
  EnterpriseAnalyticsProvider,
  useEnterpriseAnalytics,
  useFormAbandonmentTracking,
  useWizardAbandonmentTracking,
  useSignupTracking,
  useGenerationTracking,
} from './EnterpriseAnalyticsProvider';
