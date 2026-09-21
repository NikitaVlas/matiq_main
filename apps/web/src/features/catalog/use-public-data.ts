'use client';
import { useEffect, useState } from 'react';
import type { UserApiPath } from '@matiq/contracts';
import { userApiResponse } from '../../shared/api/client';
export function usePublicData<T>(
  path: UserApiPath,
  query = '',
  shape: 'array' | 'page' | 'facets' = 'array',
) {
  const [result, setResult] = useState<{ key: string; data?: T; error: boolean }>();
  const [attempt, setAttempt] = useState(0);
  const key = `${path}?${query}#${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timer = setTimeout(() => controller.abort(), 10000);
    void userApiResponse(path, { signal: controller.signal }, query)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json();
        const valid =
          shape === 'array'
            ? Array.isArray(result)
            : shape === 'page'
              ? result &&
                Array.isArray(result.items) &&
                Number.isInteger(result.total) &&
                result.total >= 0 &&
                Number.isInteger(result.page) &&
                result.page > 0 &&
                Number.isInteger(result.limit) &&
                result.limit > 0
              : result &&
                [
                  'disciplines',
                  'trainer',
                  'gameAreas',
                  'positions',
                  'skillGroups',
                  'techniques',
                  'movements',
                  'drills',
                ].every((field) => Array.isArray(result[field]));
        if (!valid) throw new Error();
        if (!disposed) setResult({ key, data: result as T, error: false });
      })
      .catch(() => {
        if (!disposed) setResult({ key, error: true });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [path, query, shape, key]);
  return {
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key && result.error,
    retry: () => setAttempt((x) => x + 1),
  };
}
