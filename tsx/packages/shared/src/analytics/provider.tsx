/**
 * Enterprise Analytics Tracker - React Provider
 * Context provider for analytics configuration and access
 */

import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { analytics } from './tracker';
import type { AnalyticsConfig, AnalyticsTracker } from './types';

// Context
const AnalyticsContext = createContext<AnalyticsTracker | null>(null);

// Provider props
interface AnalyticsProviderProps {
  children: ReactNode;
  config?: Partial<AnalyticsConfig>;
  userId?: string;
  userTraits?: Record<string, string | number | boolean>;
}

/**
 * Analytics Provider Component
 * Wrap your app with this to enable analytics tracking
 */
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  config,
  userId,
  userTraits,
}) => {
  // Initialize analytics on mount
  useEffect(() => {
    analytics.init(config ?? {});
  }, [config]);

  // Identify user when userId changes
  useEffect(() => {
    if (userId) {
      analytics.identify(userId, userTraits);
    }
  }, [userId, userTraits]);

  // Memoize the tracker instance
  const tracker = useMemo(() => analytics, []);

  return (
    <AnalyticsContext.Provider value={tracker}>
      {children}
    </AnalyticsContext.Provider>
  );
};

/**
 * Hook to access the analytics tracker
 */
export const useAnalytics = (): AnalyticsTracker => {
  const context = useContext(AnalyticsContext);
  
  if (!context) {
    // Return a no-op tracker if used outside provider
    // This prevents crashes in tests or SSR
    return {
      init: () => {},
      identify: () => {},
      track: () => {},
      page: () => {},
      modal: () => {},
      wizard: () => {},
      timing: () => {},
      error: () => {},
      flush: async () => {},
      reset: () => {},
      setConsent: () => {},
      getSessionId: () => '',
      getState: () => ({
        initialized: false,
        sessionId: '',
        deviceId: '',
        queue: [],
        isFlushing: false,
        lastFlush: 0,
        totalEventsSent: 0,
        totalEventsDropped: 0,
      }),
    };
  }
  
  return context;
};

/**
 * HOC for adding analytics to class components
 */
export function withAnalytics<P extends object>(
  WrappedComponent: React.ComponentType<P & { analytics: AnalyticsTracker }>
) {
  const WithAnalyticsComponent: React.FC<P> = (props) => {
    const analyticsTracker = useAnalytics();
    return <WrappedComponent {...props} analytics={analyticsTracker} />;
  };
  
  WithAnalyticsComponent.displayName = `WithAnalytics(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithAnalyticsComponent;
}

export default AnalyticsProvider;
