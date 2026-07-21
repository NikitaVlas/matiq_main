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
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  controllers: [
    AuthController,
    ProfileController,
    AssessmentController,
    ContentController,
    SubscriptionController,
  ],
  providers: [
    Database,
    EmailService,
    RateLimitService,
    AuthService,
    AuthGuard,
    AssessmentService,
    ContentService,
    VideoStorageService,
    SubscriptionService,
  ],
})
export class AppModule {}
