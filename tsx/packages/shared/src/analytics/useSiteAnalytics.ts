/**
 * Site Analytics React Hook
 * Easy integration for tracking page views and funnel events
 */

import { useEffect, useCallback } from 'react';
import { siteTracker, type FunnelStep } from './siteTracker';

interface UseSiteAnalyticsOptions {
  /** Track page view on mount */
  trackPageView?: boolean;
  /** Page path override (defaults to window.location.pathname) */
  pagePath?: string;
  /** Page title override */
  pageTitle?: string;
}

export function useSiteAnalytics(options: UseSiteAnalyticsOptions = {}) {
  const { trackPageView = false, pagePath, pageTitle } = options;

  // Track page view on mount if enabled
  useEffect(() => {
    if (trackPageView && typeof window !== 'undefined') {
      const path = pagePath || window.location.pathname;
      const title = pageTitle || document.title;
      siteTracker.trackPageView(path, title);
    }
  }, [trackPageView, pagePath, pageTitle]);

  // Track funnel event
  const trackFunnel = useCallback((step: FunnelStep, metadata?: Record<string, unknown>) => {
    siteTracker.trackFunnel(step, metadata);
  }, []);

  // Track page view manually
  const trackPage = useCallback((path: string, title?: string) => {
    siteTracker.trackPageView(path, title);
  }, []);

  // Mark user as converted
  const markConverted = useCallback((event?: string) => {
    siteTracker.markConverted(event);
  }, []);

  // Link user ID after auth
  const linkUser = useCallback((userId: string) => {
    siteTracker.linkUser(userId);
  }, []);

  // Get IDs for debugging
  const getVisitorId = useCallback(() => siteTracker.getVisitorId(), []);
  const getSessionId = useCallback(() => siteTracker.getSessionId(), []);
  const isReturning = useCallback(() => siteTracker.isReturningVisitor(), []);

  return {
    trackFunnel,
    trackPage,
    markConverted,
    linkUser,
    getVisitorId,
    getSessionId,
    isReturning,
  };
}

export default useSiteAnalytics;
