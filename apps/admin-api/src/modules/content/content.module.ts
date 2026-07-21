import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';

/** Combat content taxonomy feature boundary. */
@Module({ controllers: [ContentController] })
export class ContentModule {}
