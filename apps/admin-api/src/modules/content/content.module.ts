import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { RoadmapMetadataService } from './roadmap-metadata.service';
import { AuditModule } from '../audit/audit.module';

/** Combat content taxonomy feature boundary. */
@Module({
  imports: [AuditModule],
  controllers: [ContentController],
  providers: [RoadmapMetadataService],
})
export class ContentModule {}
