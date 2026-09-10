'use client';
import { useEffect, useState } from 'react';
import type { UserApiPath } from '@matiq/contracts';
import { userApiResponse } from '../../shared/api/client';
export function usePublicData<T>(path: UserApiPath) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timer = setTimeout(() => controller.abort(), 10000);
    setError(false);
    void userApiResponse(path, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!Array.isArray(result)) throw new Error();
        if (!disposed) setData(result as T);
      })
      .catch(() => {
        if (!disposed) setError(true);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [path, attempt]);
  return { data, error, retry: () => setAttempt((x) => x + 1) };
}
