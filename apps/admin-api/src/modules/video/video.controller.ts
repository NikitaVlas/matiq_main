import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { VideoService } from './video.service';

@ApiTags('admin-videos')
@Controller('admin/videos')
@UseGuards(AdminAuthGuard)
@AdminRoles('ADMIN', 'EDITOR')
export class VideoController {
  constructor(
    private readonly videos: VideoService,
    private readonly db: AdminDatabaseService,
  ) {}
  @Get() list() {
    return this.videos.list();
  }
  @Post() async create(
    @Body() body: { title: string; storageKey: string; description?: string; published?: boolean },
  ) {
    const video = await this.videos.create(body);
    await this.audit('VIDEO_CREATED', video.id, body);
    return video;
  }
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string }) {
    if (!file) throw new UnauthorizedException('VIDEO_FILE_REQUIRED');
    const uploaded = await this.videos.upload(file);
    const video = await this.videos.create({
      title: file.originalname,
      storageKey: uploaded.storageKey,
    });
    await this.audit('VIDEO_UPLOADED', video.id, { storageKey: uploaded.storageKey });
    return video;
  }
  @Get(':id/playback-url')
  async playback(@Param('id') id: string) {
    const video = await this.db.video.findUniqueOrThrow({ where: { id } });
    return { url: await this.videos.playback(video.storageKey), expiresIn: 300 };
  }
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; published?: boolean },
  ) {
    const video = await this.videos.update(id, body);
    await this.audit('VIDEO_UPDATED', id, body);
    return video;
  }
  private audit(action: string, entityId: string, metadata: unknown) {
    return this.db.auditLog.create({
      data: {
        action,
        entity: 'Video',
        entityId,
        actor: 'local-admin',
        metadata: metadata as object,
      },
    });
  }
}
