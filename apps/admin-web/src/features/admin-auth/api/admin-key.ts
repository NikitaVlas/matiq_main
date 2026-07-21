export const adminKeyStorage = {
  get: () =>
    typeof window === 'undefined' ? '' : (window.localStorage.getItem('matiq_admin_key') ?? ''),
  set: (key: string) => window.localStorage.setItem('matiq_admin_key', key),
};
