/**
 * Thumbnail Recreation Types Tests
 * 
 * Unit and property tests for thumbnail recreation TypeScript types.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type {
  RecreateRequest,
  RecreateResponse,
  RecreationStatus,
  RecreationHistoryItem,
  RecreationHistory,
  FaceAsset,
  FaceAssetsResponse,
  UploadFaceRequest,
  UploadFaceResponse,
} from '../thumbnailRecreate';
import type { ThumbnailAnalysis } from '../thumbnailIntel';

describe('Thumbnail Recreation Types', () => {
  describe('RecreateRequest Type', () => {
    describe('Unit Tests', () => {
      it('should allow creating a valid RecreateRequest with face upload', () => {
        const mockAnalysis: ThumbnailAnalysis = {
          videoId: 'test123',
          title: 'Test Video',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          url: 'https://example.com/thumb.jpg',
          viewCount: 1500000,
          views: 1500000,
          layoutType: 'face-left-text-right',
          textPlacement: 'right-side',
          focalPoint: 'face',
          dominantColors: ['#FF0000', '#FFFFFF'],
          colorMood: 'high-energy',
          backgroundStyle: 'gradient',
          hasFace: true,
          hasText: true,
          textContent: 'SHOCKING!',
          hasBorder: false,
          hasGlowEffects: true,
          hasArrowsCircles: false,
          faceExpression: 'shocked',
          facePosition: 'left-third',
          faceSize: 'large',
          faceLookingDirection: 'camera',
          layoutRecipe: 'Place face on left',
          colorRecipe: 'Red and white',
          whyItWorks: 'Strong emotion',
          difficulty: 'medium',
        };

        const request: RecreateRequest = {
          videoId: 'test123',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          analysis: mockAnalysis,
          faceImageBase64: 'iVBORw0KGgo...',
        };

        expect(request.videoId).toBe('test123');
        expect(request.faceImageBase64).toBeDefined();
        expect(request.faceAssetId).toBeUndefined();
      });

      it('should allow creating a RecreateRequest with saved face asset', () => {
        const mockAnalysis: ThumbnailAnalysis = {
          videoId: 'test123',
          title: 'Test Video',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          url: 'https://example.com/thumb.jpg',
          viewCount: 1500000,
          views: 1500000,
          layoutType: 'face-left-text-right',
          textPlacement: 'right-side',
          focalPoint: 'face',
          dominantColors: ['#FF0000'],
          colorMood: 'high-energy',
          backgroundStyle: 'gradient',
          hasFace: true,
          hasText: false,
          hasBorder: false,
          hasGlowEffects: false,
          hasArrowsCircles: false,
          layoutRecipe: 'Place face on left',
          colorRecipe: 'Red',
          whyItWorks: 'Strong emotion',
          difficulty: 'easy',
        };

        const request: RecreateRequest = {
          videoId: 'test123',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          analysis: mockAnalysis,
          faceAssetId: 'face-asset-123',
        };

        expect(request.faceAssetId).toBe('face-asset-123');
        expect(request.faceImageBase64).toBeUndefined();
      });

      it('should allow optional customization fields', () => {
        const mockAnalysis: ThumbnailAnalysis = {
          videoId: 'test123',
          title: 'Test Video',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          url: 'https://example.com/thumb.jpg',
          viewCount: 1500000,
          views: 1500000,
          layoutType: 'text-centered',
          textPlacement: 'center',
          focalPoint: 'text',
          dominantColors: ['#0000FF'],
          colorMood: 'calm',
          backgroundStyle: 'solid',
          hasFace: false,
          hasText: true,
          textContent: 'TUTORIAL',
          hasBorder: true,
          hasGlowEffects: false,
          hasArrowsCircles: true,
          layoutRecipe: 'Center text',
          colorRecipe: 'Blue',
          whyItWorks: 'Clear and readable',
          difficulty: 'easy',
        };

        const request: RecreateRequest = {
          videoId: 'test123',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          analysis: mockAnalysis,
          customText: 'MY CUSTOM TEXT',
          useBrandColors: true,
          brandKitId: 'brand-kit-123',
          additionalInstructions: 'Make it more dramatic',
        };

        expect(request.customText).toBe('MY CUSTOM TEXT');
        expect(request.useBrandColors).toBe(true);
        expect(request.brandKitId).toBe('brand-kit-123');
        expect(request.additionalInstructions).toBe('Make it more dramatic');
      });
    });
  });

  describe('RecreateResponse Type', () => {
    describe('Property Tests', () => {
      it('status should always be one of the valid values', () => {
        const validStatuses = ['queued', 'processing', 'completed', 'failed'] as const;
        
        fc.assert(
          fc.property(
            fc.constantFrom(...validStatuses),
            (status) => {
              const response: RecreateResponse = {
                recreationId: 'rec-123',
                jobId: 'job-123',
                status,
                estimatedSeconds: 30,
                message: 'Test message',
              };
              return validStatuses.includes(response.status);
            }
          )
        );
      });

      it('estimatedSeconds should be a positive number', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 300 }),
            (seconds) => {
              const response: RecreateResponse = {
                recreationId: 'rec-123',
                jobId: 'job-123',
                status: 'queued',
                estimatedSeconds: seconds,
                message: 'Test',
              };
              return response.estimatedSeconds > 0;
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should allow creating a valid RecreateResponse', () => {
        const response: RecreateResponse = {
          recreationId: 'rec-123',
          jobId: 'job-123',
          status: 'queued',
          estimatedSeconds: 30,
          message: 'Recreation started',
        };

        expect(response.recreationId).toBe('rec-123');
        expect(response.status).toBe('queued');
      });
    });
  });

  describe('RecreationStatus Type', () => {
    describe('Property Tests', () => {
      it('progressPercent should be between 0 and 100', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 100 }),
            (progress) => {
              const status: RecreationStatus = {
                recreationId: 'rec-123',
                jobId: 'job-123',
                status: 'processing',
                progressPercent: progress,
              };
              return status.progressPercent >= 0 && status.progressPercent <= 100;
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should allow completed status with result URLs', () => {
        const status: RecreationStatus = {
          recreationId: 'rec-123',
          jobId: 'job-123',
          status: 'completed',
          progressPercent: 100,
          generatedThumbnailUrl: 'https://storage.example.com/result.png',
          downloadUrl: 'https://storage.example.com/result.png',
          assetId: 'asset-123',
        };

        expect(status.status).toBe('completed');
        expect(status.generatedThumbnailUrl).toBeDefined();
        expect(status.assetId).toBeDefined();
      });

      it('should allow failed status with error message', () => {
        const status: RecreationStatus = {
          recreationId: 'rec-123',
          jobId: 'job-123',
          status: 'failed',
          progressPercent: 50,
          errorMessage: 'Generation failed due to invalid face image',
        };

        expect(status.status).toBe('failed');
        expect(status.errorMessage).toBeDefined();
      });
    });
  });

  describe('FaceAsset Type', () => {
    describe('Unit Tests', () => {
      it('should allow creating a valid FaceAsset', () => {
        const face: FaceAsset = {
          id: 'face-123',
          displayName: 'My Face',
          originalUrl: 'https://storage.example.com/face.png',
          processedUrl: 'https://storage.example.com/face-processed.png',
          isPrimary: true,
          createdAt: '2026-01-01T12:00:00Z',
        };

        expect(face.id).toBe('face-123');
        expect(face.isPrimary).toBe(true);
      });

      it('should allow optional displayName and processedUrl', () => {
        const face: FaceAsset = {
          id: 'face-123',
          originalUrl: 'https://storage.example.com/face.png',
          isPrimary: false,
          createdAt: '2026-01-01T12:00:00Z',
        };

        expect(face.displayName).toBeUndefined();
        expect(face.processedUrl).toBeUndefined();
      });
    });
  });

  describe('RecreationHistory Type', () => {
    describe('Unit Tests', () => {
      it('should allow creating a valid RecreationHistory', () => {
        const history: RecreationHistory = {
          recreations: [
            {
              id: 'rec-1',
              referenceVideoId: 'vid1',
              referenceThumbnailUrl: 'https://example.com/1.jpg',
              generatedThumbnailUrl: 'https://example.com/gen1.jpg',
              status: 'completed',
              createdAt: '2026-01-01T12:00:00Z',
            },
            {
              id: 'rec-2',
              referenceVideoId: 'vid2',
              referenceThumbnailUrl: 'https://example.com/2.jpg',
              customText: 'Custom',
              status: 'queued',
              createdAt: '2026-01-01T11:00:00Z',
            },
          ],
          total: 2,
        };

        expect(history.total).toBe(2);
        expect(history.recreations).toHaveLength(2);
        expect(history.recreations[0].generatedThumbnailUrl).toBeDefined();
        expect(history.recreations[1].customText).toBe('Custom');
      });
    });
  });

  describe('UploadFaceRequest Type', () => {
    describe('Unit Tests', () => {
      it('should allow creating a valid UploadFaceRequest', () => {
        const request: UploadFaceRequest = {
          imageBase64: 'iVBORw0KGgo...',
          displayName: 'My Face',
          setAsPrimary: true,
        };

        expect(request.imageBase64).toBeDefined();
        expect(request.setAsPrimary).toBe(true);
      });

      it('should allow optional fields', () => {
        const request: UploadFaceRequest = {
          imageBase64: 'iVBORw0KGgo...',
        };

        expect(request.displayName).toBeUndefined();
        expect(request.setAsPrimary).toBeUndefined();
      });
    });
  });

  describe('UploadFaceResponse Type', () => {
    describe('Unit Tests', () => {
      it('should allow creating a valid UploadFaceResponse', () => {
        const response: UploadFaceResponse = {
          face: {
            id: 'face-123',
            displayName: 'My Face',
            originalUrl: 'https://storage.example.com/face.png',
            isPrimary: true,
            createdAt: '2026-01-01T12:00:00Z',
          },
          message: 'Face uploaded successfully',
        };

        expect(response.face.id).toBe('face-123');
        expect(response.message).toBe('Face uploaded successfully');
      });
    });
  });
});
