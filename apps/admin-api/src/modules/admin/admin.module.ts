import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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

@Module({
  imports: [VideoModule, ContentModule, AssessmentModule],
  controllers: [HealthController],
})
export class AdminModule {}
