import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Discipline } from '@prisma/client';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard, AuthenticatedRequest } from '../../identity/infrastructure/auth.guard';
import {
  AssessmentDraftDto,
  RoadmapItemDto,
  SubmitAssessmentDto,
  UpdateRoadmapItemDto,
} from '../dto/assessment.dto';
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
  @Get('answers') answers(@Req() req: AuthenticatedRequest) {
    return this.assessment.currentAnswers(req.userId);
  }
  @Get('attempt/:discipline')
  @ApiParam({ name: 'discipline', enum: Discipline })
  attempt(
    @Req() req: AuthenticatedRequest,
    @Param('discipline', new ParseEnumPipe(Discipline)) discipline: Discipline,
  ) {
    return this.assessment.currentAttempt(req.userId, discipline);
  }
  @Put('draft') draft(@Req() req: AuthenticatedRequest, @Body() dto: AssessmentDraftDto) {
    return this.assessment.saveDraft(req.userId, dto.discipline, dto.answers);
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
  @Patch('roadmap-items/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateRoadmapItemDto })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateRoadmapItemDto,
  ) {
    return this.assessment.updateRoadmapItem(req.userId, id, body);
  }
}
