import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRoles } from '../admin-auth/admin-roles.decorator';
import { AuditService } from '../audit/audit.service';
import { SaveTrainerProfileDto } from './trainer-profile.dto';

@ApiTags('admin-trainers')
@Controller('admin')
@UseGuards(AdminAuthGuard)
@AdminRoles('ADMIN', 'EDITOR')
export class TrainerController {
  constructor(
    private readonly db: AdminDatabaseService,
    private readonly audit: AuditService,
  ) {}

  @Get('trainers')
  trainers() {
    return this.db.user.findMany({
      where: { role: 'TRAINER', deletedAt: null },
      select: {
        id: true,
        email: true,
        createdAt: true,
        trainerProfile: true,
        _count: { select: { authoredCourses: true, authoredVideos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Put('trainers/:id/profile')
  async saveProfile(
    @Param('id') id: string,
    @Body() body: SaveTrainerProfileDto,
    @Req() request: { adminUserId: string },
  ) {
    await this.requireTrainer(id);
    validateTrainerProfile(body);
    const socialLinks = body.socialLinks as unknown as Prisma.InputJsonValue;
    const profile = await this.db.trainerProfile.upsert({
      where: { userId: id },
      create: { ...body, socialLinks, userId: id },
      update: { ...body, socialLinks },
    });
    await this.audit.record(
      'TRAINER_PROFILE_UPDATED',
      'TrainerProfile',
      profile.id,
      request.adminUserId,
      { trainerId: id, slug: profile.slug },
    );
    return profile;
  }

  @AdminRoles('ADMIN')
  @Post('trainers/:id/publish')
  async publish(@Param('id') id: string, @Req() request: { adminUserId: string }) {
    await this.requireTrainer(id);
    const profile = await this.db.trainerProfile.findUnique({ where: { userId: id } });
    if (!profile) throw new NotFoundException('TRAINER_PROFILE_NOT_FOUND');
    if (!trainerProfileIsComplete(profile)) {
      throw new BadRequestException('TRAINER_PROFILE_INCOMPLETE');
    }
    const published = await this.db.trainerProfile.update({
      where: { userId: id },
      data: { published: true, publishedAt: new Date() },
    });
    await this.audit.record(
      'TRAINER_PROFILE_PUBLISHED',
      'TrainerProfile',
      published.id,
      request.adminUserId,
      { trainerId: id },
    );
    return published;
  }

  @AdminRoles('ADMIN')
  @Post('trainers/:id/unpublish')
  async unpublish(@Param('id') id: string, @Req() request: { adminUserId: string }) {
    const profile = await this.db.trainerProfile.update({
      where: { userId: id },
      data: { published: false, publishedAt: null },
    });
    await this.audit.record(
      'TRAINER_PROFILE_UNPUBLISHED',
      'TrainerProfile',
      profile.id,
      request.adminUserId,
      { trainerId: id },
    );
    return profile;
  }

  private async requireTrainer(id: string) {
    const trainer = await this.db.user.findFirst({
      where: { id, role: 'TRAINER', deletedAt: null },
      select: { id: true },
    });
    if (!trainer) throw new NotFoundException('TRAINER_NOT_FOUND');
  }
}

function validateTrainerProfile(profile: SaveTrainerProfileDto) {
  const textFields = [
    profile.displayName,
    profile.biography,
    profile.athleteJourney,
    profile.trainingPrinciples,
    profile.city,
  ];
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.slug) ||
    profile.slug.length < 3 ||
    profile.slug.length > 80 ||
    !/^[A-Z]{2}$/.test(profile.countryCode) ||
    textFields.some((value) => typeof value !== 'string') ||
    textFields.some((value) => value.length > 5000) ||
    profile.displayName.length > 120 ||
    profile.city.length > 120 ||
    !Array.isArray(profile.disciplines) ||
    !profile.disciplines.length ||
    profile.disciplines.some((discipline) => !['BJJ_GI', 'NO_GI_GRAPPLING'].includes(discipline)) ||
    !Array.isArray(profile.qualifications) ||
    profile.qualifications.length > 50 ||
    !Array.isArray(profile.achievements) ||
    profile.achievements.length > 50 ||
    !Array.isArray(profile.languages) ||
    profile.languages.length > 20 ||
    !Array.isArray(profile.socialLinks) ||
    profile.socialLinks.length > 20 ||
    profile.socialLinks.some(
      (link) =>
        typeof link.label !== 'string' ||
        typeof link.url !== 'string' ||
        !/^https?:\/\//.test(link.url),
    )
  ) {
    throw new BadRequestException('INVALID_TRAINER_PROFILE');
  }
}

function trainerProfileIsComplete(profile: {
  displayName: string;
  biography: string;
  athleteJourney: string;
  trainingPrinciples: string;
  city: string;
  countryCode: string;
  disciplines: unknown[];
}) {
  return Boolean(
    profile.displayName.trim() &&
      profile.biography.trim() &&
      profile.athleteJourney.trim() &&
      profile.trainingPrinciples.trim() &&
      profile.city.trim() &&
      profile.countryCode.trim() &&
      profile.disciplines.length,
  );
}
