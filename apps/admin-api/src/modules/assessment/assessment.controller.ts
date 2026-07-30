import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AssessmentContext,
  AssessmentQuestionKind,
  Prisma,
  RoadmapRecommendationType,
} from '@prisma/client';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRoles } from '../admin-auth/admin-roles.decorator';
import { AuditService } from '../audit/audit.service';

type QuestionBody = {
  key?: string;
  text?: string;
  context?: AssessmentContext;
  skillKey?: string;
  kind?: AssessmentQuestionKind;
  multiple?: boolean;
  allowCustom?: boolean;
  active?: boolean;
  options?: unknown;
};

type FoundationStepBody = {
  key?: string;
  title?: string;
  description?: string | null;
  skillKey?: string;
  position?: number;
  active?: boolean;
};

@ApiTags('admin-assessment')
@Controller('admin/assessment')
@UseGuards(AdminAuthGuard)
@AdminRoles('ADMIN', 'EDITOR')
export class AssessmentController {
  constructor(
    @Inject(AdminDatabaseService) private readonly db: AdminDatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}
  @Get('questions') questions() {
    return this.db.assessmentQuestion.findMany({ orderBy: { createdAt: 'asc' } });
  }
  @Get('foundation-templates')
  foundationTemplates() {
    return this.db.foundationTemplate.findMany({
      include: { steps: { orderBy: { position: 'asc' } } },
      orderBy: [{ discipline: 'asc' }, { name: 'asc' }],
    });
  }

  @Patch('foundation-templates/:id')
  @AdminRoles('ADMIN')
  async updateFoundationTemplate(
    @Param('id') id: string,
    @Body() body: { name?: string; active?: boolean },
    @Req() request: { adminUserId: string },
  ) {
    const data = {
      ...(body.name !== undefined ? { name: requiredText(body.name, 120) } : {}),
      ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
    };
    const template = await this.db.foundationTemplate.update({ where: { id }, data });
    await this.audit.record(
      'FOUNDATION_TEMPLATE_UPDATED',
      'FoundationTemplate',
      id,
      request.adminUserId,
      data,
    );
    return template;
  }

  @Post('foundation-templates/:id/steps')
  @AdminRoles('ADMIN')
  async createFoundationStep(
    @Param('id') templateId: string,
    @Body() body: FoundationStepBody,
    @Req() request: { adminUserId: string },
  ) {
    const data = validateFoundationStep(body, true);
    const step = await this.db.foundationStep.create({
      data: {
        templateId,
        key: data.key!,
        title: data.title!,
        description: data.description,
        skillKey: data.skillKey!,
        position: data.position!,
        active: data.active,
      },
    });
    await this.audit.record(
      'FOUNDATION_STEP_CREATED',
      'FoundationStep',
      step.id,
      request.adminUserId,
      data,
    );
    return step;
  }

  @Patch('foundation-steps/:id')
  @AdminRoles('ADMIN')
  async updateFoundationStep(
    @Param('id') id: string,
    @Body() body: FoundationStepBody,
    @Req() request: { adminUserId: string },
  ) {
    const data = validateFoundationStep(body, false);
    const step = await this.db.foundationStep.update({ where: { id }, data });
    await this.audit.record(
      'FOUNDATION_STEP_UPDATED',
      'FoundationStep',
      id,
      request.adminUserId,
      data,
    );
    return step;
  }
  @Post('questions')
  @AdminRoles('ADMIN')
  async createQuestion(@Body() body: QuestionBody, @Req() request: { adminUserId: string }) {
    const data = validateQuestion(body, true);
    await this.assertRoadmapTopics(data);
    const question = await this.db.assessmentQuestion.create({
      data: data as Prisma.AssessmentQuestionCreateInput,
    });
    await this.audit.record(
      'ASSESSMENT_QUESTION_CREATED',
      'AssessmentQuestion',
      question.id,
      request.adminUserId,
      { key: data.key, kind: data.kind },
    );
    return question;
  }
  @Patch('questions/:id')
  @AdminRoles('ADMIN')
  async updateQuestion(
    @Param('id') id: string,
    @Body() body: QuestionBody,
    @Req() request: { adminUserId: string },
  ) {
    const data = validateQuestion(body, false);
    await this.assertRoadmapTopics(data);
    const question = await this.db.assessmentQuestion.update({
      where: { id },
      data: data as Prisma.AssessmentQuestionUpdateInput,
    });
    await this.audit.record(
      'ASSESSMENT_QUESTION_UPDATED',
      'AssessmentQuestion',
      question.id,
      request.adminUserId,
      data,
    );
    return question;
  }

  @Get('unmapped-answers')
  unmappedAnswers() {
    return this.db.assessmentResponse.findMany({
      where: { mappingStatus: 'UNMAPPED' },
      select: {
        id: true,
        customText: true,
        createdAt: true,
        question: { select: { key: true, text: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Patch('unmapped-answers/:id/map')
  @AdminRoles('ADMIN')
  async mapAnswer(
    @Param('id') id: string,
    @Body() body: { skillKey?: string },
    @Req() request: { adminUserId: string },
  ) {
    const skillKey = validKey(body.skillKey);
    if (!skillKey) throw new BadRequestException('INVALID_SKILL_KEY');
    await this.assertRoadmapTopics({ skillKey });
    const source = await this.db.assessmentResponse.findUnique({
      where: { id },
      include: {
        question: true,
        assessment: { include: { user: { include: { athleteProfile: true } } } },
      },
    });
    if (!source || source.mappingStatus !== 'UNMAPPED')
      throw new BadRequestException('UNMAPPED_ANSWER_NOT_FOUND');
    const recommendationType =
      source.question.kind === AssessmentQuestionKind.PREFERENCE
        ? RoadmapRecommendationType.CORE
        : RoadmapRecommendationType.EXPLORE;
    const answer = await this.db.assessmentResponse.update({
      where: { id },
      data: { mappedSkillKey: skillKey, mappingStatus: 'MAPPED' },
    });
    const profile = source.assessment.user.athleteProfile;
    if (profile) {
      for (const discipline of profile.disciplines) {
        const existing = await this.db.roadmapItem.findFirst({
          where: {
            athleteProfileId: profile.id,
            discipline,
            skillKey,
            recommendationType,
            isAddedByUser: false,
          },
        });
        if (!existing) {
          const last = await this.db.roadmapItem.findFirst({
            where: { athleteProfileId: profile.id, discipline },
            orderBy: { position: 'desc' },
          });
          await this.db.roadmapItem.create({
            data: {
              athleteProfileId: profile.id,
              discipline,
              type: 'SKILL_GROUP',
              title: source.customText ?? skillKey,
              skillKey,
              recommendationType,
              position: (last?.position ?? -1) + 1,
            },
          });
        }
      }
    }
    await this.audit.record(
      'ASSESSMENT_ANSWER_MAPPED',
      'AssessmentResponse',
      answer.id,
      request.adminUserId,
      { skillKey },
    );
    return answer;
  }

  private async assertRoadmapTopics(data: QuestionBody) {
    const keys = new Set<string>();
    if (data.skillKey) keys.add(data.skillKey);
    if (Array.isArray(data.options)) {
      for (const raw of data.options) {
        const option = raw as Record<string, unknown>;
        if (typeof option.skillKey === 'string') keys.add(option.skillKey);
      }
    }
    if (!keys.size) return;
    const existing = await this.db.metadataOption.findMany({
      where: { field: { key: 'roadmap-topic' }, key: { in: [...keys] } },
      select: { key: true },
    });
    if (existing.length !== keys.size) throw new BadRequestException('UNKNOWN_ROADMAP_TOPIC');
  }
}

function validateQuestion(body: QuestionBody, creating: boolean) {
  const allowedContexts = Object.values(AssessmentContext);
  const allowedKinds = Object.values(AssessmentQuestionKind);
  const data: QuestionBody = {};
  if ('key' in body) data.key = validKey(body.key);
  if ('text' in body) data.text = validText(body.text, 240);
  if ('skillKey' in body) data.skillKey = validKey(body.skillKey);
  if ('context' in body && body.context && allowedContexts.includes(body.context))
    data.context = body.context;
  if ('kind' in body && body.kind && allowedKinds.includes(body.kind)) data.kind = body.kind;
  for (const key of ['multiple', 'allowCustom', 'active'] as const)
    if (key in body && typeof body[key] === 'boolean') data[key] = body[key];
  if ('options' in body) data.options = validateOptions(body.options, data.kind);
  if (data.kind && data.kind !== AssessmentQuestionKind.CONFIDENCE && Array.isArray(data.options)) {
    const firstMappedOption = data.options.find(
      (option) => typeof option === 'object' && option && 'skillKey' in option,
    ) as { skillKey?: string } | undefined;
    data.skillKey = firstMappedOption?.skillKey;
  }
  if (
    creating &&
    (!data.key || !data.text || !data.skillKey || !data.context || !data.kind || !data.options)
  )
    throw new BadRequestException('ASSESSMENT_QUESTION_INCOMPLETE');
  return data;
}

function validateOptions(input: unknown, kind?: AssessmentQuestionKind): Prisma.InputJsonValue {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30)
    throw new BadRequestException('INVALID_ASSESSMENT_OPTIONS');
  const keys = new Set<string>();
  return input.map((raw, index) => {
    const option = raw as Record<string, unknown>;
    const key = validKey(option.key);
    const label = validText(option.label, 160);
    const value = option.value;
    if (!key) throw new BadRequestException(`ASSESSMENT_OPTION_${index + 1}_KEY_INVALID`);
    if (!label) throw new BadRequestException(`ASSESSMENT_OPTION_${index + 1}_LABEL_INVALID`);
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 5)
      throw new BadRequestException(`ASSESSMENT_OPTION_${index + 1}_SCORE_INVALID`);
    if (keys.has(key))
      throw new BadRequestException(`ASSESSMENT_OPTION_${index + 1}_KEY_DUPLICATED`);
    keys.add(key);
    const skillKey = option.skillKey === undefined ? undefined : validKey(option.skillKey);
    const recommendationType = option.recommendationType;
    if (kind && kind !== AssessmentQuestionKind.CONFIDENCE && (!skillKey || !recommendationType))
      throw new BadRequestException('ASSESSMENT_OPTION_MAPPING_REQUIRED');
    if (
      recommendationType !== undefined &&
      !Object.values(RoadmapRecommendationType).includes(
        recommendationType as RoadmapRecommendationType,
      )
    )
      throw new BadRequestException('INVALID_RECOMMENDATION_TYPE');
    return {
      key,
      label,
      value,
      ...(skillKey ? { skillKey } : {}),
      ...(recommendationType ? { recommendationType: String(recommendationType) } : {}),
    };
  });
}

function validKey(input: unknown) {
  return typeof input === 'string' && /^[a-z0-9-]{1,100}$/.test(input) ? input : undefined;
}

function validText(input: unknown, max: number) {
  const value = typeof input === 'string' ? input.trim() : '';
  return value && value.length <= max ? value : undefined;
}

function requiredText(input: unknown, max: number) {
  const value = validText(input, max);
  if (!value) throw new BadRequestException('INVALID_FOUNDATION_TEXT');
  return value;
}

function validateFoundationStep(body: FoundationStepBody, creating: boolean) {
  const data: FoundationStepBody = {};
  if ('key' in body) data.key = validKey(body.key);
  if ('title' in body) data.title = requiredText(body.title, 160);
  if ('description' in body)
    data.description = body.description ? requiredText(body.description, 500) : null;
  if ('skillKey' in body) data.skillKey = validKey(body.skillKey);
  if ('position' in body) {
    if (!Number.isInteger(body.position) || body.position! < 0 || body.position! > 200)
      throw new BadRequestException('INVALID_FOUNDATION_POSITION');
    data.position = body.position;
  }
  if (typeof body.active === 'boolean') data.active = body.active;
  if (creating && (!data.key || !data.title || !data.skillKey || data.position === undefined))
    throw new BadRequestException('FOUNDATION_STEP_INCOMPLETE');
  if ('key' in body && !data.key) throw new BadRequestException('INVALID_FOUNDATION_KEY');
  if ('skillKey' in body && !data.skillKey)
    throw new BadRequestException('INVALID_FOUNDATION_TOPIC');
  return data;
}
