import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRoles } from '../admin-auth/admin-roles.decorator';
import { validateCourseStructure } from './course-validation';
import { RoadmapMetadataService } from './roadmap-metadata.service';

@ApiTags('admin-content')
@Controller('admin/content')
@UseGuards(AdminAuthGuard)
@AdminRoles('ADMIN', 'EDITOR')
export class ContentController {
  constructor(
    private readonly db: AdminDatabaseService,
    private readonly roadmapMetadata: RoadmapMetadataService,
  ) {}
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
      include: {
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              include: {
                video: true,
                outgoingRelations: {
                  include: { trigger: true, toLesson: { select: { id: true, title: true } } },
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  @Get('courses/:courseId/validation') async validateCourse(@Param('courseId') courseId: string) {
    const course = await this.db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: { lessons: { include: { outgoingRelations: true } } },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return validateCourseStructure(course.modules);
  }
  @Post('courses/:courseId/publish') async publishCourse(@Param('courseId') courseId: string) {
    const validation = await this.validateCourse(courseId);
    if (!validation.valid) {
      throw new BadRequestException({ code: 'COURSE_INVALID', issues: validation.issues });
    }
    const course = await this.db.course.update({
      where: { id: courseId },
      data: { published: true },
      include: { modules: { include: { lessons: { select: { id: true, videoId: true } } } } },
    });
    const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const videoIds = course.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.videoId),
    );
    await this.db.lesson.updateMany({
      where: { id: { in: lessonIds } },
      data: { published: true },
    });
    await this.db.video.updateMany({ where: { id: { in: videoIds } }, data: { published: true } });
    return course;
  }
  @Post('courses') createCourse(
    @Body()
    body: {
      key: string;
      title: string;
      description?: string;
      discipline: 'BJJ_GI' | 'NO_GI_GRAPPLING';
    },
  ) {
    return this.db.course.create({ data: body });
  }
  @Patch('courses/:courseId') updateCourse(
    @Param('courseId') courseId: string,
    @Body() body: { title: string },
  ) {
    return this.db.course.update({ where: { id: courseId }, data: { title: body.title } });
  }
  @Delete('courses/:courseId') deleteCourse(@Param('courseId') courseId: string) {
    return this.db.course.delete({ where: { id: courseId } });
  }
  @Post('courses/:courseId/modules') createModule(
    @Param('courseId') courseId: string,
    @Body() body: { key: string; title: string; position: number },
  ) {
    return this.db.courseModule.create({ data: { ...body, courseId } });
  }
  @Patch('modules/:moduleId') updateModule(
    @Param('moduleId') moduleId: string,
    @Body() body: { title: string },
  ) {
    return this.db.courseModule.update({ where: { id: moduleId }, data: { title: body.title } });
  }
  @Delete('modules/:moduleId') deleteModule(@Param('moduleId') moduleId: string) {
    return this.db.courseModule.delete({ where: { id: moduleId } });
  }
  @Post('courses/:courseId/modules/reorder') async reorderModules(
    @Param('courseId') courseId: string,
    @Body() body: { moduleIds: string[] },
  ) {
    const modules = await this.db.courseModule.findMany({
      where: { courseId },
      select: { id: true },
    });
    this.assertExactIds(
      modules.map((module) => module.id),
      body.moduleIds,
      'moduleIds',
    );
    await this.db.$transaction(
      body.moduleIds.map((id, position) =>
        this.db.courseModule.update({ where: { id }, data: { position } }),
      ),
    );
    return { ok: true };
  }
  @Post('modules/:moduleId/lessons') createLesson(
    @Param('moduleId') moduleId: string,
    @Body()
    body: {
      videoId: string;
      key: string;
      title: string;
      goal?: string;
      startingPosition?: string;
      endingPosition?: string;
      level?: string;
      giNoGi?: string;
      reactions?: string[];
      position: number;
      published?: boolean;
    },
  ) {
    return this.db.lesson.create({ data: { ...body, moduleId, reactions: body.reactions ?? [] } });
  }
  @Patch('lessons/:lessonId') updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() body: { title: string },
  ) {
    return this.db.lesson.update({ where: { id: lessonId }, data: { title: body.title } });
  }
  @Post('lessons/:lessonId/publish') publishLesson(@Param('lessonId') lessonId: string) {
    return this.db.lesson.update({ where: { id: lessonId }, data: { published: true } });
  }
  @Delete('lessons/:lessonId') deleteLesson(@Param('lessonId') lessonId: string) {
    return this.db.lesson.delete({ where: { id: lessonId } });
  }
  @Post('modules/:moduleId/lessons/reorder') async reorderLessons(
    @Param('moduleId') moduleId: string,
    @Body() body: { lessonIds: string[] },
  ) {
    const lessons = await this.db.lesson.findMany({
      where: { moduleId },
      select: { id: true },
    });
    this.assertExactIds(
      lessons.map((lesson) => lesson.id),
      body.lessonIds,
      'lessonIds',
    );
    await this.db.$transaction(
      body.lessonIds.map((id, position) =>
        this.db.lesson.update({ where: { id }, data: { position } }),
      ),
    );
    return { ok: true };
  }
  @Post('lessons/:lessonId/relations') createLessonRelation(
    @Param('lessonId') fromLessonId: string,
    @Body()
    body: {
      toLessonId: string;
      type: 'PRIMARY' | 'BRANCH';
      triggerId?: string;
      condition?: string;
      position?: number;
    },
  ) {
    return this.db.lessonRelation.create({
      data: { ...body, fromLessonId, position: body.position ?? 0 },
    });
  }
  @Patch('lesson-relations/:relationId') updateLessonRelation(
    @Param('relationId') relationId: string,
    @Body()
    body: {
      toLessonId: string;
      type: 'PRIMARY' | 'BRANCH';
      triggerId?: string;
    },
  ) {
    return this.db.lessonRelation.update({
      where: { id: relationId },
      data: {
        toLessonId: body.toLessonId,
        type: body.type,
        triggerId: body.type === 'BRANCH' ? body.triggerId : null,
      },
    });
  }
  @Delete('lesson-relations/:relationId') deleteLessonRelation(
    @Param('relationId') relationId: string,
  ) {
    return this.db.lessonRelation.delete({ where: { id: relationId } });
  }
  @Get('branch-triggers') branchTriggers() {
    return this.db.branchTrigger.findMany({ orderBy: { name: 'asc' } });
  }
  @Post('branch-triggers') createBranchTrigger(@Body() body: { key: string; name: string }) {
    return this.db.branchTrigger.create({ data: body });
  }
  @Get('metadata-fields') metadataFields() {
    return this.roadmapMetadata.fields();
  }
  @Get('roadmap-topic-coverage') roadmapTopicCoverage() {
    return this.roadmapMetadata.coverage();
  }
  @Post('roadmap-topics') createRoadmapTopic(@Body() body: { key?: string; name?: string }) {
    return this.roadmapMetadata.createTopic(body);
  }
  @Post('metadata-fields') createMetadataField(@Body() body: { key: string; name: string }) {
    return this.db.metadataField.create({ data: body, include: { options: true } });
  }
  @Post('metadata-fields/:fieldId/options') createMetadataOption(
    @Param('fieldId') fieldId: string,
    @Body() body: { key: string; name: string },
  ) {
    return this.db.metadataOption.create({ data: { ...body, fieldId } });
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

  private assertExactIds(existingIds: string[], requestedIds: string[], field: string) {
    if (
      existingIds.length !== requestedIds.length ||
      new Set(requestedIds).size !== requestedIds.length ||
      existingIds.some((id) => !requestedIds.includes(id))
    ) {
      throw new BadRequestException(`${field} must contain every item exactly once`);
    }
  }
}
