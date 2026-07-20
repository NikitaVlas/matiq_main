import { Body, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { RegisterDto, VerifyEmailDto } from './auth.dto';
import { AuthService } from './auth.service';

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
}
