import { Module } from '@nestjs/common';
import { VideoService } from './video.service';

/** Video management feature boundary. */
@Module({ providers: [VideoService], exports: [VideoService] })
export class VideoModule {}
