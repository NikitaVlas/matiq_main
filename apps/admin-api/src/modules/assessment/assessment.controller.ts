import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AuditService } from '../audit/audit.service';

@ApiTags('admin-assessment')
@Controller('admin/assessment')
@UseGuards(AdminAuthGuard)
export class AssessmentController {
  constructor(
    private readonly db: AdminDatabaseService,
    private readonly audit: AuditService,
  ) {}
  @Get('questions') questions() {
    return this.db.assessmentQuestion.findMany({ orderBy: { createdAt: 'asc' } });
  }
  @Patch('questions/:id')
  async updateQuestion(
    @Param('id') id: string,
    @Body() body: { text?: string; options?: unknown; active?: boolean },
    @Req() request: { adminUserId: string },
  ) {
    const question = await this.db.assessmentQuestion.update({
      where: { id },
      data: body as never,
    });
    await this.audit.record(
      'ASSESSMENT_QUESTION_UPDATED',
      'AssessmentQuestion',
      question.id,
      request.adminUserId,
      body,
    );
    return question;
  }
}
