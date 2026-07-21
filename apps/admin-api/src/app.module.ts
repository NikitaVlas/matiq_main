import {
  Controller,
  Get,
  Module,
  Post,
  Patch,
  Body,
  Headers,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
class HealthController {
  @Get()
  get() {
    return { status: 'ok', service: 'admin-api' };
  }
}

class AdminDatabase extends PrismaClient {}

@ApiTags('admin')
@Controller('admin')
class AdminController {
  private readonly db = new AdminDatabase();
  private authorize(key?: string) {
    if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY)
      throw new UnauthorizedException();
  }

  @Get('stats')
  async stats(@Headers('x-admin-key') key?: string) {
    this.authorize(key);
    const [users, trainers, videos, questions] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { role: 'TRAINER' } }),
      this.db.video.count(),
      this.db.assessmentQuestion.count({ where: { active: true } }),
    ]);
    return { users, trainers, videos, activeAssessmentQuestions: questions };
  }

  @Get('trainers')
  trainers(@Headers('x-admin-key') key?: string) {
    this.authorize(key);
    return this.db.user.findMany({
      where: { role: 'TRAINER' },
      select: { id: true, email: true, createdAt: true },
    });
  }

  @Get('videos')
  videos(@Headers('x-admin-key') key?: string) {
    this.authorize(key);
    return this.db.video.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Post('videos')
  async createVideo(
    @Headers('x-admin-key') key: string | undefined,
    @Body() body: { title: string; storageKey: string; description?: string; published?: boolean },
  ) {
    this.authorize(key);
    const video = await this.db.video.create({
      data: {
        title: body.title,
        storageKey: body.storageKey,
        description: body.description,
        published: body.published ?? false,
      },
    });
    await this.audit('VIDEO_CREATED', 'Video', video.id, body);
    return video;
  }

  @Patch('videos/:id')
  async updateVideo(
    @Headers('x-admin-key') key: string | undefined,
    @Body() body: { title?: string; description?: string; published?: boolean },
    @Param('id') entityId: string,
  ) {
    this.authorize(key);
    const id = entityId ?? '';
    const video = await this.db.video.update({ where: { id }, data: body });
    await this.audit('VIDEO_UPDATED', 'Video', id, body);
    return video;
  }

  @Get('content')
  async content(@Headers('x-admin-key') key?: string) {
    this.authorize(key);
    return {
      gameAreas: await this.db.gameArea.findMany({ include: { positions: true } }),
      positions: await this.db.position.findMany({ include: { skillGroups: true } }),
      skillGroups: await this.db.skillGroup.findMany({ include: { techniques: true } }),
      techniques: await this.db.technique.findMany({ include: { variants: true } }),
      movements: await this.db.movement.findMany(),
      drills: await this.db.drill.findMany(),
      flows: await this.db.flow.findMany(),
    };
  }

  @Post('content/game-areas')
  createGameArea(
    @Headers('x-admin-key') key: string | undefined,
    @Body() body: { key: string; name: string; discipline: 'BJJ_GI' | 'NO_GI_GRAPPLING' },
  ) {
    this.authorize(key);
    return this.db.gameArea.create({ data: body });
  }

  @Post('content/positions')
  createPosition(
    @Headers('x-admin-key') key: string | undefined,
    @Body()
    body: { gameAreaId: string; key: string; name: string; context: 'STANDING' | 'TOP' | 'BOTTOM' },
  ) {
    this.authorize(key);
    return this.db.position.create({ data: body });
  }

  @Post('content/skill-groups')
  createSkillGroup(
    @Headers('x-admin-key') key: string | undefined,
    @Body() body: { positionId: string; key: string; name: string },
  ) {
    this.authorize(key);
    return this.db.skillGroup.create({ data: body });
  }

  @Post('content/techniques')
  createTechnique(
    @Headers('x-admin-key') key: string | undefined,
    @Body() body: { skillGroupId: string; key: string; name: string },
  ) {
    this.authorize(key);
    return this.db.technique.create({ data: body });
  }

  @Post('content/movements')
  createMovement(
    @Headers('x-admin-key') key: string | undefined,
    @Body() body: { key: string; name: string; description?: string },
  ) {
    this.authorize(key);
    return this.db.movement.create({ data: body });
  }

  @Post('content/drills')
  createDrill(
    @Headers('x-admin-key') key: string | undefined,
    @Body()
    body: {
      key: string;
      name: string;
      description?: string;
      techniqueId?: string;
      movementId?: string;
    },
  ) {
    this.authorize(key);
    return this.db.drill.create({ data: body });
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

@Module({ controllers: [HealthController, AdminController] })
export class AppModule {}
