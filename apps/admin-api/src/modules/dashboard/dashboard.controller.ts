import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('admin-dashboard')
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class DashboardController {
  constructor(private readonly db: AdminDatabaseService) {}

  @Get('stats')
  async stats() {
    const [users, trainers, videos, questions] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { role: 'TRAINER' } }),
      this.db.video.count(),
      this.db.assessmentQuestion.count({ where: { active: true } }),
    ]);
    return { users, trainers, videos, activeAssessmentQuestions: questions };
  }
}
