import {
  Controller,
  Get,
  Header,
  Inject,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { VideoModule } from '../video/video.module';
import { ContentModule } from '../content/content.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { adminApiMetrics } from '../../shared/infrastructure/metrics';

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

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics() {
    return adminApiMetrics.render();
  }
}

@Module({
  imports: [VideoModule, ContentModule, AssessmentModule],
  controllers: [HealthController],
})
export class AdminModule {}
