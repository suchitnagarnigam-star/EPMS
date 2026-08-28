import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic data-fetching hook.
 *
 * @param fetchFn  – Async function that returns the data.
 * @param deps     – Dependency array; re-fetches when any dep changes.
 *
 * Usage:
 *   const { data, loading, error } = useApi(() => fetchKpis(branch), [branch]);
 */
export function useApi<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
): UseApiState<T> {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Track current request to avoid race conditions
  const seqRef = useRef(0);

  const execute = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      // Only update if this is still the latest request
      if (seq === seqRef.current) {
        setData(result);
      }
    } catch (err) {
      if (seq === seqRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (seq === seqRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
