# Analytics Integration Guide

Enterprise-grade analytics tracker for Aurastream. Zero performance impact, full type safety.

## Quick Start

### 1. Wrap Your App with the Provider

```tsx
// apps/web/src/app/providers.tsx
import { AnalyticsProvider, useAuth } from '@aurastream/shared';

function AnalyticsWrapper({ children, config }) {
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
```

### 2. Track Events Directly

```tsx
import { analytics } from '@aurastream/shared';

// Track custom events
analytics.track('button_clicked', { buttonId: 'cta-hero' }, 'user_action');

// Track page views
analytics.page('dashboard', { section: 'main' });

// Track errors
analytics.error(new Error('Something went wrong'), { context: 'generation' });

// Track modals
analytics.modal('modal_opened', { modalId: 'brand-kit', modalName: 'Brand Kit Editor' });

// Track wizard progress
analytics.wizard('wizard_step_completed', {
  wizardId: 'quick-create',
  wizardName: 'Quick Create',
  currentStep: 2,
  totalSteps: 3,
});

// Track performance
analytics.timing('api_call', 250, { endpoint: '/api/v1/generate' });
```

### 3. User Identification

```tsx
// Identify user on login (handled automatically by AnalyticsWrapper)
analytics.identify(userId, { plan: 'pro', signupDate: '2024-01-01' });

// Reset on logout (handled automatically by auth store)
analytics.reset();
```

### 4. Consent Management

```tsx
// Manage GDPR consent
analytics.setConsent(false); // Stops all tracking and clears queue
analytics.setConsent(true);  // Resumes tracking
```

## Event Categories

| Category | Use Case |
|----------|----------|
| `page` | Page navigation |
| `modal` | Modal open/close/complete |
| `wizard` | Multi-step flow progress |
| `user_action` | Clicks, form submissions |
| `feature` | Feature-specific actions |
| `error` | Error tracking |
| `performance` | Timing metrics |

## Configuration Options

```tsx
interface AnalyticsConfig {
  endpoint?: string;        // API endpoint for events
  apiKey?: string;          // Auth token
  enabled: boolean;         // Enable/disable tracking
  debug: boolean;           // Console logging
  batchSize: number;        // Events before auto-flush (default: 10)
  flushInterval: number;    // Auto-flush interval ms (default: 30000)
  maxRetries: number;       // Retry attempts (default: 3)
  persistQueue: boolean;    // localStorage persistence (default: true)
  maxQueueSize: number;     // Max queued events (default: 1000)
  sampleRate: number;       // 0-1 sampling rate (default: 1.0)
  excludeEvents?: string[]; // Events to skip
  hasConsent: boolean;      // GDPR consent status
}
```

## Best Practices

1. **Initialize early** - Set up the provider at the app root
2. **Be consistent** - Use the same event names across the app
3. **Don't over-track** - Focus on actionable metrics
4. **Respect privacy** - Always check consent before tracking
5. **Test in debug mode** - Enable `debug: true` during development
