import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { AuditModule } from '../audit/audit.module';

/** Video management feature boundary. */
@Module({
  imports: [AuditModule],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
