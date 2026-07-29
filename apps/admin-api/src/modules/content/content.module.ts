import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { RoadmapMetadataService } from './roadmap-metadata.service';

/** Combat content taxonomy feature boundary. */
@Module({ controllers: [ContentController], providers: [RoadmapMetadataService] })
export class ContentModule {}
