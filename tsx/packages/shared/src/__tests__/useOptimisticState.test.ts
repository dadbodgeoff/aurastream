import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticState } from '../hooks/useOptimisticState';

describe('useOptimisticState', () => {
  it('returns passthrough state initially', () => {
    const items = [{ id: 1, name: 'Item 1' }];
    const { result } = renderHook(() =>
      useOptimisticState(items, (state, newItem: { id: number; name: string }) => [...state, newItem])
    );

    expect(result.current[0]).toEqual(items);
    expect(result.current[2]).toBe(false); // isPending
  });

  it('applies optimistic update immediately', () => {
    const items = [{ id: 1, name: 'Item 1' }];
    const { result } = renderHook(() =>
      useOptimisticState(
        items,
        (state, newItem: { id: number; name: string; pending?: boolean }) => [
          ...state,
          { ...newItem, pending: true },
        ]
      )
    );

    act(() => {
      result.current[1]({ id: 2, name: 'Item 2' });
    });

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0][1]).toEqual({ id: 2, name: 'Item 2', pending: true });
  });

  it('updates when passthrough changes', () => {
    const initialItems = [{ id: 1, name: 'Item 1' }];
    const { result, rerender } = renderHook(
      ({ items }) =>
        useOptimisticState(items, (state, newItem: { id: number; name: string }) => [...state, newItem]),
      { initialProps: { items: initialItems } }
    );

    const newItems = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
    rerender({ items: newItems });

    expect(result.current[0]).toEqual(newItems);
  });
});
