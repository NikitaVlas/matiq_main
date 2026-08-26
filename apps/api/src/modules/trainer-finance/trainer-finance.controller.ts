import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../identity/infrastructure/auth.guard';
import { ContentSessionGuard } from '../identity/infrastructure/admin-session.guard';
import { TrainerFinanceService } from './trainer-finance.service';

@ApiTags('trainer-finance')
@Controller('trainer-finance')
@UseGuards(ContentSessionGuard)
export class TrainerFinanceController {
  constructor(private readonly finance: TrainerFinanceService) {}

  @Get('overview')
  overview(@Req() req: AuthenticatedRequest) {
    return this.finance.overview(req.userId, req.userRole);
  }
}
