import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRoles } from '../admin-auth/admin-roles.decorator';
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

  @AdminRoles('ADMIN')
  @Get('viewing-analytics')
  async viewingAnalytics() {
    const grouped = await this.db.verifiedWatchInterval.groupBy({
      by: ['trainerId', 'videoId', 'accessClass'],
      _sum: { durationMs: true },
    });
    const videoIds = [...new Set(grouped.map((row) => row.videoId))];
    const videos = await this.db.video.findMany({
      where: { id: { in: videoIds } },
      select: {
        id: true,
        title: true,
        trainer: { select: { trainerProfile: { select: { displayName: true } } } },
        Lesson: {
          select: { module: { select: { course: { select: { id: true, title: true } } } } },
        },
      },
    });
    const videoById = new Map(videos.map((video) => [video.id, video]));
    const trainers = new Map<
      string,
      {
        trainerId: string | null;
        displayName: string;
        paidMs: number;
        trialMs: number;
        videos: {
          videoId: string;
          title: string;
          course: { id: string; title: string } | null;
          paidMs: number;
          trialMs: number;
        }[];
      }
    >();
    for (const row of grouped) {
      const video = videoById.get(row.videoId);
      if (!video) continue;
      const key = row.trainerId ?? 'unassigned';
      const trainer = trainers.get(key) ?? {
        trainerId: row.trainerId,
        displayName: video.trainer?.trainerProfile?.displayName ?? 'Ohne Autor',
        paidMs: 0,
        trialMs: 0,
        videos: [],
      };
      let videoRow = trainer.videos.find((item) => item.videoId === row.videoId);
      if (!videoRow) {
        videoRow = {
          videoId: row.videoId,
          title: video.title,
          course: video.Lesson?.module.course ?? null,
          paidMs: 0,
          trialMs: 0,
        };
        trainer.videos.push(videoRow);
      }
      const durationMs = row._sum.durationMs ?? 0;
      if (row.accessClass === 'TRIAL') {
        trainer.trialMs += durationMs;
        videoRow.trialMs += durationMs;
      } else {
        trainer.paidMs += durationMs;
        videoRow.paidMs += durationMs;
      }
      trainers.set(key, trainer);
    }
    const rows = [...trainers.values()].sort((left, right) => right.paidMs - left.paidMs);
    return {
      totals: rows.reduce(
        (total, row) => ({
          paidMs: total.paidMs + row.paidMs,
          trialMs: total.trialMs + row.trialMs,
        }),
        { paidMs: 0, trialMs: 0 },
      ),
      trainers: rows,
    };
  }
}
