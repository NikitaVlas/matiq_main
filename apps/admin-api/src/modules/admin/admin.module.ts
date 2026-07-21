import { Controller, Get, Module, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StorageService } from '../../shared/infrastructure/storage.service';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { UseGuards } from '@nestjs/common';
import { VideoModule } from '../video/video.module';
import { ContentModule } from '../content/content.module';
import { AssessmentModule } from '../assessment/assessment.module';

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
}

@Module({
  imports: [VideoModule, ContentModule, AssessmentModule],
  controllers: [HealthController, AdminController],
  providers: [StorageService],
})
export class AdminModule {}
