import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'matiq_session';
    const token = request.cookies?.[cookieName] as string | undefined;
    const user = await this.auth.userForToken(token);
    request.userId = user.id;
    return true;
  }
}
