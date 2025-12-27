'use client';

/**
 * Site Analytics Provider
 * Initialize site tracking at app root
 */

import { useEffect, type ReactNode } from 'react';
import { siteTracker } from './siteTracker';

interface SiteAnalyticsProviderProps {
  children: ReactNode;
  /** API endpoint for analytics (e.g., '/api/v1/site-analytics') */
  endpoint: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Track scroll depth on pages */
  trackScrollDepth?: boolean;
  /** Track time on page */
  trackTimeOnPage?: boolean;
  /** Disable tracking entirely */
  disabled?: boolean;
}

export function SiteAnalyticsProvider({
  children,
  endpoint,
  debug = false,
  trackScrollDepth = true,
  trackTimeOnPage = true,
  disabled = false,
}: SiteAnalyticsProviderProps) {
  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    siteTracker.init({
      endpoint,
      debug,
      trackScrollDepth,
      trackTimeOnPage,
    });
  }, [endpoint, debug, trackScrollDepth, trackTimeOnPage, disabled]);

  return <>{children}</>;
}

export default SiteAnalyticsProvider;
