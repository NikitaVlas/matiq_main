import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRoles } from '../admin-auth/admin-roles.decorator';
import { AuditService } from '../audit/audit.service';
import { VideoService } from './video.service';

@ApiTags('admin-videos')
@Controller('admin/videos')
@UseGuards(AdminAuthGuard)
@AdminRoles('ADMIN', 'EDITOR')
export class VideoController {
  constructor(
    private readonly videos: VideoService,
    private readonly db: AdminDatabaseService,
    private readonly auditService: AuditService,
  ) {}
  @Get() list() {
    return this.videos.list();
  }
  @AdminRoles('ADMIN')
  @Post()
  async create(
    @Body() body: { title: string; storageKey: string; description?: string; published?: boolean },
    @Req() request: { adminUserId: string },
  ) {
    const video = await this.videos.create(body);
    await this.audit('VIDEO_CREATED', video.id, request.adminUserId, body);
    return video;
  }
  @AdminRoles('ADMIN')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string },
    @Req() request: { adminUserId: string },
  ) {
    if (!file) throw new UnauthorizedException('VIDEO_FILE_REQUIRED');
    if (!/^[\x20-\x7E]+$/.test(file.originalname)) {
      throw new BadRequestException('VIDEO_FILENAME_MUST_USE_LATIN_CHARACTERS');
    }
    const uploaded = await this.videos.upload(file);
    const video = await this.videos.create({
      title: file.originalname,
      storageKey: uploaded.storageKey,
    });
    await this.audit('VIDEO_UPLOADED', video.id, request.adminUserId, {
      storageKey: uploaded.storageKey,
    });
    return video;
  }
  @Get(':id/playback-url')
  @AdminRoles('ADMIN')
  async playback(@Param('id') id: string) {
    const video = await this.db.video.findUniqueOrThrow({ where: { id } });
    return { url: await this.videos.playback(video.storageKey), expiresIn: 300 };
  }
  @AdminRoles('ADMIN')
  @Post(':id/metadata')
  async setMetadata(
    @Param('id') id: string,
    @Body() body: { optionIds: string[] },
    @Req() request: { adminUserId: string },
  ) {
    const optionIds = [...new Set(body.optionIds ?? [])];
    await this.db.$transaction([
      this.db.videoMetadataOption.deleteMany({ where: { videoId: id } }),
      this.db.videoMetadataOption.createMany({
        data: optionIds.map((optionId) => ({ videoId: id, optionId })),
      }),
    ]);
    await this.audit('VIDEO_METADATA_UPDATED', id, request.adminUserId, { optionIds });
    return this.db.video.findUniqueOrThrow({
      where: { id },
      include: { metadataValues: { include: { option: { include: { field: true } } } } },
    });
  }
  @AdminRoles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string },
    @Req() request: { adminUserId: string },
  ) {
    const video = await this.videos.update(id, body);
    await this.audit('VIDEO_UPDATED', id, request.adminUserId, body);
    return video;
  }
  @Patch(':id/author')
  async assignAuthor(
    @Param('id') id: string,
    @Body() body: { trainerId: string | null },
    @Req() request: { adminUserId: string },
  ) {
    if (body.trainerId) {
      const trainer = await this.db.user.findFirst({
        where: { id: body.trainerId, role: 'TRAINER', deletedAt: null },
        select: { id: true },
      });
      if (!trainer) throw new BadRequestException('TRAINER_NOT_FOUND');
    }
    const video = await this.db.video.update({
      where: { id },
      data: { trainerId: body.trainerId },
    });
    await this.audit('VIDEO_AUTHOR_UPDATED', id, request.adminUserId, body);
    return video;
  }
  @AdminRoles('ADMIN')
  @Post(':id/publish')
  async publish(@Param('id') id: string, @Req() request: { adminUserId: string }) {
    const video = await this.videos.update(id, { published: true });
    await this.audit('VIDEO_PUBLISHED', id, request.adminUserId, {});
    return video;
  }
  @AdminRoles('ADMIN')
  @Post(':id/unpublish')
  async unpublish(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() request: { adminUserId: string },
  ) {
    if (!body.reason?.trim()) throw new UnauthorizedException('UNPUBLISH_REASON_REQUIRED');
    const video = await this.videos.update(id, { published: false });
    await this.audit('VIDEO_UNPUBLISHED', id, request.adminUserId, { reason: body.reason.trim() });
    return video;
  }
  @AdminRoles('ADMIN')
  @Patch(':id/preview')
  async preview(
    @Param('id') id: string,
    @Body() body: { startSec: number; endSec: number },
    @Req() request: { adminUserId: string },
  ) {
    const current = await this.db.video.findUniqueOrThrow({ where: { id } });
    if (
      !Number.isInteger(body.startSec) ||
      !Number.isInteger(body.endSec) ||
      body.startSec < 0 ||
      body.endSec <= body.startSec ||
      body.endSec - body.startSec > 60 ||
      (current.durationSec !== null && body.endSec > current.durationSec)
    )
      throw new BadRequestException('INVALID_PREVIEW_RANGE');
    const video = await this.db.video.update({
      where: { id },
      data: { previewStartSec: body.startSec, previewEndSec: body.endSec },
    });
    await this.audit('VIDEO_PREVIEW_UPDATED', id, request.adminUserId, {
      startSec: body.startSec,
      endSec: body.endSec,
    });
    return video;
  }
  @Patch(':id/draft')
  async updateDraft(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string },
    @Req() request: { adminUserId: string },
  ) {
    const current = await this.db.video.findUniqueOrThrow({ where: { id } });
    if (current.published) {
      const revision = await this.db.videoRevision.create({
        data: {
          videoId: id,
          title: body.title ?? current.title,
          description: body.description ?? current.description,
          createdBy: request.adminUserId,
        },
      });
      await this.audit('VIDEO_REVISION_CREATED', id, request.adminUserId, {
        revisionId: revision.id,
      });
      return revision;
    }
    const video = await this.videos.update(id, body);
    await this.audit('VIDEO_DRAFT_UPDATED', id, request.adminUserId, body);
    return video;
  }
  @AdminRoles('ADMIN')
  @Post(':id/revisions/:revisionId/approve')
  async approveRevision(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() request: { adminUserId: string },
  ) {
    const revision = await this.db.videoRevision.findFirstOrThrow({
      where: { id: revisionId, videoId: id, approvedAt: null },
    });
    const video = await this.db.video.update({
      where: { id },
      data: { title: revision.title, description: revision.description },
    });
    await this.db.videoRevision.update({
      where: { id: revisionId },
      data: { approvedAt: new Date() },
    });
    await this.audit('VIDEO_REVISION_APPROVED', id, request.adminUserId, { revisionId });
    return video;
  }
  private audit(action: string, entityId: string, actor: string, metadata: unknown) {
    return this.auditService.record(action, 'Video', entityId, actor, metadata);
  }
}
