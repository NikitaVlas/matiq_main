import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../application/auth.service';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  userId: string;
  sessionId: string;
  reauthenticatedAt: Date | null;
  userRole?: UserRole;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'matiq_session';
    const token = request.cookies?.[cookieName] as string | undefined;
    const session = await this.auth.sessionForToken(token);
    request.userId = session.user.id;
    request.sessionId = session.id;
    request.reauthenticatedAt = session.reauthenticatedAt;
    request.userRole = session.user.role;
    return true;
  }
}
