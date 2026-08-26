import { Module } from '@nestjs/common';
import { SharedInfrastructureModule } from '../../shared/infrastructure';
import { IdentityModule } from '../identity';
import { TrainerFinanceController } from './trainer-finance.controller';
import { TrainerFinanceService } from './trainer-finance.service';

@Module({
  imports: [SharedInfrastructureModule, IdentityModule],
  controllers: [TrainerFinanceController],
  providers: [TrainerFinanceService],
})
export class TrainerFinanceModule {}
