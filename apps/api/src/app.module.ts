import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { Database } from './database';
import { EmailService } from './email.service';
import { ProfileController } from './profile.controller';
import { RateLimitService } from './rate-limit.service';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';

@Module({
  controllers: [AuthController, ProfileController, AssessmentController],
  providers: [Database, EmailService, RateLimitService, AuthService, AuthGuard, AssessmentService],
})
export class AppModule {}
