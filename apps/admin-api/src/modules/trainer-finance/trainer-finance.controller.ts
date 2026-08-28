import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRoles } from '../admin-auth/admin-roles.decorator';
import {
  AdjustReportDto,
  CreateSettlementPeriodDto,
  CreateTrainerAgreementDto,
  ReportTransitionDto,
} from './trainer-finance.dto';
import { TrainerFinanceService } from './trainer-finance.service';

type AdminRequest = { adminUserId: string; reauthenticatedAt?: Date | null };
const reauthenticationWindowMs = 15 * 60 * 1000;

@ApiTags('trainer-finance')
@Controller('admin/trainer-finance')
@UseGuards(AdminAuthGuard)
@AdminRoles('ADMIN')
export class TrainerFinanceController {
  constructor(@Inject(TrainerFinanceService) private readonly finance: TrainerFinanceService) {}

  @Get()
  overview() {
    return this.finance.overview();
  }

  @Post('agreements')
  createAgreement(@Body() body: CreateTrainerAgreementDto, @Req() req: AdminRequest) {
    requireRecentReauthentication(req);
    return this.finance.createAgreement(body, req.adminUserId);
  }

  @Post('agreements/:id/activate')
  activateAgreement(@Param('id') id: string, @Req() req: AdminRequest) {
    requireRecentReauthentication(req);
    return this.finance.activateAgreement(id, req.adminUserId);
  }

  @Post('periods')
  createPeriod(@Body() body: CreateSettlementPeriodDto, @Req() req: AdminRequest) {
    requireRecentReauthentication(req);
    return this.finance.createPeriod(body, req.adminUserId);
  }

  @Post('reports/:id/status')
  transitionReport(
    @Param('id') id: string,
    @Body() body: ReportTransitionDto,
    @Req() req: AdminRequest,
  ) {
    requireRecentReauthentication(req);
    return this.finance.transitionReport(id, body, req.adminUserId);
  }

  @Post('reports/:id/adjustment')
  adjustReport(@Param('id') id: string, @Body() body: AdjustReportDto, @Req() req: AdminRequest) {
    requireRecentReauthentication(req);
    return this.finance.adjustReport(id, body, req.adminUserId);
  }
}

function requireRecentReauthentication(req: AdminRequest) {
  if (
    !req.reauthenticatedAt ||
    req.reauthenticatedAt.getTime() < Date.now() - reauthenticationWindowMs
  ) {
    throw new UnauthorizedException('REAUTHENTICATION_REQUIRED');
  }
}
