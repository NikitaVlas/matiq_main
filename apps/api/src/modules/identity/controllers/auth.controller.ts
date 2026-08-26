import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../infrastructure/auth.guard';
import {
  ChangePasswordDto,
  ConfirmDeletionDto,
  EmailDto,
  LoginDto,
  MfaCodeDto,
  PasswordDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '../dto/auth.dto';
import { AuthService } from '../application/auth.service';
import { AdminSessionGuard, adminCookieName } from '../infrastructure/admin-session.guard';

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
    const result = await this.auth.login(dto.email, dto.password, dto.mfaCode);
    this.setSessionCookie(response, result.sessionToken);
    return {
      authenticated: true,
      mfaSetupRequired: 'mfaSetupRequired' in result && result.mfaSetupRequired,
    };
  }

  @Post('admin-login')
  async adminLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto.email, dto.password, dto.mfaCode);
    const session = await this.auth.sessionForToken(result.sessionToken);
    if (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR') {
      await this.auth.logout(result.sessionToken);
      throw new UnauthorizedException('ADMIN_ACCESS_REQUIRED');
    }
    this.setCookie(response, adminCookieName(), result.sessionToken);
    return {
      authenticated: true,
      mfaSetupRequired: 'mfaSetupRequired' in result && result.mfaSetupRequired,
    };
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
      mfaEnabled: Boolean(user.mfaEnabledAt),
      role: user.role,
    };
  }

  @UseGuards(AuthGuard)
  @Get('sessions')
  sessions(@Req() request: AuthenticatedRequest) {
    return this.auth.sessions(request.userId, request.sessionId);
  }

  @UseGuards(AuthGuard)
  @Delete('sessions/:id')
  revokeSession(@Param('id') sessionId: string, @Req() request: AuthenticatedRequest) {
    return this.auth.revokeSession(request.userId, sessionId);
  }

  @UseGuards(AuthGuard)
  @Post('reauthenticate')
  reauthenticate(@Body() dto: PasswordDto, @Req() request: AuthenticatedRequest) {
    return this.auth.reauthenticate(request.userId, request.sessionId, dto.password);
  }

  @UseGuards(AdminSessionGuard)
  @Post('admin-reauthenticate')
  adminReauthenticate(@Body() dto: PasswordDto, @Req() request: AuthenticatedRequest) {
    return this.auth.reauthenticate(request.userId, request.sessionId, dto.password);
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.changePassword(
      request.userId,
      dto.currentPassword,
      dto.password,
    );
    this.setSessionCookie(response, result.sessionToken);
    return { changed: true };
  }

  @UseGuards(AuthGuard)
  @Get('account/export')
  exportAccount(@Req() request: AuthenticatedRequest) {
    return this.auth.exportAccount(request.userId);
  }

  @UseGuards(AuthGuard)
  @Delete('account')
  async deleteAccount(
    @Body() dto: ConfirmDeletionDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.requestAccountDeletion(
      request.userId,
      request.reauthenticatedAt,
    );
    response.clearCookie(this.cookieName());
    return result;
  }

  @UseGuards(AuthGuard)
  @Post('mfa/setup')
  beginMfaSetup(@Req() request: AuthenticatedRequest) {
    return this.auth.beginMfaSetup(request.userId);
  }

  @UseGuards(AuthGuard)
  @Post('mfa/confirm')
  confirmMfaSetup(@Body() dto: MfaCodeDto, @Req() request: AuthenticatedRequest) {
    return this.auth.confirmMfaSetup(request.userId, dto.code);
  }

  @UseGuards(AdminSessionGuard)
  @Post('admin-mfa/setup')
  beginAdminMfaSetup(@Req() request: AuthenticatedRequest) {
    return this.auth.beginMfaSetup(request.userId);
  }

  @UseGuards(AdminSessionGuard)
  @Post('admin-mfa/confirm')
  confirmAdminMfaSetup(@Body() dto: MfaCodeDto, @Req() request: AuthenticatedRequest) {
    return this.auth.confirmMfaSetup(request.userId, dto.code);
  }

  private cookieName() {
    return process.env.SESSION_COOKIE_NAME ?? 'matiq_session';
  }

  private setSessionCookie(response: Response, token: string) {
    this.setCookie(response, this.cookieName(), token);
  }

  private setCookie(response: Response, name: string, token: string) {
    response.cookie(name, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}
