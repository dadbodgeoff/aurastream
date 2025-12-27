import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import {
  FormStatusProvider,
  useFormStatusPolyfill,
  useFormStatusActions,
} from '../hooks/useFormStatusPolyfill';

describe('useFormStatusPolyfill', () => {
  it('returns default status initially', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStatusProvider>{children}</FormStatusProvider>
    );
    
    const { result } = renderHook(() => useFormStatusPolyfill(), { wrapper });

    expect(result.current).toEqual({
      pending: false,
      data: null,
      method: null,
      action: null,
    });
  });

  it('updates status when submission starts', () => {
    // Create a combined hook to test both in the same context
    const useCombined = () => ({
      status: useFormStatusPolyfill(),
      actions: useFormStatusActions(),
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStatusProvider>{children}</FormStatusProvider>
    );

    const { result } = renderHook(() => useCombined(), { wrapper });

    act(() => {
      result.current.actions.startSubmission(undefined, 'POST', '/api/submit');
    });

    expect(result.current.status.pending).toBe(true);
    expect(result.current.status.method).toBe('POST');
    expect(result.current.status.action).toBe('/api/submit');
  });

  it('resets status when submission ends', () => {
    // Create a combined hook to test both in the same context
    const useCombined = () => ({
      status: useFormStatusPolyfill(),
      actions: useFormStatusActions(),
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormStatusProvider>{children}</FormStatusProvider>
    );

    const { result } = renderHook(() => useCombined(), { wrapper });

    act(() => {
      result.current.actions.startSubmission();
    });

    expect(result.current.status.pending).toBe(true);

    act(() => {
      result.current.actions.endSubmission();
    });

    expect(result.current.status.pending).toBe(false);
  });
});
