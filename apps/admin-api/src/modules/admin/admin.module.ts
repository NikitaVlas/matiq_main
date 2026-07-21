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
import { ApiTags } from '@nestjs/swagger';
import { StorageService } from '../../shared/infrastructure/storage.service';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { UseGuards } from '@nestjs/common';
import { VideoModule } from '../video/video.module';

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

@Module({
  imports: [VideoModule],
  controllers: [HealthController, AdminController],
  providers: [StorageService],
})
export class AdminModule {}
