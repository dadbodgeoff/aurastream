'use client';

/**
 * Simple Analytics Provider
 * 
 * Lightweight React provider for analytics tracking.
 * No queues, no batching, no complexity.
 */

import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { simpleTracker, type EventType } from './simpleTracker';

// =============================================================================
// Context
// =============================================================================

interface SimpleAnalyticsContextValue {
  trackPageView: (path: string) => void;
  trackEvent: (eventType: EventType, metadata?: Record<string, unknown>) => void;
  trackSignup: (source?: string) => void;
  trackLogin: () => void;
  trackLogout: () => void;
  trackGenerationStarted: (assetType: string, jobId?: string) => void;
  trackGenerationCompleted: (assetType: string, jobId?: string) => void;
  trackGenerationFailed: (assetType: string, error: string, jobId?: string) => void;
  getVisitorId: () => string;
  getSessionId: () => string;
}

const SimpleAnalyticsContext = createContext<SimpleAnalyticsContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface SimpleAnalyticsProviderProps {
  children: ReactNode;
  endpoint: string;
  debug?: boolean;
  disabled?: boolean;
  authToken?: string | null;
}

export function SimpleAnalyticsProvider({
  children,
  endpoint,
  debug = false,
  disabled = false,
  authToken,
}: SimpleAnalyticsProviderProps) {
  // Initialize tracker
  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;
    
    simpleTracker.init({
      endpoint,
      debug,
      disabled,
    });
  }, [endpoint, debug, disabled]);
  
  // Update auth token when it changes
  useEffect(() => {
    simpleTracker.setAuthToken(authToken || null);
  }, [authToken]);
  
  // Context methods
  const trackPageView = useCallback((path: string) => {
    if (!disabled) simpleTracker.trackPageView(path);
  }, [disabled]);
  
  const trackEvent = useCallback((eventType: EventType, metadata?: Record<string, unknown>) => {
    if (!disabled) simpleTracker.trackEvent(eventType, metadata);
  }, [disabled]);
  
  const trackSignup = useCallback((source?: string) => {
    if (!disabled) simpleTracker.trackSignup(source);
  }, [disabled]);
  
  const trackLogin = useCallback(() => {
    if (!disabled) simpleTracker.trackLogin();
  }, [disabled]);
  
  const trackLogout = useCallback(() => {
    if (!disabled) simpleTracker.trackLogout();
  }, [disabled]);
  
  const trackGenerationStarted = useCallback((assetType: string, jobId?: string) => {
    if (!disabled) simpleTracker.trackGenerationStarted(assetType, jobId);
  }, [disabled]);
  
  const trackGenerationCompleted = useCallback((assetType: string, jobId?: string) => {
    if (!disabled) simpleTracker.trackGenerationCompleted(assetType, jobId);
  }, [disabled]);
  
  const trackGenerationFailed = useCallback((assetType: string, error: string, jobId?: string) => {
    if (!disabled) simpleTracker.trackGenerationFailed(assetType, error, jobId);
  }, [disabled]);
  
  const getVisitorId = useCallback(() => simpleTracker.getVisitorId(), []);
  const getSessionId = useCallback(() => simpleTracker.getSessionId(), []);
  
  const value: SimpleAnalyticsContextValue = {
    trackPageView,
    trackEvent,
    trackSignup,
    trackLogin,
    trackLogout,
    trackGenerationStarted,
    trackGenerationCompleted,
    trackGenerationFailed,
    getVisitorId,
    getSessionId,
  };
  
  return (
    <SimpleAnalyticsContext.Provider value={value}>
      {children}
    </SimpleAnalyticsContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useSimpleAnalytics(): SimpleAnalyticsContextValue {
  const context = useContext(SimpleAnalyticsContext);
  
  if (!context) {
    // Return no-op functions if used outside provider
    return {
      trackPageView: () => {},
      trackEvent: () => {},
      trackSignup: () => {},
      trackLogin: () => {},
      trackLogout: () => {},
      trackGenerationStarted: () => {},
      trackGenerationCompleted: () => {},
      trackGenerationFailed: () => {},
      getVisitorId: () => '',
      getSessionId: () => '',
    };
  }
  
  return context;
}

export default SimpleAnalyticsProvider;
