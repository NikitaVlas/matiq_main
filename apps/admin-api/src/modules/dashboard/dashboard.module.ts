import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';

/** Dashboard feature boundary. Routes are kept backward-compatible in AdminController. */
@Module({ controllers: [DashboardController] })
export class DashboardModule {}
