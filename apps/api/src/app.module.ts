import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { Database } from './database';
import { EmailService } from './email.service';
import { ProfileController } from './profile.controller';
import { RateLimitService } from './rate-limit.service';

@Module({
  controllers: [AuthController, ProfileController],
  providers: [Database, EmailService, RateLimitService, AuthService, AuthGuard],
})
export class AppModule {}
