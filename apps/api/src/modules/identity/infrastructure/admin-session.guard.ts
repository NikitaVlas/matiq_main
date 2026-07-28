import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from '../application/auth.service';
import { AuthenticatedRequest } from './auth.guard';

export const adminCookieName = () => process.env.ADMIN_SESSION_COOKIE_NAME ?? 'matiq_admin_session';

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[adminCookieName()] as string | undefined;
    const session = await this.auth.sessionForToken(token);
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.EDITOR) return false;
    request.userId = session.user.id;
    request.sessionId = session.id;
    request.reauthenticatedAt = session.reauthenticatedAt;
    request.userRole = session.user.role;
    return true;
  }
}

@Injectable()
export class ContentSessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const adminToken = request.cookies?.[adminCookieName()] as string | undefined;
    const athleteCookieName = process.env.SESSION_COOKIE_NAME ?? 'matiq_session';
    const athleteToken = request.cookies?.[athleteCookieName] as string | undefined;
    let session;
    try {
      session = await this.auth.sessionForToken(adminToken);
    } catch {
      session = await this.auth.sessionForToken(athleteToken);
    }
    request.userId = session.user.id;
    request.sessionId = session.id;
    request.reauthenticatedAt = session.reauthenticatedAt;
    request.userRole = session.user.role;
    return true;
  }
}
