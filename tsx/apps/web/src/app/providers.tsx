'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SimpleAnalyticsProvider } from '@aurastream/shared';
import { KeyboardShortcutsProvider, useKeyboardShortcutsContext } from '@/providers/KeyboardShortcutsProvider';
import { CommandPaletteProvider } from '@/providers/CommandPaletteProvider';
import { ImageLightbox } from '@/components/lightbox';
import { ToastContainer } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

  return (
    <QueryClientProvider client={queryClient}>
      <SimpleAnalyticsProvider 
        endpoint={`${API_BASE}/api/v1/simple-analytics`}
        debug={process.env.NODE_ENV === 'development'}
      >
        <ErrorBoundary name="App">
          <KeyboardShortcutsProvider>
            <InnerProviders>
              {children}
              <ImageLightbox />
              <ToastContainer position="top-right" />
            </InnerProviders>
          </KeyboardShortcutsProvider>
        </ErrorBoundary>
      </SimpleAnalyticsProvider>
    </QueryClientProvider>
  );
}
