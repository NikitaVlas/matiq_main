import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { ADMIN_ROLES_KEY } from './admin-roles.decorator';

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

function cookieValue(header: string | undefined, name: string) {
  return header
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === name)?.[1];
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    @Inject(AdminDatabaseService) private readonly db: AdminDatabaseService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      adminUserId?: string;
      reauthenticatedAt?: Date | null;
    }>();
    const token = cookieValue(
      request.headers.cookie,
      process.env.ADMIN_SESSION_COOKIE_NAME ?? 'matiq_admin_session',
    );
    if (!token) throw new UnauthorizedException();
    const session = await this.db.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: true },
    });
    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.user.deletedAt ||
      !session.user.emailVerifiedAt ||
      (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR') ||
      !session.user.mfaSecretEncrypted ||
      !session.user.mfaEnabledAt
    ) {
      throw new UnauthorizedException();
    }
    const permittedRoles = this.reflector.getAllAndOverride<UserRole[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? ['ADMIN'];
    if (!permittedRoles.includes(session.user.role)) throw new UnauthorizedException();
    request.adminUserId = session.userId;
    request.reauthenticatedAt = session.reauthenticatedAt;
    return true;
  }
}
