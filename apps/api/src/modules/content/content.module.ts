import { Module } from '@nestjs/common';
import { ContentController } from './controllers/content.controller';
import { ContentService } from './application/content.service';
import { VideoStorageService } from './infrastructure/video-storage.service';
import { SharedInfrastructureModule } from '../../shared/infrastructure';
import { IdentityModule } from '../identity';
import { SubscriptionModule } from '../subscription';
@Module({
  imports: [SharedInfrastructureModule, IdentityModule, SubscriptionModule],
  controllers: [ContentController],
  providers: [ContentService, VideoStorageService],
  exports: [ContentService],
})
export class ContentModule {}
