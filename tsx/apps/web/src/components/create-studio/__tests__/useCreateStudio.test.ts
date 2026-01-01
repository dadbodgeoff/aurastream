/**
 * useCreateStudio Hook Tests
 * 
 * Unit tests for the Create Studio state management hook.
 * Tests mode switching, URL sync, generation state, and actions.
 * 
 * @module create-studio/__tests__/useCreateStudio
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateStudio } from '../useCreateStudio';
import type { CreationMode } from '../types';

// =============================================================================
// Mocks
// =============================================================================

// Mock Next.js navigation
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('useCreateStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('tab');
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      expect(result.current.state).toEqual({
        activeMode: 'templates',
        showPreview: false,
        assetType: null,
        brandKitId: null,
        currentPrompt: null,
        isGenerating: false,
        jobId: null,
        error: null,
      });
    });

    it('should use initialMode when provided', () => {
      const { result } = renderHook(() => 
        useCreateStudio({ initialMode: 'coach' })
      );
      
      expect(result.current.state.activeMode).toBe('coach');
    });

    it('should use URL tab param when no initialMode', () => {
      mockSearchParams.set('tab', 'custom');
      
      const { result } = renderHook(() => useCreateStudio());
      
      expect(result.current.state.activeMode).toBe('custom');
    });

    it('should prefer initialMode over URL param', () => {
      mockSearchParams.set('tab', 'custom');
      
      const { result } = renderHook(() => 
        useCreateStudio({ initialMode: 'coach' })
      );
      
      expect(result.current.state.activeMode).toBe('coach');
    });

    it('should default to templates for invalid URL param', () => {
      mockSearchParams.set('tab', 'invalid');
      
      const { result } = renderHook(() => useCreateStudio());
      
      expect(result.current.state.activeMode).toBe('templates');
    });
  });

  describe('setMode Action', () => {
    it('should update activeMode', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      act(() => {
        result.current.actions.setMode('coach');
      });
      
      expect(result.current.state.activeMode).toBe('coach');
    });

    it('should clear error when switching modes', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      // Set an error first
      act(() => {
        result.current.actions.setError('Some error');
      });
      
      expect(result.current.state.error).toBe('Some error');
      
      // Switch mode
      act(() => {
        result.current.actions.setMode('custom');
      });
      
      expect(result.current.state.error).toBeNull();
    });

    it('should sync to URL when syncToUrl is true', () => {
      const { result } = renderHook(() => 
        useCreateStudio({ syncToUrl: true })
      );
      
      act(() => {
        result.current.actions.setMode('coach');
      });
      
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('tab=coach'),
        { scroll: false }
      );
    });

    it('should not sync to URL when syncToUrl is false', () => {
      const { result } = renderHook(() => 
        useCreateStudio({ syncToUrl: false })
      );
      
      act(() => {
        result.current.actions.setMode('coach');
      });
      
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should handle all valid modes', () => {
      const modes: CreationMode[] = ['templates', 'custom', 'coach'];
      const { result } = renderHook(() => useCreateStudio());
      
      modes.forEach((mode) => {
        act(() => {
          result.current.actions.setMode(mode);
        });
        
        expect(result.current.state.activeMode).toBe(mode);
      });
    });
  });

  describe('togglePreview Action', () => {
    it('should toggle showPreview from false to true', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      expect(result.current.state.showPreview).toBe(false);
      
      act(() => {
        result.current.actions.togglePreview();
      });
      
      expect(result.current.state.showPreview).toBe(true);
    });

    it('should toggle showPreview from true to false', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      // Toggle on
      act(() => {
        result.current.actions.togglePreview();
      });
      
      expect(result.current.state.showPreview).toBe(true);
      
      // Toggle off
      act(() => {
        result.current.actions.togglePreview();
      });
      
      expect(result.current.state.showPreview).toBe(false);
    });
  });

  describe('setAssetType Action', () => {
    it('should update assetType', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      act(() => {
        result.current.actions.setAssetType('twitch_emote');
      });
      
      expect(result.current.state.assetType).toBe('twitch_emote');
    });

    it('should handle different asset types', () => {
      const assetTypes = [
        'twitch_emote',
        'youtube_thumbnail',
        'twitch_banner',
        'overlay',
      ];
      const { result } = renderHook(() => useCreateStudio());
      
      assetTypes.forEach((type) => {
        act(() => {
          result.current.actions.setAssetType(type);
        });
        
        expect(result.current.state.assetType).toBe(type);
      });
    });
  });

  describe('setBrandKitId Action', () => {
    it('should update brandKitId', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      act(() => {
        result.current.actions.setBrandKitId('brand-123');
      });
      
      expect(result.current.state.brandKitId).toBe('brand-123');
    });

    it('should handle null brandKitId', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      // Set a value first
      act(() => {
        result.current.actions.setBrandKitId('brand-123');
      });
      
      // Clear it
      act(() => {
        result.current.actions.setBrandKitId(null);
      });
      
      expect(result.current.state.brandKitId).toBeNull();
    });
  });

  describe('setPrompt Action', () => {
    it('should update currentPrompt', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      act(() => {
        result.current.actions.setPrompt('A cute cat emote');
      });
      
      expect(result.current.state.currentPrompt).toBe('A cute cat emote');
    });

    it('should handle empty prompt', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      act(() => {
        result.current.actions.setPrompt('');
      });
      
      expect(result.current.state.currentPrompt).toBe('');
    });

    it('should handle long prompts', () => {
      const { result } = renderHook(() => useCreateStudio());
      const longPrompt = 'A '.repeat(500) + 'very long prompt';
      
      act(() => {
        result.current.actions.setPrompt(longPrompt);
      });
      
      expect(result.current.state.currentPrompt).toBe(longPrompt);
    });
  });

  describe('Generation Actions', () => {
    describe('startGeneration', () => {
      it('should set isGenerating to true', () => {
        const { result } = renderHook(() => useCreateStudio());
        
        act(() => {
          result.current.actions.startGeneration('job-123');
        });
        
        expect(result.current.state.isGenerating).toBe(true);
      });

      it('should set jobId', () => {
        const { result } = renderHook(() => useCreateStudio());
        
        act(() => {
          result.current.actions.startGeneration('job-123');
        });
        
        expect(result.current.state.jobId).toBe('job-123');
      });

      it('should clear error', () => {
        const { result } = renderHook(() => useCreateStudio());
        
        // Set error first
        act(() => {
          result.current.actions.setError('Previous error');
        });
        
        act(() => {
          result.current.actions.startGeneration('job-123');
        });
        
        expect(result.current.state.error).toBeNull();
      });
    });

    describe('completeGeneration', () => {
      it('should set isGenerating to false', () => {
        const { result } = renderHook(() => useCreateStudio());
        
        // Start generation first
        act(() => {
          result.current.actions.startGeneration('job-123');
        });
        
        act(() => {
          result.current.actions.completeGeneration();
        });
        
        expect(result.current.state.isGenerating).toBe(false);
      });

      it('should clear jobId', () => {
        const { result } = renderHook(() => useCreateStudio());
        
        // Start generation first
        act(() => {
          result.current.actions.startGeneration('job-123');
        });
        
        act(() => {
          result.current.actions.completeGeneration();
        });
        
        expect(result.current.state.jobId).toBeNull();
      });
    });
  });

  describe('setError Action', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      act(() => {
        result.current.actions.setError('Generation failed');
      });
      
      expect(result.current.state.error).toBe('Generation failed');
    });

    it('should set isGenerating to false', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      // Start generation first
      act(() => {
        result.current.actions.startGeneration('job-123');
      });
      
      act(() => {
        result.current.actions.setError('Generation failed');
      });
      
      expect(result.current.state.isGenerating).toBe(false);
    });

    it('should handle null error (clearing)', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      // Set error first
      act(() => {
        result.current.actions.setError('Some error');
      });
      
      // Clear it
      act(() => {
        result.current.actions.setError(null);
      });
      
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('reset Action', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      // Modify state
      act(() => {
        result.current.actions.setMode('coach');
        result.current.actions.setAssetType('twitch_emote');
        result.current.actions.setBrandKitId('brand-123');
        result.current.actions.setPrompt('Test prompt');
        result.current.actions.startGeneration('job-123');
      });
      
      // Reset
      act(() => {
        result.current.actions.reset();
      });
      
      expect(result.current.state).toEqual({
        activeMode: 'templates',
        showPreview: false,
        assetType: null,
        brandKitId: null,
        currentPrompt: null,
        isGenerating: false,
        jobId: null,
        error: null,
      });
    });
  });

  describe('Actions Memoization', () => {
    it('should return actions object with all required methods', () => {
      const { result } = renderHook(() => useCreateStudio());
      
      const actions = result.current.actions;
      
      // Verify all action methods exist
      expect(typeof actions.setMode).toBe('function');
      expect(typeof actions.togglePreview).toBe('function');
      expect(typeof actions.setAssetType).toBe('function');
      expect(typeof actions.setBrandKitId).toBe('function');
      expect(typeof actions.setPrompt).toBe('function');
      expect(typeof actions.startGeneration).toBe('function');
      expect(typeof actions.completeGeneration).toBe('function');
      expect(typeof actions.setError).toBe('function');
      expect(typeof actions.reset).toBe('function');
    });

    it('should have consistent action behavior across rerenders', () => {
      const { result, rerender } = renderHook(() => useCreateStudio());
      
      // Use action before rerender
      act(() => {
        result.current.actions.setMode('coach');
      });
      
      expect(result.current.state.activeMode).toBe('coach');
      
      rerender();
      
      // Action should still work after rerender
      act(() => {
        result.current.actions.setMode('custom');
      });
      
      expect(result.current.state.activeMode).toBe('custom');
    });
  });

  describe('URL Tab Mapping', () => {
    it('should map "templates" URL param to templates mode', () => {
      mockSearchParams.set('tab', 'templates');
      
      const { result } = renderHook(() => useCreateStudio());
      
      expect(result.current.state.activeMode).toBe('templates');
    });

    it('should map "custom" URL param to custom mode', () => {
      mockSearchParams.set('tab', 'custom');
      
      const { result } = renderHook(() => useCreateStudio());
      
      expect(result.current.state.activeMode).toBe('custom');
    });

    it('should map "coach" URL param to coach mode', () => {
      mockSearchParams.set('tab', 'coach');
      
      const { result } = renderHook(() => useCreateStudio());
      
      expect(result.current.state.activeMode).toBe('coach');
    });
  });
});
