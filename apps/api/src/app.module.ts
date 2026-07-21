import { Module } from '@nestjs/common';
import { SharedInfrastructureModule } from './shared/infrastructure';
import { IdentityModule } from './modules/identity';
import { SubscriptionModule } from './modules/subscription';
import { AthleteProfileModule } from './modules/athlete-profile';
import { AssessmentModule } from './modules/assessment';
import { ContentModule } from './modules/content';

@Module({
  imports: [
    SharedInfrastructureModule,
    IdentityModule,
    SubscriptionModule,
    AthleteProfileModule,
    AssessmentModule,
    ContentModule,
  ],
})
export class AppModule {}
