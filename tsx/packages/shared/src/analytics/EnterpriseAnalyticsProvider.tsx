'use client';

/**
 * Enterprise Analytics Provider
 * Wraps app with comprehensive analytics tracking
 */

import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { enterpriseTracker, type FunnelStep, type AbandonmentType } from './enterpriseTracker';

// =============================================================================
// Context
// =============================================================================

interface EnterpriseAnalyticsContextValue {
  trackFunnel: (step: FunnelStep, metadata?: Record<string, unknown>) => void;
  trackAbandonment: (type: AbandonmentType, options?: {
    formId?: string;
    stepReached?: number;
    totalSteps?: number;
    fieldsFilled?: string[];
    timeSpentMs?: number;
    lastInteraction?: string;
  }) => void;
  markConverted: (event?: string) => void;
  identify: (userId: string) => void;
  getVisitorId: () => string;
  getSessionId: () => string;
  isReturningVisitor: () => boolean;
}

const EnterpriseAnalyticsContext = createContext<EnterpriseAnalyticsContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface EnterpriseAnalyticsProviderProps {
  children: ReactNode;
  endpoint: string;
  debug?: boolean;
  trackClicks?: boolean;
  trackScrollDepth?: boolean;
  trackTimeOnPage?: boolean;
  disabled?: boolean;
}

export function EnterpriseAnalyticsProvider({
  children,
  endpoint,
  debug = false,
  trackClicks = true,
  trackScrollDepth = true,
  trackTimeOnPage = true,
  disabled = false,
}: EnterpriseAnalyticsProviderProps) {
  // Initialize tracker
  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    enterpriseTracker.init({
      endpoint,
      debug,
      trackClicks,
      trackScrollDepth,
      trackTimeOnPage,
    });

    return () => {
      enterpriseTracker.destroy();
    };
  }, [endpoint, debug, trackClicks, trackScrollDepth, trackTimeOnPage, disabled]);

  // Context methods
  const trackFunnel = useCallback((step: FunnelStep, metadata?: Record<string, unknown>) => {
    if (!disabled) enterpriseTracker.trackFunnel(step, metadata);
  }, [disabled]);

  const trackAbandonment = useCallback((type: AbandonmentType, options?: {
    formId?: string;
    stepReached?: number;
    totalSteps?: number;
    fieldsFilled?: string[];
    timeSpentMs?: number;
    lastInteraction?: string;
  }) => {
    if (!disabled) enterpriseTracker.trackAbandonment(type, options);
  }, [disabled]);

  const markConverted = useCallback((event?: string) => {
    if (!disabled) enterpriseTracker.markConverted(event);
  }, [disabled]);

  const identify = useCallback((userId: string) => {
    if (!disabled) enterpriseTracker.identify(userId);
  }, [disabled]);

  const getVisitorId = useCallback(() => enterpriseTracker.getVisitorId(), []);
  const getSessionId = useCallback(() => enterpriseTracker.getSessionId(), []);
  const isReturningVisitor = useCallback(() => enterpriseTracker.isReturningVisitor(), []);

  const value: EnterpriseAnalyticsContextValue = {
    trackFunnel,
    trackAbandonment,
    markConverted,
    identify,
    getVisitorId,
    getSessionId,
    isReturningVisitor,
  };

  return (
    <EnterpriseAnalyticsContext.Provider value={value}>
      {children}
    </EnterpriseAnalyticsContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useEnterpriseAnalytics(): EnterpriseAnalyticsContextValue {
  const context = useContext(EnterpriseAnalyticsContext);
  
  if (!context) {
    // Return no-op functions if used outside provider
    return {
      trackFunnel: () => {},
      trackAbandonment: () => {},
      markConverted: () => {},
      identify: () => {},
      getVisitorId: () => '',
      getSessionId: () => '',
      isReturningVisitor: () => false,
    };
  }
  
  return context;
}

// =============================================================================
// Specialized Hooks
// =============================================================================

/**
 * Hook for tracking form abandonment
 */
export function useFormAbandonmentTracking(formId: string, totalSteps?: number) {
  const { trackAbandonment } = useEnterpriseAnalytics();
  const startTime = Date.now();
  let currentStep = 1;
  let filledFields: string[] = [];

  const trackFieldFilled = useCallback((fieldName: string) => {
    if (!filledFields.includes(fieldName)) {
      filledFields.push(fieldName);
    }
  }, []);

  const trackStepChange = useCallback((step: number) => {
    currentStep = step;
  }, []);

  const trackAbandon = useCallback((lastInteraction?: string) => {
    trackAbandonment('form', {
      formId,
      stepReached: currentStep,
      totalSteps,
      fieldsFilled: filledFields,
      timeSpentMs: Date.now() - startTime,
      lastInteraction,
    });
  }, [formId, totalSteps, trackAbandonment]);

  return {
    trackFieldFilled,
    trackStepChange,
    trackAbandon,
  };
}

/**
 * Hook for tracking wizard/multi-step flow abandonment
 */
export function useWizardAbandonmentTracking(wizardId: string, totalSteps: number) {
  const { trackAbandonment } = useEnterpriseAnalytics();
  const startTime = Date.now();
  let currentStep = 1;

  const setStep = useCallback((step: number) => {
    currentStep = step;
  }, []);

  const trackAbandon = useCallback((lastInteraction?: string) => {
    trackAbandonment('wizard', {
      formId: wizardId,
      stepReached: currentStep,
      totalSteps,
      timeSpentMs: Date.now() - startTime,
      lastInteraction,
    });
  }, [wizardId, totalSteps, trackAbandonment]);

  return {
    setStep,
    trackAbandon,
  };
}

/**
 * Hook for tracking signup flow
 */
export function useSignupTracking() {
  const { trackFunnel, trackAbandonment, markConverted } = useEnterpriseAnalytics();

  const trackSignupStart = useCallback(() => {
    trackFunnel('signup_start');
  }, [trackFunnel]);

  const trackSignupComplete = useCallback(() => {
    trackFunnel('signup_complete');
    markConverted('signup');
  }, [trackFunnel, markConverted]);

  const trackSignupAbandon = useCallback((step: number, totalSteps: number) => {
    trackAbandonment('signup', {
      stepReached: step,
      totalSteps,
    });
  }, [trackAbandonment]);

  return {
    trackSignupStart,
    trackSignupComplete,
    trackSignupAbandon,
  };
}

/**
 * Hook for tracking generation flow
 */
export function useGenerationTracking() {
  const { trackFunnel, trackAbandonment } = useEnterpriseAnalytics();

  const trackFirstGeneration = useCallback(() => {
    trackFunnel('first_generation');
  }, [trackFunnel]);

  const trackGenerationAbandon = useCallback((step: number, totalSteps: number) => {
    trackAbandonment('generation', {
      stepReached: step,
      totalSteps,
    });
  }, [trackAbandonment]);

  return {
    trackFirstGeneration,
    trackGenerationAbandon,
  };
}

export default EnterpriseAnalyticsProvider;
