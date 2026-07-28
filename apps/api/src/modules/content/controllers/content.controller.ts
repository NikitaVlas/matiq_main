import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContentService } from '../application/content.service';
import { AuthenticatedRequest } from '../../identity/infrastructure/auth.guard';
import { ContentSessionGuard } from '../../identity/infrastructure/admin-session.guard';

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
