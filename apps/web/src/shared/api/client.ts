import type { UserApiPath } from '@matiq/contracts';

export const userApiUrl = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export function userApiResponse(path: UserApiPath, init?: RequestInit): Promise<Response> {
  return fetch(`${userApiUrl}${path}`, { credentials: 'include', ...init });
}

export async function userApi<T>(path: UserApiPath, init?: RequestInit): Promise<T> {
  const response = await userApiResponse(path, init);
  if (!response.ok) throw new Error(`USER_API_${response.status}`);
  return response.json() as Promise<T>;
}
