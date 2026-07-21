import {
  Controller,
  Get,
  Module,
  Patch,
  Body,
  Headers,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StorageService } from '../../shared/infrastructure/storage.service';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { UseGuards } from '@nestjs/common';
import { VideoModule } from '../video/video.module';
import { ContentModule } from '../content/content.module';

@ApiTags('health')
@Controller('health')
class HealthController {
  @Get()
  get() {
    return { status: 'ok', service: 'admin-api' };
  }
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(
    private readonly storage: StorageService,
    private readonly db: AdminDatabaseService,
  ) {}
  private authorize(key?: string) {
    if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY)
      throw new UnauthorizedException();
  }

  @Get('assessment/questions')
  questions(@Headers('x-admin-key') key?: string) {
    this.authorize(key);
    return this.db.assessmentQuestion.findMany({ orderBy: { createdAt: 'asc' } });
  }

  @Patch('assessment/questions/:id')
  async updateQuestion(
    @Headers('x-admin-key') key: string | undefined,
    @Body() body: { text?: string; options?: unknown; active?: boolean },
    @Param('id') entityId: string,
  ) {
    this.authorize(key);
    const question = await this.db.assessmentQuestion.update({
      where: { id: entityId },
      data: body as never,
    });
    await this.audit('ASSESSMENT_QUESTION_UPDATED', 'AssessmentQuestion', question.id, body);
    return question;
  }

  private audit(action: string, entity: string, entityId: string, metadata: unknown) {
    return this.db.auditLog.create({
      data: { action, entity, entityId, actor: 'local-admin', metadata: metadata as object },
    });
  }
}

@Module({
  imports: [VideoModule, ContentModule],
  controllers: [HealthController, AdminController],
  providers: [StorageService],
})
export class AdminModule {}
