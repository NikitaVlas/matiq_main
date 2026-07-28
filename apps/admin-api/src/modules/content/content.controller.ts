import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRoles } from '../admin-auth/admin-roles.decorator';

@ApiTags('admin-content')
@Controller('admin/content')
@UseGuards(AdminAuthGuard)
@AdminRoles('ADMIN', 'EDITOR')
export class ContentController {
  constructor(private readonly db: AdminDatabaseService) {}
  @Get() catalog() {
    return Promise.all([
      this.db.gameArea.findMany({ include: { positions: true } }),
      this.db.position.findMany({ include: { skillGroups: true } }),
      this.db.skillGroup.findMany({ include: { techniques: true } }),
      this.db.technique.findMany({ include: { variants: true } }),
      this.db.movement.findMany(),
      this.db.drill.findMany(),
      this.db.flow.findMany(),
    ]).then(([gameAreas, positions, skillGroups, techniques, movements, drills, flows]) => ({
      gameAreas,
      positions,
      skillGroups,
      techniques,
      movements,
      drills,
      flows,
    }));
  }
  @Get('courses') courses() {
    return this.db.course.findMany({
      include: { modules: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' }, include: { video: true, outgoingRelations: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  @Post('courses/:courseId/publish') async publishCourse(@Param('courseId') courseId: string) {
    const course = await this.db.course.update({ where: { id: courseId }, data: { published: true }, include: { modules: { include: { lessons: { select: { id: true, videoId: true } } } } } });
    const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const videoIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.videoId));
    await this.db.lesson.updateMany({ where: { id: { in: lessonIds } }, data: { published: true } });
    await this.db.video.updateMany({ where: { id: { in: videoIds } }, data: { published: true } });
    return course;
  }
  @Post('courses') createCourse(@Body() body: { key: string; title: string; description?: string; discipline: 'BJJ_GI' | 'NO_GI_GRAPPLING' }) {
    return this.db.course.create({ data: body });
  }
  @Post('courses/:courseId/modules') createModule(@Param('courseId') courseId: string, @Body() body: { key: string; title: string; position: number }) {
    return this.db.courseModule.create({ data: { ...body, courseId } });
  }
  @Post('modules/:moduleId/lessons') createLesson(@Param('moduleId') moduleId: string, @Body() body: { videoId: string; key: string; title: string; goal?: string; startingPosition?: string; endingPosition?: string; level?: string; giNoGi?: string; reactions?: string[]; position: number; published?: boolean }) {
    return this.db.lesson.create({ data: { ...body, moduleId, reactions: body.reactions ?? [] } });
  }
  @Post('lessons/:lessonId/relations') createLessonRelation(@Param('lessonId') fromLessonId: string, @Body() body: { toLessonId: string; type: 'NEXT' | 'REACTION' | 'ALTERNATIVE'; condition?: string; position?: number }) {
    return this.db.lessonRelation.create({ data: { ...body, fromLessonId, position: body.position ?? 0 } });
  }
  @Post('game-areas') createGameArea(
    @Body() body: { key: string; name: string; discipline: 'BJJ_GI' | 'NO_GI_GRAPPLING' },
  ) {
    return this.db.gameArea.create({ data: body });
  }
  @Post('positions') createPosition(
    @Body()
    body: {
      gameAreaId: string;
      key: string;
      name: string;
      context: 'STANDING' | 'TOP' | 'BOTTOM';
    },
  ) {
    return this.db.position.create({ data: body });
  }
  @Post('skill-groups') createSkillGroup(
    @Body() body: { positionId: string; key: string; name: string },
  ) {
    return this.db.skillGroup.create({ data: body });
  }
  @Post('techniques') createTechnique(
    @Body() body: { skillGroupId: string; key: string; name: string },
  ) {
    return this.db.technique.create({ data: body });
  }
  @Post('movements') createMovement(
    @Body() body: { key: string; name: string; description?: string },
  ) {
    return this.db.movement.create({ data: body });
  }
  @Post('drills') createDrill(
    @Body()
    body: {
      key: string;
      name: string;
      description?: string;
      techniqueId?: string;
      movementId?: string;
    },
  ) {
    return this.db.drill.create({ data: body });
  }
}
