import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard, AuthenticatedRequest } from '../../identity/infrastructure/auth.guard';
import { RoadmapItemDto, SubmitAssessmentDto } from '../dto/assessment.dto';
import { AssessmentService } from '../application/assessment.service';

@ApiTags('assessment')
@Controller('assessment')
@UseGuards(AuthGuard)
export class AssessmentController {
  constructor(@Inject(AssessmentService) private readonly assessment: AssessmentService) {}
  @Get('questions') questions() {
    return this.assessment.questions();
  }
  @Get('result') result(@Req() req: AuthenticatedRequest) {
    return this.assessment.getResult(req.userId);
  }
  @Post('submit') submit(@Req() req: AuthenticatedRequest, @Body() dto: SubmitAssessmentDto) {
    return this.assessment.submit(req.userId, dto.answers);
  }
  @Post('roadmap-items') add(@Req() req: AuthenticatedRequest, @Body() dto: RoadmapItemDto) {
    return this.assessment.addRoadmapItem(
      req.userId,
      dto.title,
      dto.skillKey,
      dto.lessonId,
      dto.discipline,
    );
  }
  @Get('roadmap-items/:id') details(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.assessment.roadmapItemDetails(req.userId, id);
  }
  @Patch('roadmap-items/:id') update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { isHidden?: boolean; direction?: 'up' | 'down' },
  ) {
    return this.assessment.updateRoadmapItem(req.userId, id, body);
  }
}
