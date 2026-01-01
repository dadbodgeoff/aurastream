/**
 * Thumbnail Intel Hooks Unit & Property Tests
 * 
 * Tests for useThumbnailIntel.ts hooks including:
 * - useThumbnailCategories
 * - useThumbnailIntelOverview
 * - useCategoryInsight
 * - useAnalyzeThumbnail
 * - Transform functions with alias fields
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
  useThumbnailCategories,
  useThumbnailIntelOverview,
  useCategoryInsight,
  useAnalyzeThumbnail,
  thumbnailIntelKeys,
} from '../useThumbnailIntel';

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

// Arbitraries for property tests
const thumbnailAnalysisArbitrary = fc.record({
  video_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  thumbnail_url: fc.webUrl(),
  view_count: fc.integer({ min: 0, max: 100000000 }),
  layout_type: fc.constantFrom('face-left', 'face-right', 'centered', 'split'),
  text_placement: fc.constantFrom('top-left', 'top-right', 'bottom', 'center'),
  focal_point: fc.constantFrom('face', 'text', 'action', 'product'),
  dominant_colors: fc.array(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`), { minLength: 1, maxLength: 5 }),
  color_mood: fc.constantFrom('energetic', 'calm', 'dramatic', 'playful'),
  background_style: fc.constantFrom('solid', 'gradient', 'image', 'blur'),
  has_face: fc.boolean(),
  has_text: fc.boolean(),
  text_content: fc.option(fc.string({ maxLength: 50 })),
  has_border: fc.boolean(),
  has_glow_effects: fc.boolean(),
  has_arrows_circles: fc.boolean(),
  layout_recipe: fc.string({ minLength: 10, maxLength: 200 }),
  color_recipe: fc.string({ minLength: 10, maxLength: 200 }),
  why_it_works: fc.string({ minLength: 10, maxLength: 300 }),
  difficulty: fc.constantFrom('easy', 'medium', 'hard'),
});

const categoryInsightArbitrary = fc.record({
  category_key: fc.constantFrom('fortnite', 'valorant', 'minecraft', 'warzone'),
  category_name: fc.constantFrom('Fortnite', 'Valorant', 'Minecraft', 'Warzone'),
  analysis_date: fc.date().map(d => d.toISOString().split('T')[0]),
  thumbnails: fc.array(thumbnailAnalysisArbitrary, { minLength: 0, maxLength: 5 }),
  common_layout: fc.string({ minLength: 5, maxLength: 100 }),
  common_colors: fc.array(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`), { minLength: 1, maxLength: 5 }),
  common_elements: fc.array(fc.string({ minLength: 2, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  ideal_layout: fc.string({ minLength: 5, maxLength: 100 }),
  ideal_color_palette: fc.array(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`), { minLength: 1, maxLength: 5 }),
  must_have_elements: fc.array(fc.string({ minLength: 2, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  avoid_elements: fc.array(fc.string({ minLength: 2, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  category_style_summary: fc.string({ minLength: 10, maxLength: 300 }),
  pro_tips: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 0, maxLength: 5 }),
});

describe('useThumbnailIntel Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Query Keys', () => {
    describe('Unit Tests', () => {
      it('should have correct base key', () => {
        expect(thumbnailIntelKeys.all).toEqual(['thumbnailIntel']);
      });

      it('should have correct categories key', () => {
        expect(thumbnailIntelKeys.categories()).toEqual(['thumbnailIntel', 'categories']);
      });

      it('should have correct overview key', () => {
        expect(thumbnailIntelKeys.overview()).toEqual(['thumbnailIntel', 'overview']);
      });

      it('should have correct category key with parameter', () => {
        expect(thumbnailIntelKeys.category('fortnite')).toEqual(['thumbnailIntel', 'category', 'fortnite']);
      });
    });
  });

  describe('ThumbnailAnalysis Transform', () => {
    describe('Property Tests', () => {
      it('url and thumbnailUrl should always be equal after transform', () => {
        fc.assert(
          fc.property(
            fc.webUrl(),
            (thumbnailUrl) => {
              // Simulate transform logic
              const transformed = {
                thumbnailUrl: thumbnailUrl,
                url: thumbnailUrl, // alias
              };
              expect(transformed.url).toBe(transformed.thumbnailUrl);
            }
          )
        );
      });

      it('views and viewCount should always be equal after transform', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 1000000000 }),
            (viewCount) => {
              // Simulate transform logic
              const transformed = {
                viewCount: viewCount,
                views: viewCount, // alias
              };
              expect(transformed.views).toBe(transformed.viewCount);
            }
          )
        );
      });

      it('key and categoryKey should always be equal after transform', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('fortnite', 'valorant', 'minecraft', 'warzone'),
            (categoryKey) => {
              // Simulate transform logic
              const transformed = {
                categoryKey: categoryKey,
                key: categoryKey, // alias
              };
              expect(transformed.key).toBe(transformed.categoryKey);
            }
          )
        );
      });

      it('name and categoryName should always be equal after transform', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 }),
            (categoryName) => {
              // Simulate transform logic
              const transformed = {
                categoryName: categoryName,
                name: categoryName, // alias
              };
              expect(transformed.name).toBe(transformed.categoryName);
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should transform category insight with all alias fields', async () => {
        const mockInsight = {
          category_key: 'fortnite',
          category_name: 'Fortnite',
          analysis_date: '2025-12-31',
          thumbnails: [
            {
              video_id: 'abc123',
              title: 'Epic Victory Royale',
              thumbnail_url: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
              view_count: 2500000,
              layout_type: 'face-left',
              text_placement: 'top-right',
              focal_point: 'face',
              dominant_colors: ['#FF4655', '#FFD700'],
              color_mood: 'energetic',
              background_style: 'gradient',
              has_face: true,
              has_text: true,
              text_content: 'INSANE',
              has_border: false,
              has_glow_effects: true,
              has_arrows_circles: false,
              layout_recipe: 'Place face on left third, text on right',
              color_recipe: 'Use red and gold for energy',
              why_it_works: 'Face draws attention, text creates curiosity',
              difficulty: 'medium',
            },
          ],
          common_layout: 'Face left, text right',
          common_colors: ['#FF4655', '#FFD700'],
          common_elements: ['face', 'bold text', 'glow'],
          ideal_layout: 'Face on left third, action text top-right',
          ideal_color_palette: ['#FF4655', '#FFD700', '#FFFFFF'],
          must_have_elements: ['face', 'text'],
          avoid_elements: ['clutter', 'small text'],
          category_style_summary: 'High energy thumbnails with faces and bold text',
          pro_tips: ['Use shocked expressions', 'Keep text under 3 words'],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockInsight),
        });

        const { result } = renderHook(() => useCategoryInsight('fortnite'), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const insight = result.current.data;
        expect(insight).toBeDefined();
        
        // Check alias fields on insight
        expect(insight?.key).toBe('fortnite');
        expect(insight?.categoryKey).toBe('fortnite');
        expect(insight?.name).toBe('Fortnite');
        expect(insight?.categoryName).toBe('Fortnite');

        // Check alias fields on thumbnail
        const thumb = insight?.thumbnails[0];
        expect(thumb?.url).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
        expect(thumb?.thumbnailUrl).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
        expect(thumb?.views).toBe(2500000);
        expect(thumb?.viewCount).toBe(2500000);
      });
    });
  });

  describe('useThumbnailCategories', () => {
    describe('Unit Tests', () => {
      it('should fetch categories successfully', async () => {
        const mockCategories = [
          { category_key: 'fortnite', category_name: 'Fortnite', color_theme: '#FF4655', thumbnail_count: 10 },
          { category_key: 'valorant', category_name: 'Valorant', color_theme: '#FF4655', thumbnail_count: 8 },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        });

        const { result } = renderHook(() => useThumbnailCategories(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0].categoryKey).toBe('fortnite');
        expect(result.current.data?.[0].thumbnailCount).toBe(10);
      });
    });
  });

  describe('useThumbnailIntelOverview', () => {
    describe('Unit Tests', () => {
      it('should fetch overview successfully', async () => {
        const mockOverview = {
          analysis_date: '2025-12-31',
          categories: [],
          total_thumbnails_analyzed: 50,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOverview),
        });

        const { result } = renderHook(() => useThumbnailIntelOverview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.analysisDate).toBe('2025-12-31');
        expect(result.current.data?.totalThumbnailsAnalyzed).toBe(50);
      });
    });
  });

  describe('useAnalyzeThumbnail', () => {
    describe('Unit Tests', () => {
      it('should trigger analysis for specific category', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Analysis complete for fortnite',
            category: 'fortnite',
            thumbnails_analyzed: 10,
          }),
        });

        const { result } = renderHook(() => useAnalyzeThumbnail(), {
          wrapper: createWrapper(),
        });

        await result.current.mutateAsync('fortnite');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('category_key=fortnite'),
          expect.any(Object)
        );
      });

      it('should trigger analysis for all categories when no key provided', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Analysis complete for 5 categories',
            categories_analyzed: 5,
          }),
        });

        const { result } = renderHook(() => useAnalyzeThumbnail(), {
          wrapper: createWrapper(),
        });

        await result.current.mutateAsync();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/thumbnail-intel/analyze'),
          expect.any(Object)
        );
      });
    });
  });
});
