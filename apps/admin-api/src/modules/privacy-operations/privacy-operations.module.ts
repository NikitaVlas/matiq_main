import { Module } from '@nestjs/common';
import { PrivacyOperationsController } from './privacy-operations.controller';
import { PrivacyOperationsService } from './privacy-operations.service';

@Module({ controllers: [PrivacyOperationsController], providers: [PrivacyOperationsService] })
export class PrivacyOperationsModule {}
