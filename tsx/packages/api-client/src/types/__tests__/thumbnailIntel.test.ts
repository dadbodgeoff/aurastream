/**
 * Thumbnail Intel Types Property Tests
 * 
 * Tests for type definitions and field aliases in thumbnailIntel.ts
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ThumbnailAnalysis, CategoryInsight, ThumbnailIntelOverview } from '../thumbnailIntel';

describe('Thumbnail Intel Types', () => {
  describe('ThumbnailAnalysis Type', () => {
    describe('Property Tests', () => {
      it('ThumbnailAnalysis should have url equal to thumbnailUrl', () => {
        fc.assert(
          fc.property(
            fc.webUrl(),
            (thumbnailUrl) => {
              const analysis: ThumbnailAnalysis = {
                videoId: 'abc123',
                title: 'Test Video',
                thumbnailUrl: thumbnailUrl,
                url: thumbnailUrl,
                viewCount: 1000000,
                views: 1000000,
                layoutType: 'face-left',
                textPlacement: 'top-right',
                focalPoint: 'face',
                dominantColors: ['#FF4655', '#FFD700'],
                colorMood: 'energetic',
                backgroundStyle: 'gradient',
                hasFace: true,
                hasText: true,
                textContent: 'INSANE',
                hasBorder: false,
                hasGlowEffects: true,
                hasArrowsCircles: false,
                layoutRecipe: 'Place face on left',
                colorRecipe: 'Use red and gold',
                whyItWorks: 'Face draws attention',
                difficulty: 'medium',
              };
              
              expect(analysis.url).toBe(analysis.thumbnailUrl);
            }
          )
        );
      });

      it('ThumbnailAnalysis should have views equal to viewCount', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 1000000000 }),
            (viewCount) => {
              const analysis: ThumbnailAnalysis = {
                videoId: 'abc123',
                title: 'Test Video',
                thumbnailUrl: 'https://test.com/thumb.jpg',
                url: 'https://test.com/thumb.jpg',
                viewCount: viewCount,
                views: viewCount,
                layoutType: 'face-left',
                textPlacement: 'top-right',
                focalPoint: 'face',
                dominantColors: ['#FF4655'],
                colorMood: 'energetic',
                backgroundStyle: 'gradient',
                hasFace: true,
                hasText: true,
                hasBorder: false,
                hasGlowEffects: false,
                hasArrowsCircles: false,
                layoutRecipe: 'Test',
                colorRecipe: 'Test',
                whyItWorks: 'Test',
                difficulty: 'easy',
              };
              
              expect(analysis.views).toBe(analysis.viewCount);
            }
          )
        );
      });

      it('difficulty should be one of easy, medium, hard', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('easy', 'medium', 'hard') as fc.Arbitrary<'easy' | 'medium' | 'hard'>,
            (difficulty) => {
              const analysis: ThumbnailAnalysis = {
                videoId: 'abc123',
                title: 'Test',
                thumbnailUrl: 'https://test.com/thumb.jpg',
                url: 'https://test.com/thumb.jpg',
                viewCount: 1000,
                views: 1000,
                layoutType: 'face-left',
                textPlacement: 'top-right',
                focalPoint: 'face',
                dominantColors: [],
                colorMood: 'energetic',
                backgroundStyle: 'solid',
                hasFace: false,
                hasText: false,
                hasBorder: false,
                hasGlowEffects: false,
                hasArrowsCircles: false,
                layoutRecipe: '',
                colorRecipe: '',
                whyItWorks: '',
                difficulty: difficulty,
              };
              
              expect(['easy', 'medium', 'hard']).toContain(analysis.difficulty);
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should allow creating a valid ThumbnailAnalysis', () => {
        const analysis: ThumbnailAnalysis = {
          videoId: 'abc123',
          title: 'Epic Victory Royale',
          thumbnailUrl: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
          url: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
          viewCount: 2500000,
          views: 2500000,
          layoutType: 'face-left',
          textPlacement: 'top-right',
          focalPoint: 'face',
          dominantColors: ['#FF4655', '#FFD700'],
          colorMood: 'energetic',
          backgroundStyle: 'gradient',
          hasFace: true,
          hasText: true,
          textContent: 'INSANE',
          hasBorder: false,
          hasGlowEffects: true,
          hasArrowsCircles: false,
          layoutRecipe: 'Place face on left third, text on right',
          colorRecipe: 'Use red and gold for energy',
          whyItWorks: 'Face draws attention, text creates curiosity',
          difficulty: 'medium',
        };

        expect(analysis.url).toBe(analysis.thumbnailUrl);
        expect(analysis.views).toBe(analysis.viewCount);
        expect(analysis.difficulty).toBe('medium');
      });
    });
  });

  describe('CategoryInsight Type', () => {
    describe('Property Tests', () => {
      it('CategoryInsight should have key equal to categoryKey', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('fortnite', 'valorant', 'minecraft', 'warzone'),
            (categoryKey) => {
              const insight: CategoryInsight = {
                categoryKey: categoryKey,
                key: categoryKey,
                categoryName: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
                name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
                analysisDate: '2025-12-31',
                thumbnails: [],
                commonLayout: 'Face left',
                commonColors: ['#FF4655'],
                commonElements: ['face'],
                idealLayout: 'Face left, text right',
                idealColorPalette: ['#FF4655', '#FFD700'],
                mustHaveElements: ['face'],
                avoidElements: ['clutter'],
                categoryStyleSummary: 'High energy thumbnails',
                proTips: ['Use shocked expressions'],
              };
              
              expect(insight.key).toBe(insight.categoryKey);
            }
          )
        );
      });

      it('CategoryInsight should have name equal to categoryName', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 }),
            (categoryName) => {
              const insight: CategoryInsight = {
                categoryKey: 'test',
                key: 'test',
                categoryName: categoryName,
                name: categoryName,
                analysisDate: '2025-12-31',
                thumbnails: [],
                commonLayout: '',
                commonColors: [],
                commonElements: [],
                idealLayout: '',
                idealColorPalette: [],
                mustHaveElements: [],
                avoidElements: [],
                categoryStyleSummary: '',
                proTips: [],
              };
              
              expect(insight.name).toBe(insight.categoryName);
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should allow creating a valid CategoryInsight', () => {
        const insight: CategoryInsight = {
          categoryKey: 'fortnite',
          key: 'fortnite',
          categoryName: 'Fortnite',
          name: 'Fortnite',
          analysisDate: '2025-12-31',
          thumbnails: [],
          commonLayout: 'Face left, text right',
          commonColors: ['#FF4655', '#FFD700'],
          commonElements: ['face', 'bold text', 'glow'],
          idealLayout: 'Face on left third, action text top-right',
          idealColorPalette: ['#FF4655', '#FFD700', '#FFFFFF'],
          mustHaveElements: ['face', 'text'],
          avoidElements: ['clutter', 'small text'],
          categoryStyleSummary: 'High energy thumbnails with faces and bold text',
          proTips: ['Use shocked expressions', 'Keep text under 3 words'],
        };

        expect(insight.key).toBe('fortnite');
        expect(insight.categoryKey).toBe('fortnite');
        expect(insight.name).toBe('Fortnite');
        expect(insight.categoryName).toBe('Fortnite');
      });
    });
  });

  describe('ThumbnailIntelOverview Type', () => {
    describe('Unit Tests', () => {
      it('should allow creating a valid ThumbnailIntelOverview', () => {
        const overview: ThumbnailIntelOverview = {
          analysisDate: '2025-12-31',
          categories: [],
          totalThumbnailsAnalyzed: 50,
        };

        expect(overview.analysisDate).toBe('2025-12-31');
        expect(overview.totalThumbnailsAnalyzed).toBe(50);
        expect(overview.categories).toEqual([]);
      });
    });
  });
});
