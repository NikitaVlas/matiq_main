import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TrainerFinanceController } from './trainer-finance.controller';
import { TrainerFinanceService } from './trainer-finance.service';

@Module({
  imports: [AuditModule],
  controllers: [TrainerFinanceController],
  providers: [TrainerFinanceService],
})
export class TrainerFinanceModule {}
