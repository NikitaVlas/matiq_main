import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogVideoDto } from '../dto/catalog-video.dto';
import { ContentService } from '../application/content.service';
import { AuthenticatedRequest } from '../../identity/infrastructure/auth.guard';
import { ContentSessionGuard } from '../../identity/infrastructure/admin-session.guard';
import { PlaybackHeartbeatDto } from '../dto/playback-heartbeat.dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}
  @Get('courses') courses() {
    return this.content.courses();
  }

  @Get('catalog') catalog() {
    return this.content.catalog();
  }

  @Get('videos')
  @ApiOkResponse({ type: [CatalogVideoDto] })
  videos() {
    return this.content.publicVideos();
  }

  @Get('trainers')
  trainers() {
    return this.content.trainers();
  }

  @Get('trainers/:slug')
  trainer(@Param('slug') slug: string) {
    return this.content.trainer(slug);
  }

  @UseGuards(ContentSessionGuard)
  @Get('videos/:id/playback')
  playback(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.content.playback(req.userId, req.userRole, id);
  }

  @UseGuards(ContentSessionGuard)
  @Get('videos/:id/recommendations')
  recommendations(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.content.recommendations(req.userId, req.userRole, id);
  }

  @UseGuards(ContentSessionGuard)
  @Post('videos/:id/heartbeat')
  heartbeat(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: PlaybackHeartbeatDto,
  ) {
    return this.content.heartbeat(req.userId, id, body);
  }

  @UseGuards(ContentSessionGuard)
  @ApiOperation({ deprecated: true })
  @Post('videos/:id/watch')
  watch(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { watchedSeconds: number; completed?: boolean },
  ) {
    return this.content.recordWatch(req.userId, req.userRole, id, body.watchedSeconds);
  }

  @UseGuards(ContentSessionGuard)
  @Get('history')
  history(@Req() req: AuthenticatedRequest) {
    return this.content.history(req.userId);
  }
}
