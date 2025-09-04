import { useState, useCallback } from 'react';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T>(
  apiFunction: (...args: unknown[]) => Promise<ApiResponse<T>>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      
      try {
        const response = await apiFunction(...args);
        
        if (response.success && response.data) {
          setState({ data: response.data, loading: false, error: null });
          return response.data;
        } else {
          setState({ 
            data: null, 
            loading: false, 
            error: response.error || 'An error occurred' 
          });
          return null;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState({ data: null, loading: false, error: errorMessage });
        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}