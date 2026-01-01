/**
 * Creator Intel Hooks Unit & Property Tests
 * 
 * Tests for useIntel.ts hooks including:
 * - useIntelPreferences
 * - useAvailableCategories
 * - useIntelMission
 * - useActivitySummary
 * - Mutation hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

// Mock the apiClient
vi.mock('../../client', () => ({
  apiClient: {
    getAccessToken: vi.fn(() => 'mock-token'),
  },
}));

// Import after mocking
import {
  useIntelPreferences,
  useAvailableCategories,
  useIntelMission,
  useActivitySummary,
  useUpdateIntelPreferences,
  useSubscribeCategory,
  useUnsubscribeCategory,
  useTrackActivity,
  useMissionActed,
  intelKeys,
} from '../useIntel';

// Test utilities
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useIntel Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Query Keys', () => {
    describe('Property Tests', () => {
      it('all query keys should be arrays', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              intelKeys.all,
              intelKeys.preferences(),
              intelKeys.categories(),
              intelKeys.mission()
            ),
            (key) => {
              expect(Array.isArray(key)).toBe(true);
            }
          )
        );
      });

      it('all query keys should start with "intel"', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              intelKeys.all,
              intelKeys.preferences(),
              intelKeys.categories(),
              intelKeys.mission()
            ),
            (key) => {
              expect(key[0]).toBe('intel');
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should have correct base key', () => {
        expect(intelKeys.all).toEqual(['intel']);
      });

      it('should have correct preferences key', () => {
        expect(intelKeys.preferences()).toEqual(['intel', 'preferences']);
      });

      it('should have correct categories key', () => {
        expect(intelKeys.categories()).toEqual(['intel', 'categories']);
      });

      it('should have correct mission key', () => {
        expect(intelKeys.mission()).toEqual(['intel', 'mission']);
      });
    });
  });

  describe('useIntelPreferences', () => {
    describe('Unit Tests', () => {
      it('should fetch preferences successfully', async () => {
        const mockPreferences = {
          subscribed_categories: [
            { key: 'fortnite', name: 'Fortnite', twitch_id: '33214', platform: 'both' }
          ],
          dashboard_layout: [{ panel_type: 'viral_clips', position: 0, size: 'medium' }],
          timezone: 'America/New_York',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPreferences),
        });

        const { result } = renderHook(() => useIntelPreferences(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual({
          subscribedCategories: [
            { key: 'fortnite', name: 'Fortnite', twitchId: '33214', platform: 'both' }
          ],
          dashboardLayout: [{ panelType: 'viral_clips', position: 0, size: 'medium' }],
          timezone: 'America/New_York',
        });
      });

      it('should return defaults on 404', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ detail: 'Not found' }),
        });

        const { result } = renderHook(() => useIntelPreferences(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual({
          subscribedCategories: [],
          dashboardLayout: [],
          timezone: 'America/New_York',
        });
      });

      it('should not fetch when disabled', () => {
        const { result } = renderHook(() => useIntelPreferences(false), {
          wrapper: createWrapper(),
        });

        expect(result.current.isFetching).toBe(false);
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('useAvailableCategories', () => {
    describe('Unit Tests', () => {
      it('should fetch available categories', async () => {
        const mockCategories = [
          { key: 'fortnite', name: 'Fortnite', twitch_id: '33214', icon: '🎮', color: '#FF4655' },
          { key: 'valorant', name: 'Valorant', twitch_id: '516575', icon: '🎯', color: '#FF4655' },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        });

        const { result } = renderHook(() => useAvailableCategories(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0].key).toBe('fortnite');
        expect(result.current.data?.[0].twitchId).toBe('33214');
      });
    });
  });

  describe('useIntelMission', () => {
    describe('Unit Tests', () => {
      it('should fetch mission successfully', async () => {
        const mockMission = {
          recommendation: 'Stream Fortnite between 2-4 PM',
          confidence: 87,
          category: 'fortnite',
          category_name: 'Fortnite',
          suggested_title: 'New Season Gameplay',
          reasoning: 'Low competition, high search volume',
          factors: {
            competition: 'low',
            viral_opportunity: true,
            timing: true,
            history_match: false,
          },
          expires_at: '2025-12-31T23:59:59Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMission),
        });

        const { result } = renderHook(() => useIntelMission(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.recommendation).toBe('Stream Fortnite between 2-4 PM');
        expect(result.current.data?.confidence).toBe(87);
        expect(result.current.data?.factors.viralOpportunity).toBe(true);
      });

      it('should return null on 404', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ detail: 'Not found' }),
        });

        const { result } = renderHook(() => useIntelMission(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
      });
    });
  });

  describe('useActivitySummary', () => {
    describe('Unit Tests', () => {
      it('should fetch activity summary', async () => {
        const mockSummary = {
          category_engagement: { fortnite: 45, valorant: 30 },
          active_hours: [14, 15, 16, 20, 21],
          content_preferences: ['gameplay', 'tutorials'],
          avg_views_by_category: { fortnite: 1500, valorant: 1200 },
          best_performing_times: ['2:00 PM', '8:00 PM'],
          panel_engagement: { viral_clips: 25, trending: 15 },
          missions_shown: 30,
          missions_acted: 12,
          total_events: 500,
          period_days: 30,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummary),
        });

        const { result } = renderHook(() => useActivitySummary(30), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.categoryEngagement).toEqual({ fortnite: 45, valorant: 30 });
        expect(result.current.data?.missionsShown).toBe(30);
        expect(result.current.data?.missionsActed).toBe(12);
      });
    });
  });
});
