/**
 * Analytics Tracker Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analytics } from '../analytics';

// Mock localStorage and sessionStorage
const mockStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  };
};

describe('Analytics Tracker', () => {
  beforeEach(() => {
    // Reset tracker state
    analytics.reset();
    
    // Mock storage
    Object.defineProperty(global, 'localStorage', { value: mockStorage() });
    Object.defineProperty(global, 'sessionStorage', { value: mockStorage() });
  });

  describe('init', () => {
    it('should initialize with default config', () => {
      analytics.init({});
      const state = analytics.getState();
      
      expect(state.initialized).toBe(true);
      expect(state.sessionId).toBeTruthy();
      expect(state.deviceId).toBeTruthy();
    });

    it('should accept custom config', () => {
      analytics.init({
        debug: true,
        batchSize: 5,
        sampleRate: 0.5,
      });
      
      const state = analytics.getState();
      expect(state.initialized).toBe(true);
    });
  });

  describe('track', () => {
    beforeEach(() => {
      analytics.init({ debug: false });
    });

    it('should queue events', () => {
      analytics.track('test_event', { key: 'value' });
      
      const state = analytics.getState();
      expect(state.queue.length).toBe(1);
      expect(state.queue[0].event.name).toBe('test_event');
    });

    it('should include properties', () => {
      analytics.track('test_event', { foo: 'bar', count: 42 });
      
      const state = analytics.getState();
      expect(state.queue[0].event.properties).toMatchObject({
        foo: 'bar',
        count: 42,
      });
    });
  });

  describe('identify', () => {
    beforeEach(() => {
      analytics.init({});
    });

    it('should set user ID', () => {
      analytics.identify('user-123', { plan: 'pro' });
      
      const state = analytics.getState();
      expect(state.userId).toBe('user-123');
    });
  });

  describe('modal tracking', () => {
    beforeEach(() => {
      analytics.init({});
    });

    it('should track modal events', () => {
      analytics.modal('modal_opened', {
        modalId: 'brand-kit',
        modalName: 'Brand Kit Editor',
        trigger: 'sidebar',
      });
      
      const state = analytics.getState();
      expect(state.queue.length).toBe(1);
      expect(state.queue[0].event.name).toBe('modal_opened');
      expect(state.queue[0].event.category).toBe('modal');
    });
  });

  describe('wizard tracking', () => {
    beforeEach(() => {
      analytics.init({});
    });

    it('should track wizard events', () => {
      analytics.wizard('wizard_started', {
        wizardId: 'quick-create',
        wizardName: 'Quick Create',
        currentStep: 1,
        totalSteps: 3,
      });
      
      const state = analytics.getState();
      expect(state.queue.length).toBe(1);
      expect(state.queue[0].event.name).toBe('wizard_started');
      expect(state.queue[0].event.category).toBe('wizard');
    });
  });

  describe('consent management', () => {
    beforeEach(() => {
      analytics.init({});
    });

    it('should stop tracking when consent revoked', () => {
      analytics.track('before_consent', {});
      expect(analytics.getState().queue.length).toBe(1);
      
      analytics.setConsent(false);
      analytics.track('after_consent', {});
      
      // Queue should be cleared and new event not added
      expect(analytics.getState().queue.length).toBe(0);
    });

    it('should resume tracking when consent granted', () => {
      analytics.setConsent(false);
      analytics.track('no_consent', {});
      expect(analytics.getState().queue.length).toBe(0);
      
      analytics.setConsent(true);
      analytics.track('with_consent', {});
      expect(analytics.getState().queue.length).toBe(1);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      analytics.init({});
    });

    it('should clear user and queue', () => {
      analytics.identify('user-123');
      analytics.track('event1', {});
      analytics.track('event2', {});
      
      analytics.reset();
      
      const state = analytics.getState();
      expect(state.userId).toBeUndefined();
      expect(state.queue.length).toBe(0);
    });
  });
});
