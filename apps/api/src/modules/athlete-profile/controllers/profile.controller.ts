import { Body, Controller, Get, Inject, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { profileIsComplete } from '@matiq/backend';
import { AuthGuard, AuthenticatedRequest } from '../../identity/infrastructure/auth.guard';
import { Database } from '../../../shared/infrastructure/database';
import { SaveAthleteProfileDto } from '../dto/profile.dto';
import { FoundationRoadmapService } from '../application/foundation-roadmap.service';

@ApiTags('athlete-profile')
@UseGuards(AuthGuard)
@Controller('athlete-profile')
export class ProfileController {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(FoundationRoadmapService) private readonly foundation: FoundationRoadmapService,
  ) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.db.athleteProfile.findUnique({ where: { userId: request.userId } });
  }

  @Put()
  async save(@Req() request: AuthenticatedRequest, @Body() dto: SaveAthleteProfileDto) {
    const completedAt = profileIsComplete(dto) ? new Date() : null;
    const profile = await this.db.athleteProfile.upsert({
      where: { userId: request.userId },
      create: { userId: request.userId, ...dto, completedAt },
      update: { ...dto, completedAt },
    });
    const foundation = await this.foundation.assignIfEligible(profile);
    return { ...profile, foundationAssigned: foundation.assigned };
  }
}
