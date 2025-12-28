/**
 * Site Analytics Tracker
 * Production-ready visitor, session, and funnel tracking
 * 
 * Features:
 * - Persistent visitor ID (survives sessions)
 * - Session ID (per tab/visit)
 * - Funnel conversion tracking
 * - Page view tracking with scroll depth
 * - Session end via sendBeacon (reliable on tab close)
 */

// =============================================================================
// Types
// =============================================================================

export interface SiteTrackerConfig {
  endpoint: string;
  debug?: boolean;
  trackScrollDepth?: boolean;
  trackTimeOnPage?: boolean;
}

export type FunnelStep = 
  | 'landing_view'
  | 'cta_click'
  | 'signup_start'
  | 'signup_complete'
  | 'first_generation';

interface VisitorData {
  visitor_id: string;
  referrer_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  [key: string]: unknown;
}

interface SessionData {
  session_id: string;
  visitor_id: string;
  entry_page: string;
  referrer?: string;
  device_type?: string;
  user_agent?: string;
  [key: string]: unknown;
}

// =============================================================================
// Utilities
// =============================================================================

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const getDeviceType = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

const getBrowser = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Other';
};

const getOS = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
};

const parseUTMParams = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
  };
};

// =============================================================================
// Site Tracker Class
// =============================================================================

class SiteTracker {
  private config: SiteTrackerConfig | null = null;
  private visitorId: string = '';
  private sessionId: string = '';
  private sessionStart: number = 0;
  private pagesViewed: number = 0;
  private currentPage: string = '';
  private pageEnterTime: number = 0;
  private maxScrollDepth: number = 0;
  private hasConverted: boolean = false;
  private isInitialized: boolean = false;

  private log(...args: unknown[]) {
    if (this.config?.debug) {
      console.log('[SiteTracker]', ...args);
    }
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  init(config: SiteTrackerConfig): void {
    if (typeof window === 'undefined') return;
    if (this.isInitialized) {
      this.log('Already initialized');
      return;
    }

    this.config = config;
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStart = Date.now();
    this.currentPage = window.location.pathname;
    this.pageEnterTime = Date.now();
    this.pagesViewed = 1;
    
    // Mark as initialized BEFORE tracking calls so guards pass
    this.isInitialized = true;

    // Track visitor
    this.trackVisitor();

    // Start session
    this.startSession();

    // Track initial page view
    this.trackPageView(this.currentPage, document.title);

    // Track landing funnel step
    if (window.location.pathname === '/' || window.location.pathname === '/landing') {
      this.trackFunnel('landing_view');
    }

    // Setup scroll tracking
    if (config.trackScrollDepth) {
      this.setupScrollTracking();
    }

    // Setup session end handler
    this.setupSessionEndHandler();

    this.log('Initialized', { visitorId: this.visitorId, sessionId: this.sessionId });
  }

  private getOrCreateVisitorId(): string {
    let id = localStorage.getItem('aura_visitor_id');
    if (!id) {
      id = generateId('v');
      localStorage.setItem('aura_visitor_id', id);
    }
    return id;
  }

  private getOrCreateSessionId(): string {
    let id = sessionStorage.getItem('aura_session_id');
    if (!id) {
      id = generateId('s');
      sessionStorage.setItem('aura_session_id', id);
    }
    return id;
  }

  getVisitorId(): string {
    return this.visitorId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  isReturningVisitor(): boolean {
    const visitCount = parseInt(localStorage.getItem('aura_visit_count') || '0', 10);
    return visitCount > 1;
  }

  // ===========================================================================
  // API Calls
  // ===========================================================================

  private async send(path: string, data: Record<string, unknown>): Promise<void> {
    if (!this.config?.endpoint) return;

    try {
      await fetch(`${this.config.endpoint}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      });
      this.log('Sent', path, data);
    } catch (error) {
      this.log('Failed to send', path, error);
    }
  }

  private sendBeacon(path: string, data: Record<string, unknown>): void {
    if (!this.config?.endpoint) return;

    try {
      navigator.sendBeacon(
        `${this.config.endpoint}${path}`,
        JSON.stringify(data)
      );
      this.log('Beacon sent', path, data);
    } catch (error) {
      this.log('Beacon failed', path, error);
    }
  }

  // ===========================================================================
  // Tracking Methods
  // ===========================================================================

  private trackVisitor(): void {
    const utmParams = parseUTMParams();
    const visitCount = parseInt(localStorage.getItem('aura_visit_count') || '0', 10) + 1;
    localStorage.setItem('aura_visit_count', String(visitCount));

    const data: VisitorData = {
      visitor_id: this.visitorId,
      referrer_source: document.referrer ? new URL(document.referrer).hostname : undefined,
      utm_source: utmParams.utm_source || undefined,
      utm_medium: utmParams.utm_medium || undefined,
      utm_campaign: utmParams.utm_campaign || undefined,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
    };

    this.send('/visitor', data);
  }

  private startSession(): void {
    const data: SessionData = {
      session_id: this.sessionId,
      visitor_id: this.visitorId,
      entry_page: window.location.pathname,
      referrer: document.referrer || undefined,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
    };

    this.send('/session/start', data);
  }

  trackPageView(pagePath: string, pageTitle?: string): void {
    if (!this.isInitialized) return;

    // Track time on previous page
    const timeOnPrevPage = this.pageEnterTime > 0 ? Date.now() - this.pageEnterTime : undefined;

    this.send('/pageview', {
      session_id: this.sessionId,
      visitor_id: this.visitorId,
      page_path: pagePath,
      page_title: pageTitle,
      referrer_page: this.currentPage !== pagePath ? this.currentPage : undefined,
      scroll_depth: this.maxScrollDepth > 0 ? this.maxScrollDepth : undefined,
      time_on_page_ms: timeOnPrevPage,
    });

    // Reset for new page
    this.currentPage = pagePath;
    this.pageEnterTime = Date.now();
    this.maxScrollDepth = 0;
    this.pagesViewed++;
  }

  trackFunnel(step: FunnelStep, metadata?: Record<string, unknown>): void {
    if (!this.isInitialized) return;

    this.send('/funnel', {
      visitor_id: this.visitorId,
      session_id: this.sessionId,
      step,
      metadata,
    });

    // Mark conversion for signup_complete
    if (step === 'signup_complete') {
      this.hasConverted = true;
    }

    this.log('Funnel event', step);
  }

  // ===========================================================================
  // Scroll Tracking
  // ===========================================================================

  private setupScrollTracking(): void {
    let ticking = false;

    const updateScrollDepth = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      
      if (scrollPercent > this.maxScrollDepth) {
        this.maxScrollDepth = scrollPercent;
      }
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDepth);
        ticking = true;
      }
    }, { passive: true });
  }

  // ===========================================================================
  // Session End (sendBeacon)
  // ===========================================================================

  private setupSessionEndHandler(): void {
    const handleUnload = () => {
      this.sendBeacon('/session/end', {
        session_id: this.sessionId,
        visitor_id: this.visitorId,
        duration_ms: Date.now() - this.sessionStart,
        pages_viewed: this.pagesViewed,
        exit_page: this.currentPage,
        converted: this.hasConverted,
        conversion_event: this.hasConverted ? 'signup_complete' : undefined,
      });
    };

    // Use both for maximum reliability
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    // Also track on visibility change (mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleUnload();
      }
    });
  }

  // ===========================================================================
  // Manual Conversion Marking
  // ===========================================================================

  markConverted(event?: string): void {
    this.hasConverted = true;
    if (event) {
      this.trackFunnel(event as FunnelStep);
    }
  }

  // ===========================================================================
  // Link User ID (after signup/login)
  // ===========================================================================

  linkUser(userId: string): void {
    this.log('Linking user', userId);
    // This would update the visitor record with the user_id
    // For now, just store locally
    localStorage.setItem('aura_user_id', userId);
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const siteTracker = new SiteTracker();

export default siteTracker;
