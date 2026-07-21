export const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? 'http://localhost:4001';
export const adminApi = (path: string, key: string, init?: RequestInit) =>
  fetch(`${adminApiUrl}${path}`, { ...init, headers: { ...init?.headers, 'x-admin-key': key } });
