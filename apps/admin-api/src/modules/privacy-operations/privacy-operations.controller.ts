import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRoles } from '../admin-auth/admin-roles.decorator';
import {
  PrivacyOperationsStatusDto,
  RetryPrivacyOperationsDto,
  RetryPrivacyOperationsResultDto,
} from './privacy-operations.dto';
import { PrivacyOperationsService } from './privacy-operations.service';

type AdminRequest = { adminUserId: string; reauthenticatedAt?: Date | null };

@ApiTags('admin-privacy-operations')
@Controller('admin/privacy-operations')
@UseGuards(AdminAuthGuard)
@AdminRoles('ADMIN')
export class PrivacyOperationsController {
  constructor(private readonly operations: PrivacyOperationsService) {}

  @Get()
  @ApiOkResponse({ type: PrivacyOperationsStatusDto })
  status() {
    return this.operations.status();
  }

  @Post('retry')
  @ApiCreatedResponse({ type: RetryPrivacyOperationsResultDto })
  retry(@Body() body: RetryPrivacyOperationsDto, @Req() request: AdminRequest) {
    if (body?.confirmation !== 'RETRY')
      throw new BadRequestException('RETRY_CONFIRMATION_REQUIRED');
    const reauthenticatedAt = request.reauthenticatedAt?.getTime() ?? 0;
    if (Date.now() - reauthenticatedAt > 15 * 60_000) {
      throw new UnauthorizedException('RECENT_REAUTHENTICATION_REQUIRED');
    }
    return this.operations.retry(request.adminUserId);
  }
}
