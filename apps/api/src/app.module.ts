import { Module } from '@nestjs/common';
import { AuthController, AuthGuard, AuthService, EmailService } from './modules/identity';
import { AssessmentController, AssessmentService } from './modules/assessment';
import { ContentController, ContentService, VideoStorageService } from './modules/content';
import { SubscriptionController, SubscriptionService } from './modules/subscription';
import { ProfileController } from './modules/athlete-profile';
import { Database, RateLimitService } from './shared/infrastructure';

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
