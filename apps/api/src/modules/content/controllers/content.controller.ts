import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContentService } from '../application/content.service';
import { AuthGuard, AuthenticatedRequest } from '../../identity/infrastructure/auth.guard';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}
  @Get('catalog') catalog() {
    return this.content.catalog();
  }

  @UseGuards(AuthGuard)
  @Get('videos/:id/playback')
  playback(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.content.playback(req.userId, id);
  }

  @UseGuards(AuthGuard)
  @Post('videos/:id/watch')
  watch(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { watchedSeconds: number; completed?: boolean },
  ) {
    return this.content.recordWatch(req.userId, id, body.watchedSeconds, Boolean(body.completed));
  }
}
