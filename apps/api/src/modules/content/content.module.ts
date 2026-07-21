import { Module } from '@nestjs/common';
import { ContentController } from './controllers/content.controller';
import { ContentService } from './application/content.service';
import { VideoStorageService } from './infrastructure/video-storage.service';
@Module({
  controllers: [ContentController],
  providers: [ContentService, VideoStorageService],
  exports: [ContentService],
})
export class ContentModule {}
