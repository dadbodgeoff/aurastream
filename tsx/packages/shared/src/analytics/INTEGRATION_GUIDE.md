# Analytics Integration Guide

Enterprise-grade analytics tracker for Aurastream. Zero performance impact, full type safety.

## Quick Start

### 1. Wrap Your App with the Provider

```tsx
// apps/web/src/app/layout.tsx or providers.tsx
import { AnalyticsProvider } from '@aurastream/shared';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AnalyticsProvider
      config={{
        endpoint: '/api/v1/analytics',
        debug: process.env.NODE_ENV === 'development',
        batchSize: 10,
        flushInterval: 30000,
      }}
      userId={user?.id}
    >
      {children}
    </AnalyticsProvider>
  );
}
```

### 2. Track Page Views

```tsx
import { usePageTracking } from '@aurastream/shared';

export function DashboardPage() {
  usePageTracking('dashboard', { section: 'main' });
  
  return <div>...</div>;
}
```

### 3. Track Modals

```tsx
import { useModalTracking } from '@aurastream/shared';

export function BrandKitModal({ isOpen, onClose }) {
  const { trackOpen, trackClose, trackComplete } = useModalTracking(
    'brand-kit-editor',
    'Brand Kit Editor'
  );

  useEffect(() => {
    if (isOpen) trackOpen('sidebar_button');
  }, [isOpen, trackOpen]);

  const handleSave = async () => {
    await saveBrandKit();
    trackComplete({ itemsSaved: 5 });
    onClose();
  };

  const handleClose = () => {
    trackClose();
    onClose();
  };

  return <Modal onClose={handleClose}>...</Modal>;
}
```

### 4. Track Wizards/Multi-Step Flows

```tsx
import { useWizardTracking } from '@aurastream/shared';

export function QuickCreateWizard() {
  const {
    trackStart,
    trackStepComplete,
    trackAbandon,
    trackComplete,
  } = useWizardTracking('quick-create', 'Quick Create Wizard', 3);

  // Track wizard start
  useEffect(() => {
    trackStart({ entryPoint: 'dashboard' });
  }, []);

  const handleNextStep = (currentStep: number) => {
    trackStepComplete(currentStep, STEPS[currentStep], {
      templateSelected: template?.id,
    });
    setStep(currentStep + 1);
  };

  const handleGenerate = async () => {
    await generate();
    trackComplete({
      templateId: template.id,
      vibeId: selectedVibe,
      brandKitUsed: !!brandKitId,
    });
  };

  return <div>...</div>;
}
```

### 5. Track Feature Usage

```tsx
import { useFeatureTracking } from '@aurastream/shared';

export function LogoUploader() {
  const { trackBrandKit } = useFeatureTracking();

  const handleUpload = async (file: File) => {
    await uploadLogo(file);
    trackBrandKit('logo_uploaded', {
      fileSize: file.size,
      fileType: file.type,
    });
  };

  return <Uploader onUpload={handleUpload} />;
}
```

### 6. Track Performance

```tsx
import { usePerformanceTracking } from '@aurastream/shared';

export function AssetGenerator() {
  const { trackApiCall } = usePerformanceTracking();

  const handleGenerate = async () => {
    const startTime = Date.now();
    try {
      await generateAsset();
      trackApiCall('/api/v1/generate', 'POST', startTime, true);
    } catch (error) {
      trackApiCall('/api/v1/generate', 'POST', startTime, false, {
        errorType: error.name,
      });
    }
  };
}
```

### 7. Direct Tracker Usage

```tsx
import { analytics } from '@aurastream/shared';

// Track custom events
analytics.track('custom_event', { key: 'value' }, 'feature');

// Track errors
analytics.error(new Error('Something went wrong'), { context: 'generation' });

// Identify user on login
analytics.identify(userId, { plan: 'pro', signupDate: '2024-01-01' });

// Reset on logout
analytics.reset();

// Manage consent
analytics.setConsent(false); // Stops all tracking
```

## Event Categories

| Category | Use Case |
|----------|----------|
| `page_view` | Page navigation |
| `modal` | Modal open/close/complete |
| `wizard` | Multi-step flow progress |
| `user_action` | Clicks, form submissions |
| `feature` | Feature-specific actions |
| `error` | Error tracking |
| `performance` | Timing metrics |
| `engagement` | Time on page, scroll depth |
| `conversion` | Signups, purchases |

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
2. **Use hooks** - Prefer hooks over direct tracker calls for React components
3. **Be consistent** - Use the same event names across the app
4. **Don't over-track** - Focus on actionable metrics
5. **Respect privacy** - Always check consent before tracking
6. **Test in debug mode** - Enable `debug: true` during development
