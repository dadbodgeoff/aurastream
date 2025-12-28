'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { AnalyticsProvider, EnterpriseAnalyticsProvider } from '@aurastream/shared';
import { KeyboardShortcutsProvider, useKeyboardShortcutsContext } from '@/providers/KeyboardShortcutsProvider';
import { CommandPaletteProvider } from '@/providers/CommandPaletteProvider';
import { ImageLightbox } from '@/components/lightbox';

// API base URL for analytics
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  const analyticsConfig = useMemo(() => ({
    enabled: true,
    debug: process.env.NODE_ENV === 'development',
    endpoint: `${API_BASE}/api/v1/analytics`,
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    persistQueue: true,
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <EnterpriseAnalyticsProvider
        endpoint={`${API_BASE}/api/v1/enterprise-analytics`}
        debug={process.env.NODE_ENV === 'development'}
        trackClicks={true}
        trackScrollDepth={true}
        trackTimeOnPage={true}
      >
        <AnalyticsProvider config={analyticsConfig}>
          <KeyboardShortcutsProvider>
            <InnerProviders>
              {children}
              <ImageLightbox />
            </InnerProviders>
          </KeyboardShortcutsProvider>
        </AnalyticsProvider>
      </EnterpriseAnalyticsProvider>
    </QueryClientProvider>
  );
}
