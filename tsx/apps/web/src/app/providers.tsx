'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { AnalyticsProvider, EnterpriseAnalyticsProvider, useAuth, analytics } from '@aurastream/shared';
import { KeyboardShortcutsProvider, useKeyboardShortcutsContext } from '@/providers/KeyboardShortcutsProvider';
import { CommandPaletteProvider } from '@/providers/CommandPaletteProvider';
import { ImageLightbox } from '@/components/lightbox';

// API base URL for analytics
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Global error handler component - tracks unhandled errors
 */
function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      analytics.error(event.error || new Error(event.message), {
        context: 'global_error_handler',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      analytics.error(error, {
        context: 'unhandled_promise_rejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <>{children}</>;
}

/**
 * Inner providers that need access to keyboard shortcuts context
 */
function InnerProviders({ children }: { children: React.ReactNode }) {
  const { openModal } = useKeyboardShortcutsContext();

  return (
    <CommandPaletteProvider onShowShortcuts={openModal}>
      {children}
    </CommandPaletteProvider>
  );
}

/**
 * Analytics wrapper that connects to auth state
 */
function AnalyticsWrapper({ children, config }: { children: React.ReactNode; config: Parameters<typeof AnalyticsProvider>[0]['config'] }) {
  const { user } = useAuth();
  
  return (
    <AnalyticsProvider 
      config={config} 
      userId={user?.id}
      userTraits={user ? {
        email: user.email,
        displayName: user.displayName,
        subscriptionTier: user.subscriptionTier,
      } : undefined}
    >
      {children}
    </AnalyticsProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Analytics configuration - sends events to backend API
  // Reduced frequency to avoid performance impact
  const analyticsConfig = useMemo(() => ({
    enabled: true,
    debug: process.env.NODE_ENV === 'development',
    endpoint: `${API_BASE}/api/v1/analytics`,
    batchSize: 50,  // Larger batches, fewer requests
    flushInterval: 60000, // 60 seconds instead of 30
    persistQueue: true,
  }), []);

  // Disable enterprise analytics in production for now - causing performance issues
  const enableEnterpriseAnalytics = process.env.NODE_ENV === 'development';

  return (
    <QueryClientProvider client={queryClient}>
      <EnterpriseAnalyticsProvider
        endpoint={`${API_BASE}/api/v1/enterprise-analytics`}
        debug={process.env.NODE_ENV === 'development'}
        trackClicks={false}  // Disable click heatmaps - too many events
        trackScrollDepth={false}  // Disable scroll tracking
        trackTimeOnPage={true}
        disabled={!enableEnterpriseAnalytics}  // Disable in production
      >
        <AnalyticsWrapper config={analyticsConfig}>
          <GlobalErrorHandler>
            <KeyboardShortcutsProvider>
              <InnerProviders>
                {children}
                <ImageLightbox />
              </InnerProviders>
            </KeyboardShortcutsProvider>
          </GlobalErrorHandler>
        </AnalyticsWrapper>
      </EnterpriseAnalyticsProvider>
    </QueryClientProvider>
  );
}
