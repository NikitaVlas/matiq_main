import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    if (
      !process.env.ADMIN_API_KEY ||
      request.headers['x-admin-key'] !== process.env.ADMIN_API_KEY
    ) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
