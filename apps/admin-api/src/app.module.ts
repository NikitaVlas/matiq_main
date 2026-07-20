import {
  Controller,
  Get,
  Module,
  Post,
  Body,
  Headers,
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
    return this.db.video.create({
      data: {
        title: body.title,
        storageKey: body.storageKey,
        description: body.description,
        published: body.published ?? false,
      },
    });
  }
}

@Module({ controllers: [HealthController, AdminController] })
export class AppModule {}
