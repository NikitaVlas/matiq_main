import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

function cookieValue(header: string | undefined, name: string) {
  return header
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === name)?.[1];
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(@Inject(AdminDatabaseService) private readonly db: AdminDatabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined>; adminUserId?: string }>();
    const token = cookieValue(
      request.headers.cookie,
      process.env.SESSION_COOKIE_NAME ?? 'matiq_session',
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
      session.user.role !== 'ADMIN' ||
      !session.user.mfaSecretEncrypted ||
      !session.user.mfaEnabledAt
    ) {
      throw new UnauthorizedException();
    }
    request.adminUserId = session.userId;
    return true;
  }
}
