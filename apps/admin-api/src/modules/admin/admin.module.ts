import { Controller, Get, Inject, Module, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { VideoModule } from '../video/video.module';
import { ContentModule } from '../content/content.module';
import { AssessmentModule } from '../assessment/assessment.module';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(@Inject(AdminDatabaseService) readonly database: AdminDatabaseService) {}

  @Get('health')
  get() {
    return { status: 'ok', service: 'admin-api' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.database.ping();
      return { status: 'ok', service: 'admin-api' };
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable', service: 'admin-api' });
    }
  }
}

@Module({
  imports: [VideoModule, ContentModule, AssessmentModule],
  controllers: [HealthController],
})
export class AdminModule {}
