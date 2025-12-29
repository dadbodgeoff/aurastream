/**
 * Simple Analytics Tracker
 * Lightweight, focused tracking for AuraStream
 * 
 * Usage:
 * 
 * 1. Wrap your app with SimpleAnalyticsProvider:
 * ```tsx
 * import { SimpleAnalyticsProvider } from '@aurastream/shared';
 * 
 * <SimpleAnalyticsProvider 
 *   endpoint="/api/v1/simple-analytics"
 *   debug={process.env.NODE_ENV === 'development'}
 * >
 *   <App />
 * </SimpleAnalyticsProvider>
 * ```
 * 
 * 2. Use the tracker hook:
 * ```tsx
 * import { useSimpleAnalytics } from '@aurastream/shared';
 * 
 * const { trackLogin, trackGenerationCompleted } = useSimpleAnalytics();
 * trackLogin();
 * trackGenerationCompleted('twitch_emote', jobId);
 * ```
 */

// Simple Analytics
export { simpleTracker } from './simpleTracker';
export { SimpleAnalyticsProvider, useSimpleAnalytics } from './SimpleAnalyticsProvider';
export type { SimpleTrackerConfig, EventType } from './simpleTracker';
