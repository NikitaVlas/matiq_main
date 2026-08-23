import type { paths as AdminApiPaths } from './generated/admin-api.js';
import type { paths as UserApiPaths } from './generated/user-api.js';

type RuntimePath<Path extends string> = Path extends `${infer Prefix}{${string}}${infer Suffix}`
  ? `${Prefix}${string}${RuntimePath<Suffix>}`
  : Path;

export type UserApiPath = RuntimePath<keyof UserApiPaths & string>;
export type AdminApiPath = RuntimePath<keyof AdminApiPaths & string>;
