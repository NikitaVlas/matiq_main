export const userApiUrl = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';

export async function userApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${userApiUrl}${path}`, { credentials: 'include', ...init });
  if (!response.ok) throw new Error(`USER_API_${response.status}`);
  return response.json() as Promise<T>;
}
