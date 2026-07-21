import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../infrastructure/auth.guard';
import { EmailDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from '../dto/auth.dto';
import { AuthService } from '../application/auth.service';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('verify-email')
  async verify(@Body() dto: VerifyEmailDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.verifyEmail(dto.token);
    response.cookie(process.env.SESSION_COOKIE_NAME ?? 'matiq_session', result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { verified: true };
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: EmailDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto.email, dto.password);
    this.setSessionCookie(response, result.sessionToken);
    return { authenticated: true };
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: EmailDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Post('logout')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.cookies?.[this.cookieName()]);
    response.clearCookie(this.cookieName());
    return { loggedOut: true };
  }

  @UseGuards(AuthGuard)
  @Post('logout-all')
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logoutAll(request.userId);
    response.clearCookie(this.cookieName());
    return { loggedOut: true };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    const user = await this.auth.userForToken(
      request.cookies?.[process.env.SESSION_COOKIE_NAME ?? 'matiq_session'],
    );
    return {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      athleteProfileCompleted: Boolean(user.athleteProfile?.completedAt),
    };
  }

  private cookieName() {
    return process.env.SESSION_COOKIE_NAME ?? 'matiq_session';
  }

  private setSessionCookie(response: Response, token: string) {
    response.cookie(this.cookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}
