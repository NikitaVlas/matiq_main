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
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { VideoStorageService } from './video-storage.service';

@Module({
  controllers: [AuthController, ProfileController, AssessmentController, ContentController],
  providers: [
    Database,
    EmailService,
    RateLimitService,
    AuthService,
    AuthGuard,
    AssessmentService,
    ContentService,
    VideoStorageService,
  ],
})
export class AppModule {}
