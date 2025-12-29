/**
 * Simple Analytics Tracker
 * 
 * Lightweight, focused tracking for what matters:
 * - Page visits
 * - User events (signup, login, generation)
 * - Session duration
 * 
 * No queues, no batching, no complexity. Just fire-and-forget HTTP calls.
 */

// =============================================================================
// Types
// =============================================================================

export interface SimpleTrackerConfig {
  endpoint: string;
  debug?: boolean;
  disabled?: boolean;
}

export type EventType =
  | 'signup'
  | 'login'
  | 'logout'
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'brand_kit_created'
  | 'asset_downloaded';

// =============================================================================
// Utilities
// =============================================================================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const getVisitorId = (): string => {
  if (typeof window === 'undefined') return generateId();
  
  const key = 'aura_vid';
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateId();
    localStorage.setItem(key, id);
  }
  return id;
};

const getSessionId = (): string => {
  if (typeof window === 'undefined') return generateId();
  
  const key = 'aura_sid';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(key, id);
  }
  return id;
};

const getDeviceType = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
};

const getBrowser = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
};

const getUTMParams = (): Record<string, string | undefined> => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
  };
};

// =============================================================================
// Simple Tracker Class
// =============================================================================

class SimpleTracker {
  private config: SimpleTrackerConfig | null = null;
  private visitorId: string = '';
  private sessionId: string = '';
  private authToken: string | null = null;
  private currentPath: string = '';
  
  /**
   * Initialize the tracker
   */
  init(config: SimpleTrackerConfig): void {
    if (typeof window === 'undefined') return;
    if (config.disabled) return;
    
    this.config = config;
    this.visitorId = getVisitorId();
    this.sessionId = getSessionId();
    
    // Start session
    this._startSession();
    
    // Track initial page
    this.trackPageView(window.location.pathname);
    
    // Set up route change tracking for SPAs
    this._setupRouteTracking();
    
    this._log('Initialized', { visitorId: this.visitorId, sessionId: this.sessionId });
  }
  
  /**
   * Set auth token for authenticated requests
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }
  
  /**
   * Track a page view
   */
  trackPageView(path: string): void {
    if (!this.config || this.config.disabled) return;
    if (path === this.currentPath) return; // Avoid duplicates
    
    this.currentPath = path;
    const utm = getUTMParams();
    
    this._send('/visit', {
      visitorId: this.visitorId,
      pagePath: path,
      sessionId: this.sessionId,
      referrer: document.referrer || undefined,
      deviceType: getDeviceType(),
      browser: getBrowser(),
      ...utm,
    });
    
    this._log('Page view', path);
  }
  
  /**
   * Track a user event
   */
  trackEvent(eventType: EventType, metadata?: Record<string, unknown>): void {
    if (!this.config || this.config.disabled) return;
    
    this._send('/event', {
      eventType,
      metadata,
    }, true); // Requires auth
    
    this._log('Event', eventType, metadata);
  }
  
  // Convenience methods
  trackSignup(source?: string): void {
    this.trackEvent('signup', source ? { source } : undefined);
  }
  
  trackLogin(): void {
    this.trackEvent('login');
  }
  
  trackLogout(): void {
    this.trackEvent('logout');
  }
  
  trackGenerationStarted(assetType: string, jobId?: string): void {
    this.trackEvent('generation_started', { assetType, jobId });
  }
  
  trackGenerationCompleted(assetType: string, jobId?: string): void {
    this.trackEvent('generation_completed', { assetType, jobId });
  }
  
  trackGenerationFailed(assetType: string, error: string, jobId?: string): void {
    this.trackEvent('generation_failed', { assetType, error, jobId });
  }
  
  // ==========================================================================
  // Private Methods
  // ==========================================================================
  
  private _startSession(): void {
    if (!this.config) return;
    
    this._send(`/session/start?visitorId=${this.visitorId}&sessionId=${this.sessionId}`, null, false, 'POST');
  }
  
  private _setupRouteTracking(): void {
    if (typeof window === 'undefined') return;
    
    // Override pushState
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.trackPageView(window.location.pathname);
    };
    
    // Listen for popstate (back/forward)
    window.addEventListener('popstate', () => {
      this.trackPageView(window.location.pathname);
    });
  }
  
  private async _send(
    path: string,
    data: Record<string, unknown> | null,
    requiresAuth: boolean = false,
    method: string = 'POST'
  ): Promise<void> {
    if (!this.config) return;
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (requiresAuth && this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      
      const url = `${this.config.endpoint}${path}`;
      const options: RequestInit = {
        method,
        headers,
        // Use keepalive for reliability on page unload
        keepalive: true,
      };
      
      if (data) {
        options.body = JSON.stringify(data);
      }
      
      // Fire and forget - don't await
      fetch(url, options).catch(() => {
        // Silently ignore errors - analytics should never break the app
      });
    } catch {
      // Silently ignore
    }
  }
  
  private _log(...args: unknown[]): void {
    if (this.config?.debug) {
      console.log('[Analytics]', ...args);
    }
  }
  
  /**
   * Get visitor ID (for external use)
   */
  getVisitorId(): string {
    return this.visitorId;
  }
  
  /**
   * Get session ID (for external use)
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const simpleTracker = new SimpleTracker();
export default simpleTracker;
