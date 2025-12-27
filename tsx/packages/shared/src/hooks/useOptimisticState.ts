/**
 * useOptimisticState - React 19 pattern polyfill
 * 
 * Provides optimistic state updates that show immediately in the UI
 * while an async operation is pending, then reconcile with actual result.
 * 
 * @example
 * const [optimisticItems, addOptimistic] = useOptimisticState(
 *   items,
 *   (currentItems, newItem) => [...currentItems, { ...newItem, pending: true }]
 * );
 */

import { useState, useCallback, useTransition } from 'react';

export interface OptimisticAction<T, P> {
  (currentState: T, payload: P): T;
}

export function useOptimisticState<T, P>(
  passthrough: T,
  reducer: OptimisticAction<T, P>
): [T, (payload: P) => void, boolean] {
  const [optimisticState, setOptimisticState] = useState<T | null>(null);
  const [isPending, startTransition] = useTransition();

  const addOptimistic = useCallback(
    (payload: P) => {
      startTransition(() => {
        setOptimisticState((current) => {
          const base = current ?? passthrough;
          return reducer(base, payload);
        });
      });
    },
    [passthrough, reducer]
  );

  // Reset optimistic state when passthrough changes (server confirmed)
  const displayState = optimisticState ?? passthrough;

  return [displayState, addOptimistic, isPending];
}
