/**
 * Thumbnail Recreation Hooks Tests
 * 
 * Unit and property tests for thumbnail recreation React Query hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  thumbnailRecreateKeys,
  useRecreateThumbnail,
  useRecreationStatus,
  useRecreationHistory,
  useFaceAssets,
  useUploadFace,
  useDeleteFace,
} from '../useThumbnailRecreate';
import type { ThumbnailAnalysis } from '../../types/thumbnailIntel';

// =============================================================================
// Test Setup
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock apiClient
vi.mock('../../client', () => ({
  apiClient: {
    getAccessToken: () => 'mock-token',
  },
}));

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// Mock analysis data
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

// =============================================================================
// Tests
// =============================================================================

describe('useThumbnailRecreate Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Query Keys', () => {
    describe('Unit Tests', () => {
      it('should have correct base key', () => {
        expect(thumbnailRecreateKeys.all).toEqual(['thumbnailRecreate']);
      });

      it('should generate correct status key', () => {
        expect(thumbnailRecreateKeys.status('rec-123')).toEqual([
          'thumbnailRecreate',
          'status',
          'rec-123',
        ]);
      });

      it('should generate correct history key', () => {
        expect(thumbnailRecreateKeys.history()).toEqual([
          'thumbnailRecreate',
          'history',
        ]);
      });

      it('should generate correct faces key', () => {
        expect(thumbnailRecreateKeys.faces()).toEqual([
          'thumbnailRecreate',
          'faces',
        ]);
      });
    });

    describe('Property Tests', () => {
      it('status key should always include the recreation ID', () => {
        fc.assert(
          fc.property(fc.uuid(), (id) => {
            const key = thumbnailRecreateKeys.status(id);
            return key.includes(id) && key[0] === 'thumbnailRecreate';
          })
        );
      });
    });
  });

  describe('Transform Functions', () => {
    describe('Unit Tests', () => {
      it('should transform RecreateResponse from snake_case to camelCase', async () => {
        const mockResponse = {
          recreation_id: 'rec-123',
          job_id: 'job-123',
          status: 'queued',
          estimated_seconds: 30,
          message: 'Recreation started',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const { result } = renderHook(() => useRecreateThumbnail(), {
          wrapper: createWrapper(),
        });

        result.current.mutate({
          videoId: 'test123',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          analysis: mockAnalysis,
          faceImageBase64: 'base64data',
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual({
          recreationId: 'rec-123',
          jobId: 'job-123',
          status: 'queued',
          estimatedSeconds: 30,
          message: 'Recreation started',
        });
      });

      it('should transform RecreationStatus from snake_case to camelCase', async () => {
        const mockResponse = {
          recreation_id: 'rec-123',
          job_id: 'job-123',
          status: 'completed',
          progress_percent: 100,
          generated_thumbnail_url: 'https://storage.example.com/result.png',
          download_url: 'https://storage.example.com/result.png',
          asset_id: 'asset-123',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const { result } = renderHook(
          () => useRecreationStatus('rec-123', { enabled: true }),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual({
          recreationId: 'rec-123',
          jobId: 'job-123',
          status: 'completed',
          progressPercent: 100,
          generatedThumbnailUrl: 'https://storage.example.com/result.png',
          downloadUrl: 'https://storage.example.com/result.png',
          assetId: 'asset-123',
        });
      });

      it('should transform FaceAsset from snake_case to camelCase', async () => {
        const mockResponse = {
          faces: [
            {
              id: 'face-123',
              display_name: 'My Face',
              original_url: 'https://storage.example.com/face.png',
              processed_url: null,
              is_primary: true,
              created_at: '2026-01-01T12:00:00Z',
            },
          ],
          total: 1,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const { result } = renderHook(() => useFaceAssets(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.faces[0]).toEqual({
          id: 'face-123',
          displayName: 'My Face',
          originalUrl: 'https://storage.example.com/face.png',
          processedUrl: null,
          isPrimary: true,
          createdAt: '2026-01-01T12:00:00Z',
        });
      });

      it('should transform history items from snake_case to camelCase', async () => {
        const mockResponse = {
          recreations: [
            {
              id: 'rec-1',
              reference_video_id: 'vid1',
              reference_thumbnail_url: 'https://example.com/1.jpg',
              generated_thumbnail_url: 'https://example.com/gen1.jpg',
              custom_text: null,
              status: 'completed',
              created_at: '2026-01-01T12:00:00Z',
            },
          ],
          total: 1,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const { result } = renderHook(() => useRecreationHistory(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.recreations[0]).toEqual({
          id: 'rec-1',
          referenceVideoId: 'vid1',
          referenceThumbnailUrl: 'https://example.com/1.jpg',
          generatedThumbnailUrl: 'https://example.com/gen1.jpg',
          customText: null,
          status: 'completed',
          createdAt: '2026-01-01T12:00:00Z',
        });
      });
    });
  });

  describe('useRecreateThumbnail', () => {
    describe('Unit Tests', () => {
      it('should send correct request body with snake_case', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            recreation_id: 'rec-123',
            job_id: 'job-123',
            status: 'queued',
            estimated_seconds: 30,
            message: 'Started',
          }),
        });

        const { result } = renderHook(() => useRecreateThumbnail(), {
          wrapper: createWrapper(),
        });

        result.current.mutate({
          videoId: 'test123',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          analysis: mockAnalysis,
          faceImageBase64: 'base64data',
          customText: 'Custom',
          useBrandColors: true,
          brandKitId: 'brand-123',
        });

        await waitFor(() => expect(mockFetch).toHaveBeenCalled());

        const [url, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);

        expect(body.video_id).toBe('test123');
        expect(body.thumbnail_url).toBe('https://example.com/thumb.jpg');
        expect(body.face_image_base64).toBe('base64data');
        expect(body.custom_text).toBe('Custom');
        expect(body.use_brand_colors).toBe(true);
        expect(body.brand_kit_id).toBe('brand-123');
        expect(body.analysis.video_id).toBe('test123');
        expect(body.analysis.layout_type).toBe('face-left-text-right');
      });

      it('should handle error response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: 'Face image required' }),
        });

        const { result } = renderHook(() => useRecreateThumbnail(), {
          wrapper: createWrapper(),
        });

        result.current.mutate({
          videoId: 'test123',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          analysis: mockAnalysis,
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe('Face image required');
      });
    });
  });

  describe('useRecreationStatus', () => {
    describe('Unit Tests', () => {
      it('should not fetch when disabled', () => {
        renderHook(
          () => useRecreationStatus('rec-123', { enabled: false }),
          { wrapper: createWrapper() }
        );

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should not fetch when recreationId is empty', () => {
        renderHook(
          () => useRecreationStatus(''),
          { wrapper: createWrapper() }
        );

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('useUploadFace', () => {
    describe('Unit Tests', () => {
      it('should send correct request body', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            face: {
              id: 'face-123',
              display_name: 'My Face',
              original_url: 'https://storage.example.com/face.png',
              processed_url: null,
              is_primary: true,
              created_at: '2026-01-01T12:00:00Z',
            },
            message: 'Face uploaded successfully',
          }),
        });

        const { result } = renderHook(() => useUploadFace(), {
          wrapper: createWrapper(),
        });

        result.current.mutate({
          imageBase64: 'base64data',
          displayName: 'My Face',
          setAsPrimary: true,
        });

        await waitFor(() => expect(mockFetch).toHaveBeenCalled());

        const [url, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);

        expect(body.image_base64).toBe('base64data');
        expect(body.display_name).toBe('My Face');
        expect(body.set_as_primary).toBe(true);
      });
    });
  });

  describe('useDeleteFace', () => {
    describe('Unit Tests', () => {
      it('should call DELETE endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

        const { result } = renderHook(() => useDeleteFace(), {
          wrapper: createWrapper(),
        });

        result.current.mutate('face-123');

        await waitFor(() => expect(mockFetch).toHaveBeenCalled());

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('/thumbnails/faces/face-123');
        expect(options.method).toBe('DELETE');
      });
    });
  });
});
