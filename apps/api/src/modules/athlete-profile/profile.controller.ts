import { Body, Controller, Get, Inject, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { profileIsComplete } from '@matiq/backend';
import { AuthGuard, AuthenticatedRequest } from '../identity/auth.guard';
import { Database } from '../../shared/infrastructure/database';
import { SaveAthleteProfileDto } from './profile.dto';

@ApiTags('athlete-profile')
@UseGuards(AuthGuard)
@Controller('athlete-profile')
export class ProfileController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.db.athleteProfile.findUnique({ where: { userId: request.userId } });
  }

  @Put()
  save(@Req() request: AuthenticatedRequest, @Body() dto: SaveAthleteProfileDto) {
    const completedAt = profileIsComplete(dto) ? new Date() : null;
    return this.db.athleteProfile.upsert({
      where: { userId: request.userId },
      create: { userId: request.userId, ...dto, completedAt },
      update: { ...dto, completedAt },
    });
  }
}
