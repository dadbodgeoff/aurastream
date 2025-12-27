/**
 * useFormStatusPolyfill - React 19 pattern polyfill
 * 
 * Tracks form submission status without prop drilling.
 * In React 19, this is useFormStatus from 'react-dom'.
 * 
 * @example
 * function SubmitButton() {
 *   const { pending } = useFormStatusPolyfill();
 *   return <button disabled={pending}>Submit</button>;
 * }
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface FormStatus {
  pending: boolean;
  data: FormData | null;
  method: string | null;
  action: string | null;
}

const defaultStatus: FormStatus = {
  pending: false,
  data: null,
  method: null,
  action: null,
};

const FormStatusContext = createContext<{
  status: FormStatus;
  setStatus: (status: Partial<FormStatus>) => void;
  resetStatus: () => void;
}>({
  status: defaultStatus,
  setStatus: () => {},
  resetStatus: () => {},
});

export interface FormStatusProviderProps {
  children: ReactNode;
}

export function FormStatusProvider({ children }: FormStatusProviderProps): JSX.Element {
  const [status, setStatusState] = useState<FormStatus>(defaultStatus);

  const setStatus = useCallback((partial: Partial<FormStatus>) => {
    setStatusState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetStatus = useCallback(() => {
    setStatusState(defaultStatus);
  }, []);

  return (
    <FormStatusContext.Provider value={{ status, setStatus, resetStatus }}>
      {children}
    </FormStatusContext.Provider>
  );
}

export function useFormStatusPolyfill(): FormStatus {
  const { status } = useContext(FormStatusContext);
  return status;
}

export function useFormStatusActions() {
  const { setStatus, resetStatus } = useContext(FormStatusContext);
  
  const startSubmission = useCallback((data?: FormData, method?: string, action?: string) => {
    setStatus({
      pending: true,
      data: data ?? null,
      method: method ?? 'POST',
      action: action ?? null,
    });
  }, [setStatus]);

  const endSubmission = useCallback(() => {
    resetStatus();
  }, [resetStatus]);

  return { startSubmission, endSubmission };
}
