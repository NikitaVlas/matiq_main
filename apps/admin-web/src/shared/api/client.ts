export const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? 'http://localhost:4001';
export const userApiUrl = process.env.NEXT_PUBLIC_USER_API_URL ?? 'http://localhost:4000';
export const adminApi = (path: string, init?: RequestInit) =>
  fetch(`${adminApiUrl}${path}`, { credentials: 'include', ...init });
