import {
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
  @Post() async create(
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
  @AdminRoles('ADMIN')
  @Post(':id/publish')
  async publish(@Param('id') id: string, @Req() request: { adminUserId: string }) {
    const video = await this.videos.update(id, { published: true });
    await this.audit('VIDEO_PUBLISHED', id, request.adminUserId, {});
    return video;
  }
  @AdminRoles('ADMIN')
  @Post(':id/unpublish')
  async unpublish(@Param('id') id: string, @Body() body: { reason: string }, @Req() request: { adminUserId: string }) {
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
    if (!Number.isInteger(body.startSec) || !Number.isInteger(body.endSec) || body.startSec < 0 || body.endSec <= body.startSec || body.endSec - body.startSec > 60)
      throw new UnauthorizedException('INVALID_PREVIEW_RANGE');
    const video = await this.db.video.update({ where: { id }, data: { previewStartSec: body.startSec, previewEndSec: body.endSec } });
    await this.audit('VIDEO_PREVIEW_UPDATED', id, request.adminUserId, { startSec: body.startSec, endSec: body.endSec });
    return video;
  }
  @Patch(':id/draft')
  async updateDraft(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string },
    @Req() request: { adminUserId: string },
  ) {
    const current = await this.db.video.findUniqueOrThrow({ where: { id } });
    if (current.published) throw new UnauthorizedException('PUBLISHED_VIDEO_REQUIRES_ADMIN_REVISION');
    const video = await this.videos.update(id, body);
    await this.audit('VIDEO_DRAFT_UPDATED', id, request.adminUserId, body);
    return video;
  }
  private audit(action: string, entityId: string, actor: string, metadata: unknown) {
    return this.auditService.record(action, 'Video', entityId, actor, metadata);
  }
}
