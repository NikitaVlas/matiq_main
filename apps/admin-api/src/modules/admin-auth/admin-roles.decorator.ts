import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ADMIN_ROLES_KEY = 'adminRoles';
export const AdminRoles = (...roles: Extract<UserRole, 'ADMIN' | 'EDITOR'>[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
