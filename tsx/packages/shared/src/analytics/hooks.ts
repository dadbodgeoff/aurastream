/**
 * Enterprise Analytics Tracker - React Hooks
 * Easy-to-use hooks for tracking in React components
 */

import { useCallback, useEffect, useRef } from 'react';
import { analytics } from './tracker';
import type { CustomProperties } from './types';

/**
 * Hook for tracking page views
 * Automatically tracks on mount and route changes
 */
export const usePageTracking = (pageName: string, properties?: CustomProperties) => {
  useEffect(() => {
    analytics.page(pageName, properties);
  }, [pageName, properties]);
};

/**
 * Hook for tracking modal lifecycle
 * Returns handlers for modal events
 */
export const useModalTracking = (modalId: string, modalName: string) => {
  const openTimeRef = useRef<number>(0);
  const currentStepRef = useRef<number>(0);

  const trackOpen = useCallback(
    (trigger?: string, properties?: CustomProperties) => {
      openTimeRef.current = Date.now();
      analytics.modal('modal_opened', {
        modalId,
        modalName,
        trigger,
        ...properties,
      });
    },
    [modalId, modalName]
  );

  const trackClose = useCallback(
    (properties?: CustomProperties) => {
      const timeSpentMs = openTimeRef.current ? Date.now() - openTimeRef.current : 0;
      analytics.modal('modal_closed', {
        modalId,
        modalName,
        timeSpentMs,
        ...properties,
      });
    },
    [modalId, modalName]
  );

  const trackDismiss = useCallback(
    (properties?: CustomProperties) => {
      const timeSpentMs = openTimeRef.current ? Date.now() - openTimeRef.current : 0;
      analytics.modal('modal_dismissed', {
        modalId,
        modalName,
        timeSpentMs,
        ...properties,
      });
    },
    [modalId, modalName]
  );

  const trackComplete = useCallback(
    (properties?: CustomProperties) => {
      const timeSpentMs = openTimeRef.current ? Date.now() - openTimeRef.current : 0;
      analytics.modal('modal_completed', {
        modalId,
        modalName,
        timeSpentMs,
        ...properties,
      });
    },
    [modalId, modalName]
  );

  const trackStepChange = useCallback(
    (currentStep: number, totalSteps: number, properties?: CustomProperties) => {
      currentStepRef.current = currentStep;
      analytics.modal('modal_step_changed', {
        modalId,
        modalName,
        currentStep,
        totalSteps,
        completionRate: (currentStep / totalSteps) * 100,
        ...properties,
      });
    },
    [modalId, modalName]
  );

  return {
    trackOpen,
    trackClose,
    trackDismiss,
    trackComplete,
    trackStepChange,
  };
};

/**
 * Hook for tracking wizard/multi-step flows
 */
export const useWizardTracking = (wizardId: string, wizardName: string, totalSteps: number) => {
  const startTimeRef = useRef<number>(0);
  const stepStartTimeRef = useRef<number>(0);
  const currentStepRef = useRef<number>(0);

  const trackStart = useCallback(
    (properties?: CustomProperties) => {
      startTimeRef.current = Date.now();
      stepStartTimeRef.current = Date.now();
      currentStepRef.current = 1;
      
      analytics.wizard('wizard_started', {
        wizardId,
        wizardName,
        currentStep: 1,
        totalSteps,
        ...properties,
      });
    },
    [wizardId, wizardName, totalSteps]
  );

  const trackStepComplete = useCallback(
    (stepNumber: number, stepName?: string, properties?: CustomProperties) => {
      const timeOnStep = stepStartTimeRef.current ? Date.now() - stepStartTimeRef.current : 0;
      stepStartTimeRef.current = Date.now();
      currentStepRef.current = stepNumber + 1;

      analytics.wizard('wizard_step_completed', {
        wizardId,
        wizardName,
        currentStep: stepNumber,
        totalSteps,
        stepName,
        timeOnStep,
        ...properties,
      });
    },
    [wizardId, wizardName, totalSteps]
  );

  const trackStepSkip = useCallback(
    (stepNumber: number, stepName?: string, properties?: CustomProperties) => {
      analytics.wizard('wizard_step_skipped', {
        wizardId,
        wizardName,
        currentStep: stepNumber,
        totalSteps,
        stepName,
        ...properties,
      });
    },
    [wizardId, wizardName, totalSteps]
  );

  const trackAbandon = useCallback(
    (properties?: CustomProperties) => {
      const totalTime = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      
      analytics.wizard('wizard_abandoned', {
        wizardId,
        wizardName,
        currentStep: currentStepRef.current,
        totalSteps,
        timeOnStep: totalTime,
        ...properties,
      });
    },
    [wizardId, wizardName, totalSteps]
  );

  const trackComplete = useCallback(
    (properties?: CustomProperties) => {
      const totalTime = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      
      analytics.wizard('wizard_completed', {
        wizardId,
        wizardName,
        currentStep: totalSteps,
        totalSteps,
        timeOnStep: totalTime,
        ...properties,
      });
    },
    [wizardId, wizardName, totalSteps]
  );

  // Track abandon on unmount if not completed
  useEffect(() => {
    return () => {
      if (startTimeRef.current > 0 && currentStepRef.current < totalSteps) {
        trackAbandon();
      }
    };
  }, [totalSteps, trackAbandon]);

  return {
    trackStart,
    trackStepComplete,
    trackStepSkip,
    trackAbandon,
    trackComplete,
  };
};

/**
 * Hook for tracking user interactions
 */
export const useInteractionTracking = () => {
  const trackClick = useCallback(
    (elementId: string, elementType: string, properties?: CustomProperties) => {
      analytics.track('button_clicked', {
        elementId,
        elementType,
        ...properties,
      });
    },
    []
  );

  const trackFormSubmit = useCallback(
    (formId: string, formName: string, properties?: CustomProperties) => {
      analytics.track('form_submitted', {
        formId,
        formName,
        ...properties,
      });
    },
    []
  );

  const trackSearch = useCallback((query: string, resultCount?: number, properties?: CustomProperties) => {
    analytics.track('search_performed', {
      query: query.slice(0, 100), // Limit query length
      resultCount,
      ...properties,
    });
  }, []);

  const trackSelection = useCallback(
    (itemId: string, itemType: string, properties?: CustomProperties) => {
      analytics.track('item_selected', {
        itemId,
        itemType,
        ...properties,
      });
    },
    []
  );

  return {
    trackClick,
    trackFormSubmit,
    trackSearch,
    trackSelection,
  };
};

/**
 * Hook for tracking performance metrics
 */
export const usePerformanceTracking = () => {
  const trackTiming = useCallback(
    (metric: string, startTime: number, properties?: CustomProperties) => {
      const duration = Date.now() - startTime;
      analytics.timing(metric, duration, properties);
    },
    []
  );

  const trackApiCall = useCallback(
    (endpoint: string, method: string, startTime: number, success: boolean, properties?: CustomProperties) => {
      const duration = Date.now() - startTime;
      analytics.timing('api_call', duration, {
        endpoint,
        method,
        success,
        ...properties,
      });
    },
    []
  );

  return {
    trackTiming,
    trackApiCall,
  };
};

/**
 * Hook for tracking feature-specific events
 */
export const useFeatureTracking = () => {
  const trackFeature = useCallback(
    (featureName: string, action: string, properties?: CustomProperties) => {
      analytics.track(`${featureName}_${action}`, properties, 'feature');
    },
    []
  );

  // Brand Kit specific
  const trackBrandKit = useCallback((action: string, properties?: CustomProperties) => {
    analytics.track(`brand_kit_${action}`, properties, 'feature');
  }, []);

  // Coach specific
  const trackCoach = useCallback((action: string, properties?: CustomProperties) => {
    analytics.track(`coach_${action}`, properties, 'feature');
  }, []);

  // Content generation specific
  const trackGeneration = useCallback((action: string, properties?: CustomProperties) => {
    analytics.track(`content_${action}`, properties, 'feature');
  }, []);

  // Quick create specific
  const trackQuickCreate = useCallback((action: string, properties?: CustomProperties) => {
    analytics.track(`quick_create_${action}`, properties, 'feature');
  }, []);

  return {
    trackFeature,
    trackBrandKit,
    trackCoach,
    trackGeneration,
    trackQuickCreate,
  };
};
