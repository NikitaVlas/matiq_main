import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { AuditModule } from '../audit/audit.module';
import { StorageService } from '../../shared/infrastructure/storage.service';

/** Video management feature boundary. */
@Module({
  imports: [AuditModule],
  controllers: [VideoController],
  providers: [VideoService, StorageService],
  exports: [VideoService],
})
export class VideoModule {}
